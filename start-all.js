const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const readline = require('readline');

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

const rl = readline.createInterface({
  input: process.stdin,
  output: undefined,
  terminal: false
});

console.log('动作命令: left / right / ears / shake / random');
rl.on('line', (line) => {
  const gesture = line.trim();
  if (!gesture) return;
  if (gesture === 'quit' || gesture === 'exit') {
    shutdown(0);
    return;
  }

  const body = JSON.stringify({ gesture });
  const req = http.request({
    hostname: '127.0.0.1',
    port: 1234,
    path: '/gesture',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  });
  req.on('error', (error) => console.log(`[gesture] ${error.message}`));
  req.end(body);
});
