import type { PlanContext, Op, VerbHandler } from '../types.js';
import { toRelativePath } from '../jail.js';

function requireParam(params: Record<string, string>, key: string): string {
  const val = params[key];
  if (!val) {
    throw new Error(`Missing required parameter: ${key}`);
  }
  return val;
}

function relPath(ctx: PlanContext, param: string): string {
  const abs = ctx.resolvePath(param);
  return toRelativePath(ctx.root, abs);
}

export const ensureDir: VerbHandler = (ctx, params) => {
  const raw = params['path'] ?? params['name'];
  if (!raw) {
    throw new Error('[ENSURE-DIR] requires path= parameter');
  }
  const abs = ctx.resolvePath(raw);
  return [{ kind: 'mkdir', path: toRelativePath(ctx.root, abs) }];
};

export const writeFile: VerbHandler = (ctx, params, body) => {
  const name = requireParam(params, 'name');
  if (body === undefined) {
    throw new Error('[WRITE-FILE] requires <% body %>');
  }
  return [{ kind: 'write', path: relPath(ctx, name), content: body }];
};

export const append: VerbHandler = (ctx, params, body) => {
  const name = requireParam(params, 'name');
  if (body === undefined) {
    throw new Error('[APPEND] requires <% body %>');
  }
  return [{ kind: 'append', path: relPath(ctx, name), content: body }];
};

export const replace: VerbHandler = (ctx, params, body) => {
  const name = requireParam(params, 'name');
  if (body === undefined) {
    throw new Error('[REPLACE] requires <% body %>');
  }

  const rel = relPath(ctx, name);
  const marker = params['marker'];
  const find = params['find'];

  const existing = ctx.readFile(rel);
  let prior: string;
  if (existing !== null) {
    prior = existing;
  } else if (marker) {
    throw new Error(`[REPLACE] file not found for marker replace: ${rel}`);
  } else if (find) {
    throw new Error(`[REPLACE] file not found for find/replace: ${rel}`);
  } else {
    prior = '';
  }

  let resultContent: string;
  if (marker) {
    resultContent = replaceMarker(prior, marker, body);
  } else if (find !== undefined) {
    if (!prior.includes(find)) {
      throw new Error(`[REPLACE] find string not found in ${rel}`);
    }
    resultContent = prior.replace(find, body);
  } else {
    resultContent = body;
  }

  return [{ kind: 'replace', path: rel, newContent: body, resultContent }];
};

export const deleteFile: VerbHandler = (ctx, params) => {
  const name = requireParam(params, 'name');
  return [{ kind: 'delete', path: relPath(ctx, name) }];
};

function replaceMarker(content: string, markerId: string, newInner: string): string {
  const start = `<!--cobble:start ${markerId}-->`;
  const end = '<!--cobble:end-->';
  const startIdx = content.indexOf(start);
  if (startIdx === -1) {
    throw new Error(`Marker start not found: ${start}`);
  }
  const afterStart = startIdx + start.length;
  const endIdx = content.indexOf(end, afterStart);
  if (endIdx === -1) {
    throw new Error(`Marker end not found after ${start}`);
  }

  const before = content.slice(0, afterStart);
  const after = content.slice(endIdx);
  const needsLeadingNewline = newInner.length > 0 && !newInner.startsWith('\n');
  const needsTrailingNewline = newInner.length > 0 && !newInner.endsWith('\n');
  const inner = `${needsLeadingNewline ? '\n' : ''}${newInner}${needsTrailingNewline ? '\n' : ''}`;
  return before + inner + after;
}

export type { Op };
