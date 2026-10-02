import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['--test', '.test-dist/tests/api.test.js'], {
  stdio: 'inherit', env: { ...process.env, GDE_TEST_TRANSPORT: 'tcp' },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
