#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { planFile, buildPlan, computeDiff, formatDiff } from './plan.js';
import { applyFile } from './apply.js';
import { undoLast } from './undo.js';
import { initCobble } from './init.js';
import { checkOnce } from './once.js';
import { colorsEnabled } from './format.js';

interface CliOptions {
  command: string;
  file?: string;
  yes: boolean;
  once: boolean;
}

function usage(): void {
  console.error(`Usage:
  cobble plan <file.cobble>       Show planned changes (default)
  cobble apply <file.cobble>      Apply changes [--yes|-y] [--once]
  cobble undo                     Revert last apply
  cobble init [file.cobble]       Create a starter .cobble (default: setup.cobble)`);
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  let command = 'plan';
  let file: string | undefined;
  let yes = false;
  let once = false;

  if (args.length === 0) {
    return { command, yes, once };
  }

  const first = args[0] ?? '';
  if (first === 'plan' || first === 'apply' || first === 'undo' || first === 'init') {
    command = first;
    const rest = args.slice(1);
    for (const arg of rest) {
      if (arg === '--yes' || arg === '-y') {
        yes = true;
      } else if (arg === '--once') {
        once = true;
      } else if (file === undefined) {
        file = arg;
      }
    }
  } else if (first.endsWith('.cobble')) {
    file = first;
  } else {
    command = first;
  }

  const result: CliOptions = { command, yes, once };
  if (file !== undefined) {
    result.file = file;
  }
  return result;
}

async function confirmApply(): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return false;
  }
  const answer = await p.confirm({
    message: 'Apply these changes?',
    initialValue: false,
  });
  if (p.isCancel(answer)) {
    return false;
  }
  return answer;
}

function printWarning(message: string): void {
  const text = `⚠ ${message}`;
  console.log(colorsEnabled() ? chalk.yellow(text) : text);
}

async function main(): Promise<void> {
  const { command, file, yes, once } = parseArgs(process.argv);

  try {
    if (command === 'undo') {
      const count = undoLast();
      p.log.success(`Undid ${count} operation(s).`);
      return;
    }

    if (command === 'init') {
      const created = initCobble(file ?? 'setup.cobble');
      p.log.success(`Created ${created}`);
      return;
    }

    if (!file) {
      usage();
      process.exit(1);
    }

    if (!fs.existsSync(file)) {
      p.log.error(`File not found: ${file}`);
      process.exit(1);
    }

    if (command === 'plan') {
      console.log(planFile(file));
      return;
    }

    if (command === 'apply') {
      const resolved = path.resolve(file);
      const source = fs.readFileSync(resolved, 'utf8');
      const { root, ops } = buildPlan(source);
      const entries = computeDiff(root, ops);
      console.log(formatDiff(root, entries));

      if (entries.length === 0) {
        p.log.info('Nothing to do.');
        return;
      }

      if (once) {
        const onceCheck = checkOnce(root, source, resolved, ops);
        if (onceCheck.drift && onceCheck.message) {
          printWarning(onceCheck.message);
        } else if (onceCheck.skip) {
          p.log.info(onceCheck.message ?? 'Already applied.');
          return;
        }
      }

      if (!yes) {
        const ok = await confirmApply();
        if (!ok) {
          p.log.warn('Aborted.');
          return;
        }
      }

      const result = applyFile(resolved, { once, cwd: process.cwd() });
      if (result.skipped && result.recordCount === 0) {
        p.log.info('Nothing to do.');
        return;
      }

      p.log.success(
        `Applied ${result.recordCount} operation(s). Journal: ${result.root}/.cobble/journal.json`,
      );
      return;
    }

    usage();
    process.exit(1);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    p.log.error(message);
    process.exit(1);
  }
}

main();
