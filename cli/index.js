#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();

program
  .name('judgechain')
  .description('CLI to submit Hackathon projects to JudgeChain on Solana')
  .version('1.0.0');

program.command('submit')
  .description('Submit a project to JudgeChain')
  .requiredOption('-p, --problem <id>', 'Problem statement ID')
  .requiredOption('-r, --repo <url>', 'GitHub repository URL')
  .requiredOption('-d, --deployment <url>', 'Live deployment URL')
  .action((options) => {
    console.log(`Submitting project for Problem: ${options.problem}`);
    console.log(`Repo: ${options.repo}`);
    console.log(`Deployment: ${options.deployment}`);
    // TODO: Send to backend API to begin scoring validation and signing transaction
  });

program.parse();
