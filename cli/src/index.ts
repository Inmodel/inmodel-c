#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import ora from 'ora';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';
import nacl from 'tweetnacl';

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
}

interface StatusOptions {
  tx: string;
  network: Network;
}

interface ScoreResponse {
  submission_id: string;
  problem_id: string;
  wallet: string;
  system_score: number;
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
  .option('-k, --keypair <path>', 'Path to Solana keypair JSON')
  .option('-n, --network <name>', 'Solana network: devnet | mainnet | localnet', 'devnet')
  .action(async (options: SubmitOptions) => {
    validate(options);
    const connection = getConnection(options.network);

    const keypair = loadKeypair(options.keypair);
    const wallet = keypair.publicKey.toBase58();
    console.log(`  Wallet:  ${wallet}`);
    console.log(`  Network: ${options.network}`);

    const payload = {
      problem_id: options.problem,
      repo_url: options.repo,
      deployment_url: options.deployment,
      participant_wallet: wallet,
    };

    const msgBytes = Buffer.from(JSON.stringify(payload));
    const signature = Buffer.from(
      nacl.sign.detached(msgBytes, keypair.secretKey)
    ).toString('base64');

    const spinner = ora('Submitting to JudgeChain...').start();

    try {
      const { data } = await axios.post<ScoreResponse>(`${API_URL}/score`, payload, {
        headers: { 'x-signature': signature, 'x-network': options.network },
      });

      spinner.succeed('Submission successful!');
      console.log(`  Submission ID: ${data.submission_id}`);
      console.log(`  Score:         ${data.system_score}`);
    } catch (err) {
      spinner.fail('Submission failed.');
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail || err.message || err.code || 'Could not connect to backend')
        : 'Could not connect to backend';
      console.error(`Error: ${msg}`);
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

program.parse();
