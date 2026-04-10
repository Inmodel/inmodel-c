#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';
import nacl from 'tweetnacl';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as p from '@clack/prompts';

const program = new Command();

const GITHUB_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/;
const URL_RE = /^https?:\/\/.+\..+/;
const API_URL = process.env.JUDGECHAIN_API_URL ?? 'http://localhost:8000/api/v1';
const DEFAULT_KEYPAIR = path.join(os.homedir(), '.config', 'solana', 'id.json');
const CONFIG_FILE = '.judgenod.json';

type Network = 'devnet' | 'mainnet' | 'localnet';

const NETWORKS: Record<Network, string> = {
  devnet: clusterApiUrl('devnet'),
  mainnet: clusterApiUrl('mainnet-beta'),
  localnet: 'http://127.0.0.1:8899',
};

interface JudgeNodConfig {
  problem?: string;
  repo?: string;
  deployment?: string;
}

function loadConfig(): JudgeNodConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveConfig(config: JudgeNodConfig) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getGitOriginUrl(): string {
  try {
    const url = execSync('git config --get remote.origin.url', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (url.startsWith('git@github.com:')) {
      return url.replace('git@github.com:', 'https://github.com/').replace(/\.git$/, '');
    }
    if (url.endsWith('.git')) {
      return url.replace(/\.git$/, '');
    }
    return url;
  } catch (e) {
    return '';
  }
}

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
    chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
           , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
           , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
           , 'right': '' , 'right-mid': '' , 'middle': ' ' },
    style: { 'padding-left': 0, 'padding-right': 0 },
    head: [chalk.dim('Criteria'), chalk.dim('Score')],
    colWidths: [22, 10]
  });

  table.push(
    ['Code Quality', data.system_score.code_quality],
    ['Test Coverage', data.system_score.test_coverage],
    ['Deployment', data.system_score.deployment_health],
    ['Documentation', data.system_score.documentation],
    ['Custom', data.system_score.custom_criteria],
    [chalk.bold('Total Score'), chalk.bold.green(data.system_score.total)]
  );

  p.note(table.toString(), `Submission ID: ${chalk.cyan(data.submission_id)}`);
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
  .name('judgenod')
  .description('CLI to submit Hackathon projects to JudgeNod on Solana')
  .version('1.0.0');

program.command('submit')
  .description('Submit a project to JudgeNod')
  .option('-p, --problem <id>', 'Problem statement ID')
  .option('-r, --repo <url>', 'GitHub repository URL')
  .option('-d, --deployment <url>', 'Live deployment URL')
  .option('-c, --coverage <percent>', 'Manually reported test coverage (0-100)', '0')
  .option('-l, --lint <score>', 'Manually reported linting score (0-18)', '0')
  .option('-k, --keypair <path>', 'Path to Solana keypair JSON')
  .option('-n, --network <name>', 'Solana network: devnet | mainnet | localnet', 'devnet')
  .action(async (options: any) => {
    p.intro(`${chalk.bgCyan.black(' JudgeNod ')} ${chalk.dim('Submission Tool')}`);
    
    const config = loadConfig();
    const finalOptions: SubmitOptions = {
      problem: options.problem || config.problem || '',
      repo: options.repo || config.repo || '',
      deployment: options.deployment || config.deployment || '',
      coverage: options.coverage,
      lint: options.lint,
      keypair: options.keypair,
      network: options.network,
    };

    validate(finalOptions);

    const connection = getConnection(finalOptions.network);
    const keypair = loadKeypair(finalOptions.keypair);
    const wallet = keypair.publicKey.toBase58();

    p.log.info(`${chalk.cyan('Wallet')}  ${chalk.dim(wallet)}`);
    p.log.info(`${chalk.cyan('Network')} ${chalk.dim(finalOptions.network)}`);

    const payload = {
      problem_id: finalOptions.problem,
      repo_url: finalOptions.repo,
      deployment_url: finalOptions.deployment,
      participant_wallet: wallet,
      reported_test_coverage_percent: parseFloat(finalOptions.coverage || '0'),
      reported_linting_score: parseFloat(finalOptions.lint || '0'),
    };

    const payloadStr = JSON.stringify(payload);
    const signature = Buffer.from(
      nacl.sign.detached(Buffer.from(payloadStr), keypair.secretKey)
    ).toString('base64');

    const s = p.spinner();
    s.start('Analyzing repository and submitting to JudgeNod');

    try {
      const { data } = await axios.post<ScoreResponse>(`${API_URL}/score`, payloadStr, {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
          'x-network': options.network
        },
      });

      s.stop('Submission verified');
      displayScore(data);
      p.outro(`${chalk.green('✔')} Successfully submitted to JudgeNod!`);
    } catch (err) {
      s.stop('Submission failed');
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail || err.message || err.code || 'Could not connect to backend')
        : 'Could not connect to backend';
      p.log.error(`${chalk.red('Error:')} ${msg}`);
      process.exit(1);
    }
  });

program.command('status')
  .description('Check on-chain transaction status')
  .requiredOption('-t, --tx <hash>', 'Transaction signature hash')
  .option('-n, --network <name>', 'Solana network: devnet | mainnet | localnet', 'devnet')
  .action(async (options: StatusOptions) => {
    p.intro(`${chalk.bgCyan.black(' JudgeNod ')} ${chalk.dim('Transaction Status')}`);
    const connection = getConnection(options.network);
    const s = p.spinner();
    s.start(`Fetching tx on ${options.network}`);

    try {
      const tx = await connection.getTransaction(options.tx, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        s.stop('Transaction not found');
        p.log.warn('Transaction might not be confirmed yet.');
        process.exit(1);
      }

      s.stop('Transaction found');
      
      const details = [
        `${chalk.cyan('Status')}  ${tx.meta?.err ? chalk.red('Failed') : chalk.green('Success')}`,
        `${chalk.cyan('Slot')}    ${tx.slot}`,
        `${chalk.cyan('Fee')}     ${tx.meta?.fee} lamports`
      ].join('\n');

      p.note(details, 'On-Chain Details');
      p.outro(`View on Solscan: ${chalk.underline.dim(`https://solscan.io/tx/${options.tx}?cluster=${options.network}`)}`);
    } catch (err) {
      s.stop('Failed to fetch transaction');
      p.log.error(`${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.command('leaderboard')
  .description('View the current leaderboard for a problem')
  .option('-p, --problem <id>', 'Problem statement ID')
  .action(async (options: any) => {
    p.intro(`${chalk.bgCyan.black(' JudgeNod ')} ${chalk.dim('Leaderboard')}`);
    let problemId = options.problem;

    if (!problemId) {
      try {
        const { data: problems } = await axios.get(`${API_URL}/problems`);
        const choices = Object.entries(problems).map(([id, info]: [string, any]) => ({
          label: `${id}: ${info.title}`,
          value: id
        }));

        if (choices.length === 0) {
          p.log.warn('No problems available.');
          process.exit(0);
        }

        const selectedProblem = await p.select({
          message: 'Select a problem to view leaderboard:',
          options: choices
        });

        if (p.isCancel(selectedProblem)) {
          p.cancel('Operation cancelled');
          process.exit(0);
        }
        problemId = selectedProblem;
      } catch (err) {
        p.log.error('Could not fetch problems from backend. Please provide --problem <id>.');
        process.exit(1);
      }
    }

    const s = p.spinner();
    s.start(`Fetching leaderboard for ${problemId}`);

    try {
      const { data } = await axios.get(`${API_URL}/leaderboard?problem_id=${problemId}`);
      s.stop(`Leaderboard for ${chalk.cyan(problemId)}`);

      if (!data || data.length === 0) {
        p.note('No submissions found for this problem yet. Be the first! 🚀');
        p.outro('Exiting...');
        return;
      }

      const table = new Table({
        chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
               , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
               , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
               , 'right': '' , 'right-mid': '' , 'middle': ' ' },
        style: { 'padding-left': 0, 'padding-right': 0 },
        head: [chalk.dim('Rank'), chalk.dim('Wallet'), chalk.dim('Total')],
        colWidths: [8, 48, 10]
      });

      data.slice(0, 10).forEach((entry: any, index: number) => {
        const wallet = entry.wallet;
        const score = entry.system_score.total;
        const rank = index + 1;
        table.push([
          rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank,
          chalk.dim(wallet),
          chalk.bold.green(score)
        ]);
      });

      p.note(table.toString());
      p.outro(`Top ${data.length > 10 ? 10 : data.length} projects displayed.`);
    } catch (err) {
      s.stop('Failed to fetch leaderboard');
      p.log.error(`${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.command('init')
  .description('Interactive guide to submit your project')
  .option('-k, --keypair <path>', 'Path to Solana keypair JSON')
  .option('-n, --network <name>', 'Solana network: devnet | mainnet | localnet', 'devnet')
  .action(async (options: any) => {
    p.intro(`${chalk.bgCyan.black(' JudgeNod ')} ${chalk.dim('Interactive Submission')}`);

    const existingConfig = loadConfig();
    const gitOrigin = getGitOriginUrl();

    let problemChoices: any[] = [];
    try {
      const { data: problems } = await axios.get(`${API_URL}/problems`);
      problemChoices = Object.entries(problems).map(([id, info]: [string, any]) => ({
        label: `${id}: ${info.title}`,
        value: id
      }));
    } catch (err) {
      p.log.warn('Could not fetch problem list from backend. Entering manual ID.');
    }

    const group = await p.group(
      {
        problem: () =>
          problemChoices.length > 0
            ? p.select({
                message: 'Select the Problem Statement:',
                options: problemChoices,
                initialValue: existingConfig.problem,
              })
            : p.text({
                message: 'Enter Problem ID:',
                initialValue: existingConfig.problem,
                validate: (v) => (!v || !v.trim() ? 'Problem ID is required' : undefined),
              }),
        repo: () =>
          p.text({
            message: 'GitHub Repository URL:',
            placeholder: 'https://github.com/user/repo',
            initialValue: existingConfig.repo || gitOrigin,
            validate: (v) => (!v || !GITHUB_URL_RE.test(v) ? 'Invalid GitHub URL' : undefined),
          }),
        deployment: () =>
          p.text({
            message: 'Live Deployment URL:',
            placeholder: 'https://myapp.vercel.app',
            initialValue: existingConfig.deployment,
            validate: (v) => (!v || !URL_RE.test(v) ? 'Invalid URL' : undefined),
          }),
        coverage: () =>
          p.text({
            message: 'Test Coverage % (0-100):',
            initialValue: '0',
            validate: (v) => {
              if (!v) return 'Required';
              const n = parseFloat(v);
              return isNaN(n) || n < 0 || n > 100 ? 'Must be 0-100' : undefined;
            },
          }),
        lint: () =>
          p.text({
            message: 'Linting Score (0-18):',
            initialValue: '0',
            validate: (v) => {
              if (!v) return 'Required';
              const n = parseFloat(v);
              return isNaN(n) || n < 0 || n > 18 ? 'Must be 0-18' : undefined;
            },
          }),
      },
      {
        onCancel: () => {
          p.cancel('Operation cancelled.');
          process.exit(0);
        },
      }
    );

    saveConfig({
      problem: group.problem as string,
      repo: group.repo,
      deployment: group.deployment,
    });
    p.log.success(`Saved configuration to ${chalk.cyan(CONFIG_FILE)}`);

    const connection = getConnection(options.network);
    const keypair = loadKeypair(options.keypair);
    const wallet = keypair.publicKey.toBase58();

    p.log.info(`${chalk.cyan('Wallet')}  ${chalk.dim(wallet)}`);
    p.log.info(`${chalk.cyan('Network')} ${chalk.dim(options.network)}`);

    const payload = {
      problem_id: group.problem,
      repo_url: group.repo,
      deployment_url: group.deployment,
      participant_wallet: wallet,
      reported_test_coverage_percent: parseFloat(group.coverage),
      reported_linting_score: parseFloat(group.lint),
    };

    const payloadStr = JSON.stringify(payload);
    const signature = Buffer.from(
      nacl.sign.detached(Buffer.from(payloadStr), keypair.secretKey)
    ).toString('base64');

    const s = p.spinner();
    s.start('Analyzing repository and submitting to JudgeNod');

    try {
      const { data } = await axios.post<ScoreResponse>(`${API_URL}/score`, payloadStr, {
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature,
          'x-network': options.network
        },
      });

      s.stop('Submission verified');
      displayScore(data);
      p.outro(`${chalk.green('✔')} Successfully submitted to JudgeNod!`);
    } catch (err) {
      s.stop('Submission failed');
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail || err.message || err.code || 'Could not connect to backend')
        : 'Could not connect to backend';
      p.log.error(`${chalk.red('Error:')} ${msg}`);
      process.exit(1);
    }
  });

program.parse();
