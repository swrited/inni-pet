#!/bin/bash
# Inni Pet 启动脚本

cd "$(dirname "$0")"

# 清除 ELECTRON_RUN_AS_NODE 环境变量，确保 Electron 以应用模式运行
unset ELECTRON_RUN_AS_NODE
unset ELECTRON_RUN_AS

if [ ! -d node_modules/electron ]; then
  npm install
fi

# 直接用 node 运行，避免 npm 拦截 SIGINT
exec node start-all.js
