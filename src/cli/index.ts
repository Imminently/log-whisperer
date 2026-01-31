/**
 * CLI entrypoint for log-whisperer
 */

import { Command } from 'commander';
import { runCommand } from './commands/run.js';
import { validateConfigCommand } from './commands/validate-config.js';
import { sampleQueriesCommand } from './commands/sample-queries.js';

const program = new Command();

program
  .name('log-whisperer')
  .description('AI-powered daily summaries of operational issues in cloud runtimes')
  .version('0.1.0');

program
  .command('run')
  .description('Run log analysis and send summary')
  .option('-c, --config <path>', 'Path to config file')
  .option('--provider <provider>', 'Log provider (azure)')
  .option('--last-hours <hours>', 'Time window in hours', parseInt)
  .option('--from <iso-date>', 'Start time (ISO 8601)')
  .option('--to <iso-date>', 'End time (ISO 8601)')
  .option('--dry-run', 'Print summary but do not send notifications')
  .option('--no-ai', 'Skip AI summarisation, output raw results')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const exitCode = await runCommand(options);
    process.exit(exitCode);
  });

program
  .command('validate-config')
  .description('Validate configuration file')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    const exitCode = await validateConfigCommand(options);
    process.exit(exitCode);
  });

program
  .command('sample-queries')
  .description('Run sample queries and print result counts')
  .option('-c, --config <path>', 'Path to config file')
  .option('--last-hours <hours>', 'Time window in hours', parseInt)
  .option('--from <iso-date>', 'Start time (ISO 8601)')
  .option('--to <iso-date>', 'End time (ISO 8601)')
  .action(async (options) => {
    const exitCode = await sampleQueriesCommand(options);
    process.exit(exitCode);
  });

program.parse();
