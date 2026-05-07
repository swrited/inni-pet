#!/bin/bash
# Inni Pet 启动脚本

cd "$(dirname "$0")"

# 清除 ELECTRON_RUN_AS_NODE 环境变量，确保 Electron 以应用模式运行
ELECTRON_RUN_AS_NODE=""
ELECTRON_RUN_AS="" 
export ELECTRON_RUN_AS_NODE
export ELECTRON_RUN_AS

if [ ! -d node_modules/electron ]; then
  npm install
fi

npm start
