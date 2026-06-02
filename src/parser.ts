import type { CobbleBlock } from './types.js';

const VERB_RE = /^\[([A-Z][A-Z0-9-]*)\]$/;
const PARAM_RE = /^([a-zA-Z][a-zA-Z0-9_-]*)=(.*)$/;
const HEREDOC_OPEN = '<%';
const HEREDOC_CLOSE = '%>';

/**
 * Parse a .cobble file into an ordered list of blocks.
 */
export function parse(source: string): CobbleBlock[] {
  const lines = source.split(/\r?\n/);
  const blocks: CobbleBlock[] = [];
  let current: CobbleBlock | null = null;
  let inHeredoc = false;
  let heredocLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (inHeredoc) {
      if (trimmed === HEREDOC_CLOSE || trimmed.endsWith(HEREDOC_CLOSE)) {
        const before = trimmed.endsWith(HEREDOC_CLOSE)
          ? trimmed.slice(0, -HEREDOC_CLOSE.length)
          : '';
        if (before.length > 0) {
          heredocLines.push(before);
        }
        if (current) {
          current.body = heredocLines.join('\n');
        }
        inHeredoc = false;
        heredocLines = [];
      } else {
        heredocLines.push(line);
      }
      continue;
    }

    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const verbMatch = VERB_RE.exec(trimmed);
    if (verbMatch) {
      if (current) {
        blocks.push(current);
      }
      current = { verb: verbMatch[1] ?? '', params: {} };
      continue;
    }

    if (trimmed === HEREDOC_OPEN) {
      if (!current) {
        throw new ParseError(i + 1, 'Heredoc outside of a block');
      }
      inHeredoc = true;
      heredocLines = [];
      continue;
    }

    const paramMatch = PARAM_RE.exec(trimmed);
    if (paramMatch) {
      if (!current) {
        throw new ParseError(i + 1, 'Parameter outside of a block');
      }
      const key = paramMatch[1] ?? '';
      const value = paramMatch[2] ?? '';
      current.params[key] = value.trim();
      continue;
    }

    throw new ParseError(i + 1, `Unexpected line: ${trimmed}`);
  }

  if (inHeredoc) {
    throw new ParseError(lines.length, 'Unclosed heredoc');
  }

  if (current) {
    blocks.push(current);
  }

  return blocks;
}

/** Error thrown when the parser encounters invalid syntax. */
export class ParseError extends Error {
  constructor(
    public readonly line: number,
    message: string,
  ) {
    super(`Parse error at line ${line}: ${message}`);
    this.name = 'ParseError';
  }
}
