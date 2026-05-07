const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const root = __dirname;
const children = [];

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] 被信号 ${signal} 终止`);
    }
    if (name === 'app') {
      shutdown(code ?? (signal ? 1 : 0));
    }
  });

  child.on('error', (err) => {
    console.error(`[${name}] 启动失败:`, err.message);
    shutdown(1);
  });

  return child;
}

function shutdown(code = 0) {
  console.log('\n正在关闭所有服务...');

  // 恢复终端模式
  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch (_) {}
  }

  // 先发送 SIGTERM
  for (const child of children) {
    if (!child.killed) {
      try { child.kill('SIGTERM'); } catch (_) {}
    }
  }

  // 1秒后强制 SIGKILL
  const forceKillTimer = setTimeout(() => {
    console.log('强制终止残留进程...');
    for (const child of children) {
      if (!child.killed) {
        try { child.kill('SIGKILL'); } catch (_) {}
      }
    }
    process.exit(code);
  }, 1000);

  // 如果所有子进程在1秒内退出，直接结束
  let exitedCount = 0;
  const checkAllExited = () => {
    exitedCount++;
    if (exitedCount >= children.length) {
      clearTimeout(forceKillTimer);
      process.exit(code);
    }
  };

  for (const child of children) {
    if (child.killed) {
      checkAllExited();
    } else {
      child.once('exit', checkAllExited);
    }
  }
}

// SIGINT/SIGTERM 兜底（当不是通过 npm 运行时仍然有效）
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('bridge', process.execPath, [path.join(root, 'bridge-server.js')]);

setTimeout(() => {
  const electronBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
  start('app', electronBin, ['.']);
}, 800);

// 直接捕获键盘输入，绕过 npm 的信号拦截问题
console.log('Inni Pet 已启动！');
console.log('动作命令: left / right / ears / shake / random');
console.log('按 Ctrl+C 或输入 exit 退出');

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();

  let inputLine = '';

  process.stdin.on('data', (buf) => {
    for (const byte of buf) {
      // Ctrl+C = 0x03
      if (byte === 3) {
        shutdown(0);
        return;
      }

      // Ctrl+D = 0x04 (EOF)
      if (byte === 4) {
        shutdown(0);
        return;
      }

      // Enter = 0x0d
      if (byte === 13) {
        process.stdout.write('\n');
        const gesture = inputLine.trim();
        inputLine = '';

        if (gesture === 'quit' || gesture === 'exit') {
          shutdown(0);
          return;
        }

        if (gesture) {
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
          req.on('error', (e) => console.log(`[gesture] ${e.message}`));
          req.end(body);
        }
        continue;
      }

      // Backspace = 0x7f (macOS/Linux) 或 0x08 (Windows)
      if (byte === 127 || byte === 8) {
        if (inputLine.length > 0) {
          inputLine = inputLine.slice(0, -1);
          process.stdout.write('\b \b');
        }
        continue;
      }

      // 普通可打印字符
      if (byte >= 32 && byte < 127) {
        const ch = String.fromCharCode(byte);
        inputLine += ch;
        process.stdout.write(ch);
      }
    }
  });
} else {
  // 非 TTY 模式（管道等），使用简单 readline
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

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
    req.on('error', (e) => console.log(`[gesture] ${e.message}`));
    req.end(body);
  });
}
