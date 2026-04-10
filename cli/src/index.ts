#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import ora from 'ora';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';
import nacl from 'tweetnacl';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Table from 'cli-table3';

const program = new Command();

const GITHUB_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/;
const URL_RE = /^https?:\/\/.+\..+/;
const API_URL = process.env.JUDGECHAIN_API_URL ?? 'http://localhost:8000/api/v1';
const DEFAULT_KEYPAIR = path.join(os.homedir(), '.config', 'solana', 'id.json');

type Network = 'devnet' | 'mainnet' | 'localnet';

const NETWORKS: Record<Network, string> = {
  devnet: clusterApiUrl('devnet'),
  mainnet: clusterApiUrl('mainnet-beta'),
  localnet: 'http://127.0.0.1:8899',
};

interface SubmitOptions {
  problem: string;
  repo: string;
  deployment: string;
  keypair?: string;
  network: Network;
  coverage?: string;
  lint?: string;
}

interface StatusOptions {
  tx: string;
  network: Network;
}

interface SystemScore {
  code_quality: number;
  test_coverage: number;
  deployment_health: number;
  documentation: number;
  custom_criteria: number;
  total: number;
}

interface ScoreResponse {
  submission_id: string;
  problem_id: string;
  wallet: string;
  system_score: SystemScore;
}

function displayScore(data: ScoreResponse): void {
  const table = new Table({
    head: [chalk.cyan('Criteria'), chalk.cyan('Score')],
    colWidths: [20, 10]
  });

  table.push(
    ['Code Quality', data.system_score.code_quality],
    ['Test Coverage', data.system_score.test_coverage],
    ['Deployment', data.system_score.deployment_health],
    ['Documentation', data.system_score.documentation],
    ['Custom', data.system_score.custom_criteria],
    [chalk.bold('Total'), chalk.bold.green(data.system_score.total)]
  );

  console.log('\n' + chalk.bold('📊 Submission Results'));
  console.log(chalk.gray(`Submission ID: ${data.submission_id}`));
  console.log(table.toString() + '\n');
}

function validate(options: SubmitOptions): void {
  if (!options.problem.trim()) {
    console.error('Error: --problem cannot be empty');
    process.exit(1);
  }
  if (!GITHUB_URL_RE.test(options.repo)) {
    console.error('Error: --repo must be a valid GitHub URL (e.g. https://github.com/user/repo)');
    process.exit(1);
  }
  if (!URL_RE.test(options.deployment)) {
    console.error('Error: --deployment must be a valid URL (e.g. https://myapp.vercel.app)');
    process.exit(1);
  }

  if (options.coverage) {
    const c = parseFloat(options.coverage);
    if (isNaN(c) || c < 0 || c > 100) {
      console.error('Error: --coverage must be a number between 0 and 100');
      process.exit(1);
    }
  }

  if (options.lint) {
    const l = parseFloat(options.lint);
    if (isNaN(l) || l < 0 || l > 18) {
      console.error('Error: --lint must be a number between 0 and 18');
      process.exit(1);
    }
  }
}

function loadKeypair(keypairPath?: string): Keypair {
  const resolved = keypairPath ?? DEFAULT_KEYPAIR;
  if (!fs.existsSync(resolved)) {
    console.error(`Error: Keypair not found at ${resolved}. Run \`solana-keygen new\` or pass --keypair <path>`);
    process.exit(1);
  }
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(resolved, 'utf8')) as number[]);
  return Keypair.fromSecretKey(secret);
}

function getConnection(network: string): Connection {
  const rpc = NETWORKS[network as Network];
  if (!rpc) {
    console.error(`Error: Unknown network "${network}". Use devnet, mainnet, or localnet.`);
    process.exit(1);
  }
  return new Connection(rpc, 'confirmed');
}

program
  .name('judgechain')
  .description('CLI to submit Hackathon projects to JudgeChain on Solana')
  .version('1.0.0');

program.command('submit')
  .description('Submit a project to JudgeChain')
  .requiredOption('-p, --problem <id>', 'Problem statement ID')
  .requiredOption('-r, --repo <url>', 'GitHub repository URL')
  .requiredOption('-d, --deployment <url>', 'Live deployment URL')
  .option('-c, --coverage <percent>', 'Manually reported test coverage (0-100)', '0')
  .option('-l, --lint <score>', 'Manually reported linting score (0-18)', '0')
  .option('-k, --keypair <path>', 'Path to Solana keypair JSON')
  .option('-n, --network <name>', 'Solana network: devnet | mainnet | localnet', 'devnet')
  .action(async (options: SubmitOptions) => {
    validate(options);
    const connection = getConnection(options.network);

    const keypair = loadKeypair(options.keypair);
    const wallet = keypair.publicKey.toBase58();
    console.log(chalk.blue(`\n🚀 Submitting Project`));
    console.log(`  ${chalk.gray('Wallet:')}  ${chalk.white(wallet)}`);
    console.log(`  ${chalk.gray('Network:')} ${chalk.white(options.network)}`);

    const payload = {
      problem_id: options.problem,
      repo_url: options.repo,
      deployment_url: options.deployment,
      participant_wallet: wallet,
      reported_test_coverage_percent: parseFloat(options.coverage || '0'),
      reported_linting_score: parseFloat(options.lint || '0'),
    };

    const payloadStr = JSON.stringify(payload);
    const signature = Buffer.from(
      nacl.sign.detached(Buffer.from(payloadStr), keypair.secretKey)
    ).toString('base64');

    const spinner = ora('Analyzing and submitting to JudgeChain...').start();

    try {
      const { data } = await axios.post<ScoreResponse>(`${API_URL}/score`, payloadStr, {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
          'x-network': options.network
        },
      });

      spinner.succeed(chalk.green('Submission successful!'));
      displayScore(data);
    } catch (err) {
      spinner.fail(chalk.red('Submission failed.'));
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail || err.message || err.code || 'Could not connect to backend')
        : 'Could not connect to backend';
      console.error(`${chalk.red('Error:')} ${msg}`);
      process.exit(1);
    }
  });

program.command('status')
  .description('Check on-chain transaction status')
  .requiredOption('-t, --tx <hash>', 'Transaction signature hash')
  .option('-n, --network <name>', 'Solana network: devnet | mainnet | localnet', 'devnet')
  .action(async (options: StatusOptions) => {
    const connection = getConnection(options.network);
    const spinner = ora(`Fetching tx on ${options.network}...`).start();

    try {
      const tx = await connection.getTransaction(options.tx, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        spinner.warn('Transaction not found or not yet confirmed.');
        process.exit(1);
      }

      spinner.succeed('Transaction found.');
      console.log(`  Status: ${tx!.meta?.err ? 'Failed' : 'Success'}`);
      console.log(`  Slot:   ${tx!.slot}`);
      console.log(`  Fee:    ${tx!.meta?.fee} lamports`);
    } catch (err) {
      spinner.fail('Failed to fetch transaction.');
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.command('leaderboard')
  .description('View the current leaderboard for a problem')
  .option('-p, --problem <id>', 'Problem statement ID')
  .action(async (options: any) => {
    let problemId = options.problem;

    if (!problemId) {
      try {
        const { data: problems } = await axios.get(`${API_URL}/problems`);
        const choices = Object.entries(problems).map(([id, info]: [string, any]) => ({
          name: `${chalk.white(id)}: ${chalk.gray(info.title)}`,
          value: id
        }));

        if (choices.length === 0) {
          console.log(chalk.yellow('No problems available.'));
          return;
        }

        const answers = await inquirer.prompt([{
          type: 'list',
          name: 'problem',
          message: 'Select a problem to view leaderboard:',
          choices
        }]);
        problemId = answers.problem;
      } catch (err) {
        console.error(chalk.red('Error: Could not fetch problems from backend. Please provide --problem <id>.'));
        return;
      }
    }

    const spinner = ora(`Fetching leaderboard for ${problemId}...`).start();

    try {
      const { data } = await axios.get(`${API_URL}/leaderboard?problem_id=${problemId}`);
      spinner.stop();

      if (!data || data.length === 0) {
        console.log(chalk.yellow('\nNo submissions found for this problem yet. Be the first! 🚀'));
        return;
      }

      console.log(chalk.bold.cyan(`\n🏆 Leaderboard: ${problemId}`));
      const table = new Table({
        head: [chalk.cyan('Rank'), chalk.cyan('Wallet'), chalk.cyan('Total Score')],
        colWidths: [8, 48, 15]
      });

      data.slice(0, 10).forEach((entry: any, index: number) => {
        const wallet = entry.wallet;
        const score = entry.system_score.total;
        const rank = index + 1;
        table.push([
          rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : rank,
          chalk.gray(wallet),
          chalk.bold.green(score)
        ]);
      });

      console.log(table.toString() + '\n');
    } catch (err) {
      spinner.fail(chalk.red('Failed to fetch leaderboard.'));
      console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
    }
  });

program.command('init')
  .description('Interactive guide to submit your project')
  .option('-k, --keypair <path>', 'Path to Solana keypair JSON')
  .option('-n, --network <name>', 'Solana network: devnet | mainnet | localnet', 'devnet')
  .action(async (options: any) => {
    console.log(chalk.cyan.bold('\nWelcome to JudgeChain! 🏆'));
    console.log(chalk.gray('Let\'s set up your submission.\n'));

    let problemChoices: any[] = [];
    try {
      const { data: problems } = await axios.get(`${API_URL}/problems`);
      problemChoices = Object.entries(problems).map(([id, info]: [string, any]) => ({
        name: `${chalk.white(id)}: ${chalk.gray(info.title)}`,
        value: id
      }));
    } catch (err) {
      console.log(chalk.yellow('⚠️  Could not fetch problem list from backend. Entering manual ID.\n'));
    }

    const answers = await inquirer.prompt([
      {
        type: problemChoices.length > 0 ? 'list' : 'input',
        name: 'problem',
        message: 'Select or enter the Problem Statement ID:',
        choices: problemChoices,
        validate: (input: string) => input.trim() ? true : 'Problem ID is required'
      },
      {
        type: 'input',
        name: 'repo',
        message: 'Enter your GitHub Repository URL:',
        validate: (input: string) => GITHUB_URL_RE.test(input) ? true : 'Must be a valid GitHub URL'
      },
      {
        type: 'input',
        name: 'deployment',
        message: 'Enter your Live Deployment URL:',
        validate: (input: string) => URL_RE.test(input) ? true : 'Must be a valid URL'
      },
      {
        type: 'input',
        name: 'coverage',
        message: 'Reported Test Coverage (0-100):',
        default: '0',
        validate: (input: string) => !isNaN(parseFloat(input)) && parseFloat(input) >= 0 && parseFloat(input) <= 100 ? true : 'Must be a number between 0 and 100'
      },
      {
        type: 'input',
        name: 'lint',
        message: 'Reported Linting Score (0-18):',
        default: '0',
        validate: (input: string) => !isNaN(parseFloat(input)) && parseFloat(input) >= 0 && parseFloat(input) <= 18 ? true : 'Must be a number between 0 and 18'
      }
    ]);

    // Use existing submit logic by calling it with answers
    const submitOptions: SubmitOptions = {
      problem: answers.problem,
      repo: answers.repo,
      deployment: answers.deployment,
      coverage: answers.coverage,
      lint: answers.lint,
      keypair: options.keypair,
      network: options.network as Network
    };

    // Trigger the submit logic manually or just duplicate minimal part
    // To keep it clean, let's just trigger the same logic flow
    const connection = getConnection(submitOptions.network);
    const keypair = loadKeypair(submitOptions.keypair);
    const wallet = keypair.publicKey.toBase58();

    console.log(chalk.blue(`\n🚀 Submitting Project`));
    console.log(`  ${chalk.gray('Wallet:')}  ${chalk.white(wallet)}`);
    console.log(`  ${chalk.gray('Network:')} ${chalk.white(submitOptions.network)}`);

    const payload = {
      problem_id: submitOptions.problem,
      repo_url: submitOptions.repo,
      deployment_url: submitOptions.deployment,
      participant_wallet: wallet,
      reported_test_coverage_percent: parseFloat(submitOptions.coverage || '0'),
      reported_linting_score: parseFloat(submitOptions.lint || '0'),
    };

    const payloadStr = JSON.stringify(payload);
    const signature = Buffer.from(
      nacl.sign.detached(Buffer.from(payloadStr), keypair.secretKey)
    ).toString('base64');

    const spinner = ora('Analyzing and submitting to JudgeChain...').start();

    try {
      const { data } = await axios.post<ScoreResponse>(`${API_URL}/score`, payloadStr, {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
          'x-network': submitOptions.network
        },
      });

      spinner.succeed(chalk.green('Submission successful!'));
      displayScore(data);
    } catch (err) {
      spinner.fail(chalk.red('Submission failed.'));
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail || err.message || err.code || 'Could not connect to backend')
        : 'Could not connect to backend';
      console.error(`${chalk.red('Error:')} ${msg}`);
      process.exit(1);
    }
  });

program.parse();
