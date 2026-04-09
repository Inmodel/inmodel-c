#!/usr/bin/env node

const { Command } = require('commander');
const axios = require('axios');
const ora = require('ora');

const program = new Command();

const GITHUB_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/;
const URL_RE = /^https?:\/\/.+\..+/;
const API_URL = process.env.JUDGECHAIN_API_URL || 'http://localhost:8000/api/v1';

function validate(options) {
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

program
  .name('judgechain')
  .description('CLI to submit Hackathon projects to JudgeChain on Solana')
  .version('1.0.0');

program.command('submit')
  .description('Submit a project to JudgeChain')
  .requiredOption('-p, --problem <id>', 'Problem statement ID')
  .requiredOption('-r, --repo <url>', 'GitHub repository URL')
  .requiredOption('-d, --deployment <url>', 'Live deployment URL')
  .action(async (options) => {
    validate(options);

    const spinner = ora('Submitting to JudgeChain...').start();

    try {
      const { data } = await axios.post(`${API_URL}/score`, {
        problem_id: options.problem,
        repo_url: options.repo,
        deployment_url: options.deployment,
        participant_wallet: 'pending', // Phase 3: replace with real wallet
      });

      spinner.succeed('Submission successful!');
      console.log(`  Submission ID: ${data.submission_id}`);
      console.log(`  Score:         ${data.system_score}`);
    } catch (err) {
      spinner.fail('Submission failed.');
      const msg = err.response?.data?.detail || err.message || 'Could not connect to backend';
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  });

program.parse();
