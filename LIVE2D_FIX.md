# Live2D 导入修复说明

## 问题诊断

原始 `index.html` 存在以下问题：

1. **重复的脚本加载** - 第 132-141 行和 157-162 行有重复的脚本标签
2. **混合的加载方式** - 同时使用 CDN 和本地加载，导致冲突
3. **不一致的库版本** - 加载了不同版本的 Pixi.js
4. **缺少关键配置** - 没有正确的 Ticker 注册注释

## 修复内容

### 1. 统一脚本加载顺序
```html
<!-- Pixi.js 核心库 -->
<script src="./node_modules/pixi.js/dist/pixi.min.js"></script>
<!-- JSZip 用于解压模型文件 -->
<script src="./node_modules/jszip/dist/jszip.min.js"></script>
<!-- Cubism 4 运行时 -->
<script src="./live2dcubismcore.min.js"></script>
<!-- pixi-live2d-display Cubism 4 版本 -->
<script src="./cubism4.min.js"></script>
```

### 2. 移除重复代码
- 删除了第二个 `<script>` 标签块中的重复变量声明
- 保留了唯一的初始化逻辑

### 3. 关键修复点
- **Ticker 注册** - `Live2DModel.registerTicker(PIXI.Ticker)` 是必须的
- **模型加载** - 使用 `Live2DModel.from()` 异步加载模型
- **舞台管理** - 正确添加模型到 Pixi 舞台

## 对比 airi 项目

| 方面 | airi | ana-pet (修复后) |
|------|------|-----------------|
| 导入方式 | ES Module | 全局脚本 |
| 包管理 | npm | npm (本地加载) |
| Ticker 注册 | ✓ | ✓ |
| 扩展注册 | ✓ | ✓ (通过脚本) |
| 类型检查 | TypeScript | JavaScript |

## 测试步骤

1. 确保 `node_modules` 中有必要的包：
   ```bash
   npm install
   ```

2. 启动 Electron 应用：
   ```bash
   npm start
   ```

3. 检查浏览器控制台是否有错误

## 可能的后续优化

1. 升级到 npm 模块导入方式（如 airi 项目）
2. 添加 TypeScript 支持
3. 实现模型切换功能
4. 添加动画和交互效果

