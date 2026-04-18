#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import nacl from 'tweetnacl';
import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';
import * as p from '@clack/prompts';
import { CONFIG } from './config';

const program = new Command();

const GITHUB_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/;
const URL_RE = /^https?:\/\/.+\..+/;
const API_URL = CONFIG.API_URL;
const DEFAULT_KEYPAIR = path.join(os.homedir(), '.config', 'solana', 'id.json');
const CONFIG_FILE = '.judgenod.json';

type Network = 'devnet' | 'mainnet' | 'localnet';

const NETWORKS: Record<Network, string> = {
  devnet: clusterApiUrl('devnet'),
  mainnet: clusterApiUrl('mainnet-beta'),
  localnet: 'http://127.0.0.1:8899',
};

// ── Shared types ─────────────────────────────────────────────────────────────

interface JudgeNodConfig {
  problem?: string;
  repo?: string;
  deployment?: string;
}

interface SubmitOptions {
  problem: string;
  repo: string;
  deployment: string;
  keypair?: string;
  network: Network;
  coverage?: string;
  lint?: string;
  json?: boolean;
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
  judge_score?: number | null;
  final_score?: number | null;
  tx_hash?: string | null;
  status?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function retryRequest<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  backoffBase = 1000,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const isRetryable =
        axios.isAxiosError(err) && (!err.response || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET')
        || (err instanceof TypeError && String(err.message).includes('fetch'));
      if (!isRetryable || attempt === maxAttempts) throw err;
      const delay = backoffBase * Math.pow(2, attempt - 1);
      if (process.env.DEBUG) console.error(chalk.dim(`[retry] attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`));
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function loadConfig(): JudgeNodConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
  }
  return {};
}

function saveConfig(config: JudgeNodConfig) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getGitOriginUrl(): string {
  try {
    const url = execSync('git config --get remote.origin.url', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return url.startsWith('git@github.com:')
      ? url.replace('git@github.com:', 'https://github.com/').replace(/\.git$/, '')
      : url.replace(/\.git$/, '');
  } catch { return ''; }
}

function loadKeypair(keypairPath?: string): Keypair {
  const resolved = keypairPath ?? DEFAULT_KEYPAIR;
  if (!fs.existsSync(resolved)) {
    console.error(`Error: Keypair not found at ${resolved}. Run \`solana-keygen new\` or pass --keypair <path>`);
    process.exit(1);
  }
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(resolved, 'utf8')) as number[])
  );
}

function getConnection(network: string): Connection {
  const rpc = NETWORKS[network as Network];
  if (!rpc) {
    console.error(`Error: Unknown network "${network}". Use devnet, mainnet, or localnet.`);
    process.exit(1);
  }
  return new Connection(rpc, 'confirmed');
}

function truncateWallet(w: string): string {
  return `${w.slice(0, 6)}...${w.slice(-4)}`;
}

function validate(options: SubmitOptions): void {
  if (!options.problem.trim()) { console.error('Error: --problem cannot be empty'); process.exit(1); }
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
    if (isNaN(c) || c < 0 || c > 100) { console.error('Error: --coverage must be 0-100'); process.exit(1); }
  }
  if (options.lint) {
    const l = parseFloat(options.lint);
    if (isNaN(l) || l < 0 || l > 18) { console.error('Error: --lint must be 0-18'); process.exit(1); }
  }
}

function displayScore(data: ScoreResponse): void {
  const table = new Table({
    chars: { top: '', 'top-mid': '', 'top-left': '', 'top-right': '', bottom: '',
             'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', left: '',
             'left-mid': '', mid: '', 'mid-mid': '', right: '', 'right-mid': '', middle: ' ' },
    style: { 'padding-left': 0, 'padding-right': 0 },
    head: [chalk.dim('Criteria'), chalk.dim('Score')],
    colWidths: [22, 10],
  });
  table.push(
    ['Code Quality',    data.system_score.code_quality],
    ['Test Coverage',   data.system_score.test_coverage],
    ['Deployment',      data.system_score.deployment_health],
    ['Documentation',   data.system_score.documentation],
    ['Custom',          data.system_score.custom_criteria],
    [chalk.bold('Total Score'), chalk.bold.green(data.system_score.total)],
  );
  p.note(table.toString(), `Submission ID: ${chalk.cyan(data.submission_id)}`);
}

// ── Step 4: shared submit logic ───────────────────────────────────────────────

async function runSubmit(
  payload: object,
  keypair: Keypair,
  network: string,
  jsonMode: boolean,
): Promise<ScoreResponse | undefined> {
  const payloadStr = JSON.stringify(payload);
  const signature = Buffer.from(
    nacl.sign.detached(Buffer.from(payloadStr), keypair.secretKey)
  ).toString('base64');

  if (jsonMode) {
    const { data } = await retryRequest(() =>
      axios.post<ScoreResponse>(`${API_URL}/score`, payloadStr, {
        headers: { 'Content-Type': 'application/json', 'x-signature': signature, 'x-network': network },
      })
    );
    console.log(JSON.stringify(data, null, 2));
    return data;
  }

  const s = p.spinner();
  s.start('Analyzing repository and submitting to JudgeNod');
  try {
    const { data } = await retryRequest(() =>
      axios.post<ScoreResponse>(`${API_URL}/score`, payloadStr, {
        headers: { 'Content-Type': 'application/json', 'x-signature': signature, 'x-network': network },
      })
    );
    s.stop('Submission verified');
    displayScore(data);
    p.outro(`${chalk.green('✔')} Successfully submitted to JudgeNod!`);
    return data;
  } catch (err) {
    s.stop('Submission failed');
    const msg = axios.isAxiosError(err)
      ? (err.response?.data?.detail || err.message || err.code || 'Could not connect to backend')
      : 'Could not connect to backend';
    p.log.error(`${chalk.red('Error:')} ${msg}`);
    process.exit(1);
  }
}

// ── CLI setup ─────────────────────────────────────────────────────────────────

program
  .name('judgenod')
  .description('CLI to submit Hackathon projects to JudgeNod on Solana')
  .version('1.0.0');

// ── submit ────────────────────────────────────────────────────────────────────

program.command('submit')
  .description('Submit a project to JudgeNod')
  .option('-p, --problem <id>',       'Problem statement ID')
  .option('-r, --repo <url>',         'GitHub repository URL')
  .option('-d, --deployment <url>',   'Live deployment URL')
  .option('-c, --coverage <percent>', 'Test coverage (0-100)', '0')
  .option('-l, --lint <score>',       'Linting score (0-18)', '0')
  .option('-k, --keypair <path>',     'Path to Solana keypair JSON')
  .option('-n, --network <name>',     'devnet | mainnet | localnet', 'devnet')
  .option('--json',                   'Output raw JSON (for CI/scripting)')
  .action(async (options: { problem?: string; repo?: string; deployment?: string; coverage?: string; lint?: string; keypair?: string; network: Network; json?: boolean }) => {
    if (!options.json) p.intro(`${chalk.bgCyan.black(' JudgeNod ')} ${chalk.dim('Submission Tool')}`);

    const config = loadConfig();
    const finalOptions: SubmitOptions = {
      problem:    options.problem    || config.problem    || '',
      repo:       options.repo       || config.repo       || '',
      deployment: options.deployment || config.deployment || '',
      coverage:   options.coverage,
      lint:       options.lint,
      keypair:    options.keypair,
      network:    options.network,
      json:       options.json,
    };

    validate(finalOptions);

    const keypair = loadKeypair(finalOptions.keypair);
    const wallet  = keypair.publicKey.toBase58();

    if (!options.json) {
      p.log.info(`${chalk.cyan('Wallet')}  ${chalk.dim(wallet)}`);
      p.log.info(`${chalk.cyan('Network')} ${chalk.dim(finalOptions.network)}`);
    }

    await runSubmit({
      problem_id:                        finalOptions.problem,
      repo_url:                          finalOptions.repo,
      deployment_url:                    finalOptions.deployment,
      participant_wallet:                wallet,
      reported_test_coverage_percent:    parseFloat(finalOptions.coverage || '0'),
      reported_linting_score:            parseFloat(finalOptions.lint     || '0'),
    }, keypair, finalOptions.network, !!options.json);
  });

// ── status ────────────────────────────────────────────────────────────────────

program.command('status')
  .description('Check on-chain transaction status')
  .requiredOption('-t, --tx <hash>', 'Transaction signature hash')
  .option('-n, --network <name>', 'devnet | mainnet | localnet', 'devnet')
  .action(async (options: { tx: string; network: Network }) => {
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
      p.note([
        `${chalk.cyan('Status')}  ${tx.meta?.err ? chalk.red('Failed') : chalk.green('Success')}`,
        `${chalk.cyan('Slot')}    ${tx.slot}`,
        `${chalk.cyan('Fee')}     ${tx.meta?.fee} lamports`,
      ].join('\n'), 'On-Chain Details');
      p.outro(`View on Solscan: ${chalk.underline.dim(`https://solscan.io/tx/${options.tx}?cluster=${options.network}`)}`);
    } catch (err) {
      s.stop('Failed to fetch transaction');
      p.log.error(`${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ── leaderboard ───────────────────────────────────────────────────────────────

program.command('leaderboard')
  .description('View the current leaderboard for a problem')
  .option('-p, --problem <id>', 'Problem statement ID')
  .option('--json',             'Output raw JSON')
  .action(async (options: { problem?: string; json?: boolean }) => {
    if (!options.json) p.intro(`${chalk.bgCyan.black(' JudgeNod ')} ${chalk.dim('Leaderboard')}`);
    let problemId: string | undefined = options.problem;

    if (!problemId) {
      try {
        const { data: problems } = await axios.get<Record<string, { title: string }>>(`${API_URL}/problems`);
        const choices = Object.entries(problems).map(([id, info]) => ({
          label: `${id}: ${info.title}`, value: id,
        }));
        if (choices.length === 0) { p.log.warn('No problems available.'); process.exit(0); }
        const sel = await p.select({ message: 'Select a problem:', options: choices });
        if (p.isCancel(sel)) { p.cancel('Cancelled'); process.exit(0); }
        problemId = sel as string;
      } catch {
        p.log.error('Could not fetch problems. Pass --problem <id>.');
        process.exit(1);
      }
    }

    try {
      const { data } = await axios.get(`${API_URL}/leaderboard?problem_id=${problemId}`);

      if (options.json) { console.log(JSON.stringify(data, null, 2)); return; }

      if (!data || data.length === 0) {
        p.note('No submissions yet. Be the first! 🚀');
        p.outro('');
        return;
      }

      const table = new Table({
        chars: { top: '', 'top-mid': '', 'top-left': '', 'top-right': '', bottom: '',
                 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', left: '',
                 'left-mid': '', mid: '', 'mid-mid': '', right: '', 'right-mid': '', middle: ' ' },
        style: { 'padding-left': 0, 'padding-right': 0 },
        head: [chalk.dim('Rank'), chalk.dim('Wallet'), chalk.dim('System'), chalk.dim('Judge'), chalk.dim('Final'), chalk.dim('On-Chain')],
        colWidths: [6, 16, 9, 9, 9, 12],
      });

      data.slice(0, 10).forEach((e: ScoreResponse & { on_chain_tx?: string }, i: number) => {
        const rank  = i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
        const onChain = e.on_chain_tx
          ? chalk.green('✓ ') + chalk.underline.dim(`https://solscan.io/tx/${e.on_chain_tx}?cluster=devnet`).slice(0, 6) + '…'
          : chalk.dim('—');
        table.push([
          medal,
          chalk.dim(truncateWallet(e.wallet)),
          chalk.green(e.system_score?.total ?? '—'),
          e.judge_score != null ? chalk.yellow(e.judge_score) : chalk.dim('—'),
          e.final_score  != null ? chalk.bold.green(e.final_score) : chalk.dim('—'),
          onChain,
        ]);
      });

      p.note(table.toString(), `Leaderboard: ${chalk.cyan(problemId)}`);
      p.outro(`Top ${Math.min(data.length, 10)} shown.`);
    } catch (err) {
      p.log.error(`${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ── init ──────────────────────────────────────────────────────────────────────

program.command('init')
  .description('Interactive guide to submit your project')
  .option('-k, --keypair <path>', 'Path to Solana keypair JSON')
  .option('-n, --network <name>', 'devnet | mainnet | localnet', 'devnet')
  .action(async (options: { keypair?: string; network: string }) => {
    p.intro(`${chalk.bgCyan.black(' JudgeNod ')} ${chalk.dim('Interactive Submission')}`);

    const existingConfig = loadConfig();
    const gitOrigin = getGitOriginUrl();

    let problemChoices: { label: string; value: string }[] = [];
    try {
      const { data: problems } = await axios.get<Record<string, { title: string }>>(`${API_URL}/problems`);
      problemChoices = Object.entries(problems).map(([id, info]) => ({
        label: `${id}: ${info.title}`, value: id,
      }));
    } catch { p.log.warn('Could not fetch problem list. Entering manual ID.'); }

    const group = await p.group({
      problem: () => problemChoices.length > 0
        ? p.select({ message: 'Select the Problem Statement:', options: problemChoices, initialValue: existingConfig.problem })
        : p.text({ message: 'Enter Problem ID:', initialValue: existingConfig.problem,
                   validate: (v) => (!v?.trim() ? 'Required' : undefined) }),
      repo: () => p.text({
        message: 'GitHub Repository URL:', placeholder: 'https://github.com/user/repo',
        initialValue: existingConfig.repo || gitOrigin,
        validate: (v) => (!v || !GITHUB_URL_RE.test(v) ? 'Invalid GitHub URL' : undefined),
      }),
      deployment: () => p.text({
        message: 'Live Deployment URL:', placeholder: 'https://myapp.vercel.app',
        initialValue: existingConfig.deployment,
        validate: (v) => (!v || !URL_RE.test(v) ? 'Invalid URL' : undefined),
      }),
      coverage: () => p.text({
        message: 'Test Coverage % (0-100):', initialValue: '0',
        validate: (v) => { const n = parseFloat(v ?? ''); return (isNaN(n) || n < 0 || n > 100) ? 'Must be 0-100' : undefined; },
      }),
      lint: () => p.text({
        message: 'Linting Score (0-18):', initialValue: '0',
        validate: (v) => { const n = parseFloat(v ?? ''); return (isNaN(n) || n < 0 || n > 18) ? 'Must be 0-18' : undefined; },
      }),
    }, { onCancel: () => { p.cancel('Cancelled.'); process.exit(0); } });

    saveConfig({ problem: group.problem as string, repo: group.repo, deployment: group.deployment });
    p.log.success(`Saved to ${chalk.cyan(CONFIG_FILE)}`);

    const keypair = loadKeypair(options.keypair);
    const wallet  = keypair.publicKey.toBase58();
    p.log.info(`${chalk.cyan('Wallet')}  ${chalk.dim(wallet)}`);
    p.log.info(`${chalk.cyan('Network')} ${chalk.dim(options.network)}`);

    const result = await runSubmit({
      problem_id:                     group.problem,
      repo_url:                       group.repo,
      deployment_url:                 group.deployment,
      participant_wallet:             wallet,
      reported_test_coverage_percent: parseFloat(group.coverage),
      reported_linting_score:         parseFloat(group.lint),
    }, keypair, options.network, false);

    if (result) {
      const mintNow = await p.confirm({ message: 'Would you like to mint your certificate now?' });
      if (!p.isCancel(mintNow) && mintNow) {
        const score = result.final_score ?? 0;
        if (score >= 50) {
          const s2 = p.spinner();
          s2.start('Minting your certificate on-chain...');
          try {
            const sig = Buffer.from(nacl.sign.detached(Buffer.from(result.submission_id), keypair.secretKey)).toString('base64');
            const res = await fetch(`${API_URL}/certificate/${result.submission_id}`, {
              method: 'POST',
              headers: { 'x-signature': sig },
            });
            const certData = await res.json() as { metadata_uri: string; tx_sig: string; detail?: string };
            if (!res.ok) throw new Error(certData.detail || 'Mint failed');
            s2.stop('Certificate minted!');
            console.log(boxen(
              `🏆 Soulbound NFT Certificate\n\n` +
              `Submission: ${result.submission_id}\n` +
              `Metadata URI: ${certData.metadata_uri}\n` +
              `TX: ${certData.tx_sig}\n` +
              `Solscan: https://solscan.io/tx/${certData.tx_sig}?cluster=${options.network}`,
              { padding: 1, borderColor: 'yellow', title: 'JudgeNod Certificate' }
            ));
          } catch (err) {
            s2.stop('Mint failed');
            p.log.error(`${chalk.red('Error:')} ${err instanceof Error ? err.message : String(err)}`);
          }
        } else {
          p.log.warn(`Score must be >= 50 to mint. Current: ${score}`);
        }
      } else if (!p.isCancel(mintNow) && !mintNow) {
        p.log.info(`Run ${chalk.cyan(`judgenod certificate --submission-id ${result.submission_id}`)} later to mint`);
      }
    }
  });

// ── whoami ────────────────────────────────────────────────────────────────────

program.command('whoami')
  .description('Show loaded wallet address and SOL balance')
  .option('-k, --keypair <path>', 'Path to Solana keypair JSON')
  .option('-n, --network <name>', 'devnet | mainnet | localnet', 'devnet')
  .action(async (options: { keypair?: string; network: string }) => {
    p.intro(`${chalk.bgCyan.black(' JudgeNod ')} ${chalk.dim('Wallet Info')}`);
    const keypair    = loadKeypair(options.keypair);
    const wallet     = keypair.publicKey.toBase58();
    const connection = getConnection(options.network);
    const s = p.spinner();
    s.start('Fetching balance...');
    try {
      const lamports = await connection.getBalance(keypair.publicKey);
      s.stop('Done');
      p.note([
        `${chalk.cyan('Wallet')}   ${chalk.dim(wallet)}`,
        `${chalk.cyan('Balance')}  ${chalk.bold.green((lamports / LAMPORTS_PER_SOL).toFixed(4))} SOL`,
        `${chalk.cyan('Network')}  ${chalk.dim(options.network)}`,
      ].join('\n'), 'Identity');
      p.outro('');
    } catch (err) {
      s.stop('Failed');
      p.log.error(`${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ── score lookup ──────────────────────────────────────────────────────────────

program.command('score')
  .description('Look up a past submission by ID')
  .requiredOption('-s, --submission <id>', 'Submission ID')
  .option('--json', 'Output raw JSON')
  .action(async (options: { submission: string; json?: boolean }) => {
    if (!options.json) p.intro(`${chalk.bgCyan.black(' JudgeNod ')} ${chalk.dim('Submission Lookup')}`);
    const sp = p.spinner();
    if (!options.json) sp.start('Fetching submission...');
    try {
      const { data } = await axios.get<ScoreResponse>(`${API_URL}/score/${options.submission}`);
      if (options.json) { console.log(JSON.stringify(data, null, 2)); return; }
      sp.stop('Found');
      displayScore(data);
      if (data.judge_score != null) {
        p.log.info(`${chalk.cyan('Judge Score')}  ${chalk.yellow(data.judge_score)}`);
        p.log.info(`${chalk.cyan('Final Score')}  ${chalk.bold.green(data.final_score ?? '—')}`);
      }
      if (data.tx_hash) {
        p.log.info(`${chalk.cyan('On-Chain')}     ${chalk.underline.dim(`https://solscan.io/tx/${data.tx_hash}?cluster=devnet`)}`);
      }
      p.outro('');
    } catch (err) {
      if (!options.json) sp.stop('Failed');
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail || err.message)
        : 'Could not connect to backend';
      p.log.error(`${chalk.red('Error:')} ${msg}`);
      process.exit(1);
    }
  });

// ── certificate ───────────────────────────────────────────────────────────────

program
  .command('certificate')
  .description('Mint your soulbound NFT certificate for a submission')
  .option('-s, --submission-id <id>', 'Submission ID from your submit output')
  .option('-n, --network <network>', 'Network: devnet | mainnet', 'devnet')
  .action(async (options) => {
    if (!options.submissionId) {
      console.error(chalk.red('Error: --submission-id is required'));
      process.exit(1);
    }
    const s = p.spinner();
    s.start('Minting your certificate on-chain...');

    try {
      const res = await fetch(`${API_URL}/certificate/${options.submissionId}`, {
        method: 'POST',
      });
      const data = await res.json() as { metadata_uri: string; tx_sig: string; detail?: string };

      if (!res.ok) throw new Error(data.detail || 'Mint failed');

      s.stop('Certificate minted!');

      console.log(
        boxen(
          `🏆 Soulbound NFT Certificate\n\n` +
          `Submission: ${options.submissionId}\n` +
          `Metadata URI: ${data.metadata_uri}\n` +
          `TX: ${data.tx_sig}\n` +
          `Solscan: https://solscan.io/tx/${data.tx_sig}?cluster=${options.network}`,
          { padding: 1, borderColor: 'yellow', title: 'JudgeNod Certificate' }
        )
      );
    } catch (err) {
      s.stop('Mint failed');
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
