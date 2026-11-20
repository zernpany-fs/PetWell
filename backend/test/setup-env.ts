/**
 * D47: tests use their own database (petwell_test), never the dev database.
 *
 * Runs before every test file (vitest.config.mts -> setupFiles).
 * 1. Loads backend/.env.test. override: true so a DATABASE_URL already set
 *    in the shell cannot point the tests somewhere else.
 * 2. Stops the whole run if DATABASE_URL is not the petwell_test database,
 *    so a missing or wrong .env.test can never wipe dev data.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

const result = config({
  path: resolve(__dirname, '../.env.test'),
  override: true,
  quiet: true,
});

if (result.error) {
  throw new Error(
    'Missing backend/.env.test. Copy .env and set the database name to petwell_test (D47).',
  );
}

const url = process.env['DATABASE_URL'] ?? '';
if (!/\/petwell_test(\?|$)/.test(url)) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL is not the petwell_test database (D47).',
  );
}
