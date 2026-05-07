#!/bin/bash
# Inni Pet 启动脚本 - 解决 electron npm 包冲突问题

cd "$(dirname "$0")"

if [ ! -d node_modules/electron ]; then
    npm install
fi

echo "🚀 启动 Inni Pet..."
exec npm start
