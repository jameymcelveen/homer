/** Opening sentinel for a guarded append block. */
export function appendStart(id: string): string {
  return `<!--cobble:append ${id}-->`;
}

/** Closing sentinel for a guarded append block. */
export function appendEnd(): string {
  return `<!--cobble:append-end-->`;
}

/** Wrap append body in sentinel markers for idempotent re-runs. */
export function wrapAppendBlock(id: string, body: string): string {
  return `${appendStart(id)}\n${body}\n${appendEnd()}`;
}

/** Whether a file already contains a guarded append block with this id. */
export function hasAppendBlock(content: string, id: string): boolean {
  return content.includes(appendStart(id));
}
