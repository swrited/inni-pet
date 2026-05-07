# Ana Pet Live2D 完整修复指南

## 问题总结

遇到的错误：
```
PIXI.Application is not a constructor
Refused to execute script from 'https://unpkg.com/pixi.js@6.5.10/dist/pixi.min.js' 
because its MIME type ('text/plain') is not executable
Cannot read properties of undefined (reading 'EventEmitter')
```

## 根本原因

1. **MIME 类型检查** - Electron 的 `webSecurity: false` 导致 CDN 脚本被阻止
2. **Pixi.js 未加载** - cubism4.min.js 依赖 Pixi，但 Pixi 加载失败
3. **脚本加载顺序** - cubism4 在 Pixi 之前加载

## 修复方案

### 1. 使用本地 node_modules 路径
```html
<script src="./node_modules/.pnpm/pixi.js@6.5.10/node_modules/pixi.js/dist/browser/pixi.min.js"></script>
```

### 2. 正确的加载顺序
1. Pixi.js (必须第一个)
2. JSZip
3. Cubism 4 运行时
4. pixi-live2d-display

### 3. 启用开发者工具
在 main.js 中添加：
```javascript
mainWindow.webContents.openDevTools();
```

## 启动方式

### 方式 1: 使用 npm
```bash
cd ana-pet
npm install
npm start
```

### 方式 2: 使用启动脚本
```bash
cd ana-pet
chmod +x start.sh
./start.sh
```

### 方式 3: 使用 pnpm
```bash
cd ana-pet
pnpm install
pnpm start
```

## 文件修改清单

- ✅ `index.html` - 修复脚本加载路径
- ✅ `main.js` - 添加开发者工具
- ✅ `package.json` - 确保依赖正确

## 调试技巧

1. **打开开发者工具** - 自动打开，查看控制台错误
2. **检查网络标签** - 确认所有脚本都加载成功
3. **检查控制台** - 查看具体的 JavaScript 错误

## 预期结果

启动后应该看到：
- ✓ Electron 窗口在屏幕右下角
- ✓ Live2D 模型加载
- ✓ Chat 界面显示
- ✓ 开发者工具打开

## 如果还有问题

1. 检查 `node_modules` 是否完整
2. 删除 `node_modules` 重新安装：`pnpm install`
3. 查看开发者工具的具体错误信息
4. 确保模型文件存在：`hiyori_free_zh/runtime/hiyori_free_t08.model3.json`

