const { join } = require('path');
const { existsSync } = require('fs');
process.env.NODE_ENV = 'test';

// if test config exists in cwd prefer this one
const testTsconfigPath = join(process.cwd(), 'tsconfig.test.json');
if (existsSync(testTsconfigPath)) {
  process.env.TS_NODE_PROJECT = testTsconfigPath;
}

// we need to transpile typescript files in node_modules because some dependencies are distributed as typescript files
// transpile pg_packet-stream because it's written in TS :O
process.env.TS_NODE_IGNORE = '/^node_modules/((?!pg-packet-stream).)*$/';

module.exports = {
  require: ['ts-node/register/transpile-only', 'tsconfig-paths/register', 'earljs/mocha'],
  extension: ['ts'],
  watchExtensions: ['ts'],
  spec: ['./test/**/*.test.ts'],
  timeout: 150000,
};
