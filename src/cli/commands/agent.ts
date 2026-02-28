/**
 * CLI command: agent
 * Prints the AGENTS.md file for AI agents to understand how to use the package
 */

import { readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Find the package root by looking for package.json
 */
function findPackageRoot(startPath: string): string | null {
  let current = resolve(startPath);
  const root = resolve('/');
  
  while (current !== root) {
    const packageJsonPath = join(current, 'package.json');
    if (existsSync(packageJsonPath)) {
      // Check if this is our package by reading package.json
      try {
        const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        if (packageJson.name === '@imminently/log-whisperer') {
          return current;
        }
      } catch {
        // If we can't read it, continue searching
      }
    }
    const parent = dirname(current);
    if (parent === current) break; // Reached root
    current = parent;
  }
  
  return null;
}

async function findAgentsMd(): Promise<string | null> {
  // Try to find package root first
  const packageRoot = findPackageRoot(__dirname);
  if (packageRoot) {
    const agentsPath = join(packageRoot, 'AGENTS.md');
    if (existsSync(agentsPath)) {
      return agentsPath;
    }
  }
  
  // Fallback: try relative paths from current __dirname
  const possiblePaths = [
    // From dist/ to package root (when bundled in cli.js)
    resolve(__dirname, '../AGENTS.md'),
    // From dist/cli/commands/ to package root (if not bundled)
    resolve(__dirname, '../../../AGENTS.md'),
    // From dist/cli/ to package root
    resolve(__dirname, '../../AGENTS.md'),
    // Development: from current working directory
    resolve(process.cwd(), 'AGENTS.md'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

export async function agentCommand(): Promise<number> {
  try {
    const agentsPath = await findAgentsMd();
    
    if (!agentsPath) {
      console.error('Failed to find AGENTS.md file.');
      console.error('Expected locations:');
      console.error(`  - ${resolve(__dirname, '../../../AGENTS.md')}`);
      console.error(`  - ${resolve(__dirname, '../../../../AGENTS.md')}`);
      console.error(`  - ${resolve(process.cwd(), 'AGENTS.md')}`);
      console.error(`Current directory: ${__dirname}`);
      return 1;
    }
    
    const content = await readFile(agentsPath, 'utf-8');
    console.log(content);
    return 0;
  } catch (error) {
    console.error('Failed to read AGENTS.md:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}
