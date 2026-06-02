import os from 'node:os';

const VAR_HOME = /%HOME%/g;
const VAR_CWD = /%CWD%/g;
const VAR_ENV = /%ENV:([A-Z_][A-Z0-9_]*)%/g;

/**
 * Resolve Cobble variable tokens in a string at plan time.
 */
export function resolveVariables(value: string, cwd: string = process.cwd()): string {
  let result = value.replace(VAR_HOME, os.homedir());
  result = result.replace(VAR_CWD, cwd);

  result = result.replace(VAR_ENV, (_match, name: string) => {
    const envVal = process.env[name];
    if (envVal === undefined) {
      throw new VariableError(`Environment variable ${name} is not set`);
    }
    return envVal;
  });

  return result;
}

/** Error thrown when a variable cannot be resolved. */
export class VariableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VariableError';
  }
}
