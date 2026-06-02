import fs from 'node:fs';
import path from 'node:path';

const STARTER = `[COBBLE v=1]

[ROOT]
path=%CWD%/cobble-sandbox

[ENSURE-DIR]
path=.

[WRITE-FILE]
name=README.txt
<%
Managed by Cobble — edit this .cobble file, then:
  cobble plan setup.cobble
  cobble apply setup.cobble
%>
`;

/** Write a starter .cobble file into the current directory. */
export function initCobble(filename: string = 'setup.cobble'): string {
  const target = path.resolve(process.cwd(), filename);
  if (fs.existsSync(target)) {
    throw new Error(`File already exists: ${target}`);
  }
  fs.writeFileSync(target, STARTER, 'utf8');
  return target;
}
