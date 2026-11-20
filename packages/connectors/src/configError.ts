/**
 * Configuration error and environment type, kept in their own module so that `config.ts` and
 * `clock.ts` can both use them without importing each other.
 */

export type EnvSource = Record<string, string | undefined>;

export class ConnectorConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectorConfigError';
  }
}
