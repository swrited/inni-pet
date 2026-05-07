#!/bin/bash
# Inni Pet 启动脚本 - 解决 electron npm 包冲突问题

cd "$(dirname "$0")"

unset ELECTRON_RUN_AS_NODE
unset ELECTRON_RUN_AS

if [ ! -d node_modules/electron ]; then
    npm install
fi

echo "Inni Pet 启动中..."
exec node start-all.js
