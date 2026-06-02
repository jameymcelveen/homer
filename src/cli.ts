#!/usr/bin/env node
import fs from 'node:fs';
import readline from 'node:readline';
import { planFile, buildPlan, computeDiff, formatDiff } from './plan.js';
import { applyFile } from './apply.js';
import { undoLast } from './undo.js';

function usage(): void {
  console.error(`Usage:
  cobble plan <file.cobble>     Show planned changes (default)
  cobble apply <file.cobble>    Apply changes [--yes|-y to skip confirm]
  cobble undo                   Revert last apply`);
}

function parseArgs(argv: string[]): {
  command: string;
  file?: string;
  yes: boolean;
} {
  const args = argv.slice(2);
  let command = 'plan';
  let file: string | undefined;
  let yes = false;

  if (args.length === 0) {
    return { command, yes };
  }

  const first = args[0] ?? '';
  if (first === 'plan' || first === 'apply' || first === 'undo') {
    command = first;
    const rest = args.slice(1);
    for (const arg of rest) {
      if (arg === '--yes' || arg === '-y') {
        yes = true;
      } else if (file === undefined) {
        file = arg;
      }
    }
  } else if (first.endsWith('.cobble')) {
    file = first;
  } else {
    command = first;
  }

  const result: { command: string; file?: string; yes: boolean } = { command, yes };
  if (file !== undefined) {
    result.file = file;
  }
  return result;
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function main(): Promise<void> {
  const { command, file, yes } = parseArgs(process.argv);

  try {
    if (command === 'undo') {
      const count = undoLast();
      console.log(`Undid ${count} operation(s).`);
      return;
    }

    if (!file) {
      usage();
      process.exit(1);
    }

    if (!fs.existsSync(file)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }

    if (command === 'plan') {
      console.log(planFile(file));
      return;
    }

    if (command === 'apply') {
      const source = fs.readFileSync(file, 'utf8');
      const { root, ops } = buildPlan(source);
      const diff = formatDiff(root, computeDiff(root, ops));
      console.log(diff);

      if (!yes) {
        const ok = await confirm('Apply these changes?');
        if (!ok) {
          console.log('Aborted.');
          return;
        }
      }

      const result = applyFile(file);
      console.log(`Applied ${result.recordCount} operation(s). Journal: ${result.root}/.cobble/journal.json`);
      return;
    }

    usage();
    process.exit(1);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main();
