/**
 * CLI command: ui
 */

import { loadConfig } from '../../core/config.js';
import type { CLIOptions } from '../../core/types.js';
import { startExplorerServer } from '../../ui/server.js';

export interface UICommandOptions extends CLIOptions {
  port?: number;
  host?: string;
}

export async function uiCommand(options: UICommandOptions): Promise<number> {
  try {
    const config = await loadConfig(options);
    const server = await startExplorerServer(config, {
      port: options.port,
      host: options.host,
    });

    console.log(`Log Whisperer Explorer running at ${server.url}`);
    console.log('Press Ctrl+C to stop.');

    await new Promise<void>((resolve) => {
      const stop = async () => {
        await server.close();
        resolve();
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    });

    return 0;
  } catch (error) {
    console.error('Failed to start explorer UI:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}
