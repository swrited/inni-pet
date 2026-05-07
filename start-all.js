const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const children = [];

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  });

  children.push(child);
  child.on('exit', (code, signal) => {
    if (name === 'app') {
      shutdown(code ?? (signal ? 1 : 0));
    }
  });

  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('bridge', process.execPath, [path.join(root, 'bridge-server.js')]);

setTimeout(() => {
  const electronBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
  start('app', electronBin, ['.']);
}, 800);
