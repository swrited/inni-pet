# Inni Pet

Inni Pet 是一个基于 Electron、PixiJS 和 Live2D Cubism 的桌面宠物项目。当前模型使用仓库内的 `inni_model/inni_2_eye.model3.json`，窗口内置聊天输入、回复字幕、鼠标追踪和点击触发动作。

## 功能

- Live2D 桌面宠物窗口
- 鼠标追踪视线
- 点击模型随机触发动作
- 终端输入动作命令
- 内置聊天桥接服务
- 支持 MiniMax、OpenClaw/QClaw、OpenAI-compatible gateway
- MiniMax TTS 接口

## 启动

首次运行先安装依赖：

```bash
cd /Users/user1/Desktop/wmd/inni/inni-pet
npm install
```

普通启动：

```bash
npm start
```

`npm start` 会同时启动：

- Electron 桌宠窗口
- 本地 bridge server：`http://127.0.0.1:1234`
- 兼容 Ollama 端口：`http://127.0.0.1:11434`

如果终端出现 `electron: command not found`，说明还没有安装依赖，先执行 `npm install`。

## Gateway 选择

应用内可以切换聊天 gateway。也可以用环境变量指定默认 gateway。

### MiniMax

默认 gateway 是 MiniMax：

```bash
npm start
```

可选环境变量：

```bash
MINIMAX_API_KEY=你的key npm start
```

### OpenClaw / QClaw

先保证 QClaw/OpenClaw 本地 gateway 正在运行，并且启用了 `/v1/chat/completions`。

```bash
npm run start:openclaw
```

默认会读取：

- `~/.qclaw/openclaw.json`
- `~/.openclaw/openclaw.json`

默认调用地址：

```text
http://127.0.0.1:28789/v1/chat/completions
```

### Hermes

当前 Hermes 入口按 OpenAI-compatible 接口处理：

```bash
npm run start:hermes
```

默认调用地址：

```text
http://127.0.0.1:8000/v1/chat/completions
```

如果你的 Hermes 不是这个地址，需要指定：

```bash
INNI_CHAT_PROVIDER=hermes \
INNI_CHAT_BASE_URL=http://127.0.0.1:你的端口/v1 \
INNI_CHAT_API_KEY=你的key \
INNI_CHAT_MODEL=你的模型 \
npm start
```

注意：Hermes 自己的 MCP gateway 和 OpenAI-compatible chat API 不是一回事。如果 Hermes 只是启动了 Telegram/MCP gateway，但没有提供 `/v1/chat/completions`，Inni Pet 不能直接把它当聊天模型调用。

## MCP Adapter

如果 Hermes 配置里使用了：

```text
/Users/user1/mcp_stdio_bridge.py
```

它会连接：

```text
http://localhost:9999/mcp/sse
```

本地 adapter 可以这样启动：

```bash
cd "/Users/user1/Downloads/Telegram Desktop/mcp-bridge"
./start.sh
```

这个 adapter 默认转发到：

```text
http://175.24.197.166:8080/mcp/sse
```

如果终端里出现 `HTTP Error 502: Bad Gateway`，通常是远端 `175.24.197.166:8080` 的 MCP gateway 没正常运行，不是 Inni Pet 本地窗口的问题。

## 终端动作命令

启动后可以在同一个终端输入：

```text
left
right
ears
shake
random
```

退出：

```text
exit
```

或者按 `Ctrl+C`。

## 目录说明

```text
main.js                 Electron 主进程
preload.js              渲染进程桥接
index.html              Live2D 窗口和聊天 UI
bridge-server.js        本地聊天/TTS/动作桥
start-all.js            一键启动 bridge 和 Electron
inni_model/             Inni Live2D 模型文件
```

## 常见问题

### Electron 找不到

```text
sh: electron: command not found
```

执行：

```bash
npm install
```

然后重新运行：

```bash
npm start
```

### Cubism moc3 版本不兼容

如果看到类似：

```text
The Core unsupport later than moc3 ver
```

说明当前运行时不支持模型导出的 moc3 版本，需要使用匹配的 Cubism runtime，或者重新导出兼容版本的模型。

### Hermes MCP 502

如果看到：

```text
[mcp-bridge] SSE reader error: HTTP Error 502: Bad Gateway
```

先确认本地 adapter 是否在监听 9999：

```bash
lsof -nP -iTCP:9999 -sTCP:LISTEN
```

再确认远端 MCP gateway 是否正常。当前 adapter 默认远端是 `http://175.24.197.166:8080/mcp/sse`。
