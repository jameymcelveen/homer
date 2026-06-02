import chalk from 'chalk';
import type { DiffEntry } from './types.js';

/** Whether ANSI colors should be suppressed. */
export function colorsEnabled(): boolean {
  if (process.env['NO_COLOR'] !== undefined) {
    return false;
  }
  if (process.env['FORCE_COLOR'] === '0') {
    return false;
  }
  return true;
}

function colorAction(action: DiffEntry['action'], text: string): string {
  if (!colorsEnabled()) {
    return text;
  }
  switch (action) {
    case '+':
      return chalk.green(text);
    case '-':
      return chalk.red(text);
    case '~':
      return chalk.yellow(text);
  }
}

/** Format diff entries for console output, with optional chalk coloring. */
export function formatDiff(root: string, entries: DiffEntry[]): string {
  if (entries.length === 0) {
    return `Plan: no changes (root: ${root})`;
  }

  const lines = [`Plan (${entries.length} change${entries.length === 1 ? '' : 's'}, root: ${root}):`];
  for (const e of entries) {
    const prefix = colorAction(e.action, `  ${e.action}`);
    lines.push(`${prefix} ${e.description}`);
  }
  return lines.join('\n');
}
