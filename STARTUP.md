# Ana 启动指南

## 快速启动

### 1. 安装依赖
```bash
cd ana-pet
pnpm install
# 或者
npm install
```

### 2. 启动应用
```bash
pnpm start
# 或者
npm start
```

这会启动 Electron 应用，窗口会在屏幕右下角弹出。

---

## 修复说明

### 问题
原始错误：`PIXI.Application is not a constructor`

### 原因
- Pixi.js 没有被正确加载
- package.json 中缺少 pixi.js 依赖
- 脚本加载顺序混乱

### 解决方案
1. **使用 CDN 加载 Pixi.js** - 避免版本冲突
   ```html
   <script src="https://unpkg.com/pixi.js@6.5.10/dist/pixi.min.js"></script>
   ```

2. **正确的加载顺序**
   - Pixi.js (CDN)
   - JSZip (本地)
   - Cubism 4 运行时 (本地)
   - pixi-live2d-display (本地)

3. **移除重复代码** - 清理了 HTML 中的重复脚本

---

## 依赖说明

| 包 | 版本 | 用途 |
|---|------|------|
| electron | ^41.0.3 | Electron 框架 |
| jszip | ^3.10.1 | 解压 .zip 模型文件 |
| pixi-live2d-display | ^0.4.0 | Live2D 渲染 |
| pixi.js | 6.5.10 (CDN) | 2D 渲染引擎 |

---

## 如果还有问题

### 检查清单
- [ ] 模型文件存在：`hiyori_free_zh/runtime/hiyori_free_t08.model3.json`
- [ ] Cubism 文件存在：`live2dcubismcore.min.js`、`cubism4.min.js`
- [ ] 打开开发者工具查看错误（F12）

### 开启调试
在 `main.js` 中添加：
```javascript
mainWindow.webContents.openDevTools();
```

### 常见错误
- **模型加载失败** - 检查模型文件路径
- **连接失败** - 确保 LLM 服务运行在 localhost:1234
- **黑屏** - 检查浏览器控制台的具体错误

