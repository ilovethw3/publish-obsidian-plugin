# Obsidian 客户端插件部署文档

本文档详细说明如何构建、安装和配置 Obsidian 发布插件。

## 📋 目录

- [系统要求](#系统要求)
- [构建插件](#构建插件)
- [安装插件](#安装插件)
- [插件配置](#插件配置)
- [使用指南](#使用指南)
- [故障排除](#故障排除)
- [开发模式](#开发模式)

## 📋 系统要求

### 必需软件
- **Obsidian**: v0.12.0 或更高版本
- **Node.js**: v16.x 或更高版本
- **npm**: v7.x 或更高版本

### 支持的平台
- Windows 10/11
- macOS 10.15+ (Catalina)
- Linux (Ubuntu 18.04+)

## 🔧 构建插件

### 1. 克隆项目
```bash
git clone https://github.com/ilovethw3/publish-obsidian-plugin.git
cd publish-obsidian-plugin
```

### 2. 安装依赖
```bash
# 安装根项目依赖
npm install

# 安装客户端依赖
cd client
npm install
```

### 3. 构建插件
```bash
# 在 client 目录中执行
npm run build

# 或者使用开发模式（自动重建）
npm run dev
```

### 4. 验证构建
构建成功后，应该在根目录看到以下文件：
- `main.js` - 插件主文件
- `manifest.json` - 插件清单
- `styles.css` - 插件样式

## 📥 安装插件

### 方法一：手动安装（推荐）

1. **找到 Obsidian 插件目录**
   - Windows: `%APPDATA%\Obsidian\plugins\`
   - macOS: `~/Library/Application Support/obsidian/plugins/`
   - Linux: `~/.config/obsidian/plugins/`

2. **创建插件文件夹**
   ```bash
   mkdir -p /path/to/obsidian/plugins/obsius-publish/
   ```

3. **复制插件文件**
   ```bash
   cp main.js manifest.json styles.css /path/to/obsidian/plugins/obsius-publish/
   ```

### 方法二：使用 BRAT（测试版本）

1. 安装 BRAT 插件
2. 在 BRAT 设置中添加仓库: `https://github.com/ilovethw3/publish-obsidian-plugin`
3. 启用插件

### 方法三：开发者模式

1. **链接到开发目录**
   ```bash
   # 在插件目录中创建符号链接
   ln -s /path/to/publish-obsidian-plugin /path/to/obsidian/plugins/obsius-publish
   ```

2. **热重载开发**
   ```bash
   cd client
   npm run dev
   ```

## ⚙️ 插件配置

### 1. 启用插件
1. 打开 Obsidian
2. 前往 `设置` → `第三方插件`
3. 关闭 `安全模式`
4. 找到 `Obsius Publish` 插件并启用

### 2. 验证连接
1. 确认服务端已部署并运行
2. 检查域名 `https://share.141029.xyz` 是否可访问
3. 测试健康检查端点: `https://share.141029.xyz/health`

### 3. 插件设置
目前插件使用硬编码的服务端地址。如需修改：

1. 编辑 `client/src/obsius.ts`
2. 修改第4行的 `baseUrl` 常量:
   ```typescript
   const baseUrl = "https://your-domain.com";
   ```
3. 重新构建插件

## 📖 使用指南

### 发布新笔记

#### 方法1: 右键菜单
1. 在文件浏览器中右键点击 Markdown 文件
2. 选择 "Publish to Obsius"
3. URL 将自动复制到剪贴板

#### 方法2: 编辑器菜单
1. 在编辑器中打开 Markdown 文件
2. 点击编辑器菜单（三点图标）
3. 选择 "Publish to Obsius"

#### 方法3: 命令面板
1. 按 `Ctrl/Cmd + P` 打开命令面板
2. 输入 "Publish to Obsius"
3. 按回车执行

### 更新已发布的笔记

使用与发布相同的方法，但选择：
- "Update in Obsius"（右键菜单）
- "Update in Obsius"（编辑器菜单）
- "Update in Obsius"（命令面板）

### 获取公开链接

1. 右键点击已发布的文件
2. 选择 "Copy Obsius URL"
3. URL 将复制到剪贴板

### 删除发布的笔记

1. 右键点击已发布的文件
2. 选择 "Remove from Obsius"
3. 文件将从服务器删除（可能有缓存延迟）

### 查看已发布的文章

1. 打开命令面板 (`Ctrl/Cmd + P`)
2. 输入 "View published posts"
3. 在弹出的模态框中查看所有已发布的文章

## 🔧 故障排除

### 常见问题

#### 1. 插件无法加载
**症状**: 插件在设置中不显示或无法启用

**解决方案**:
```bash
# 检查文件权限
chmod 644 main.js manifest.json styles.css

# 检查文件完整性
ls -la main.js manifest.json styles.css

# 重新构建
cd client
npm run build
```

#### 2. 发布失败
**症状**: 显示 "Failed to publish note to Obsius"

**解决方案**:
1. **检查网络连接**
   ```bash
   curl -I https://share.141029.xyz/health
   ```

2. **检查服务端状态**
   - 确认服务端正在运行
   - 检查防火墙设置
   - 验证 SSL 证书

3. **查看控制台错误**
   - 按 `Ctrl/Cmd + Shift + I` 打开开发者工具
   - 查看 Console 标签页中的错误信息

#### 3. 更新失败
**症状**: 显示 "Failed to update note in Obsius"

**解决方案**:
1. **确认文章存在**
   - 检查文章是否之前已成功发布
   - 确认本地数据文件未损坏

2. **检查权限**
   - 确认 secret 信息正确存储
   - 重新发布文章（删除后重新发布）

#### 4. 中文字符显示问题
**症状**: 发布的文章中文显示异常

**解决方案**:
1. 确保 Obsidian 文件使用 UTF-8 编码
2. 检查服务端字符编码设置
3. 重新保存并发布文章

### 日志调试

#### 启用详细日志
在 `client/src/obsius.ts` 中添加调试代码：

```typescript
// 在相关函数开头添加
console.log('Publishing post:', { title, content: content.substring(0, 100) });

// 在错误处理中添加
console.error('Detailed error:', e);
```

#### 查看插件数据
插件数据存储在 Obsidian 的插件数据目录中：
```bash
# Windows
%APPDATA%\Obsidian\plugins\obsius-publish\data.json

# macOS
~/Library/Application Support/obsidian/plugins/obsius-publish/data.json

# Linux
~/.config/obsidian/plugins/obsius-publish/data.json
```

## 🛠️ 开发模式

### 设置开发环境

1. **克隆项目**
   ```bash
   git clone https://github.com/ilovethw3/publish-obsidian-plugin.git
   cd publish-obsidian-plugin/client
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发模式**
   ```bash
   npm run dev
   ```

### 开发工作流

1. **修改代码**: 编辑 `client/src/` 目录中的文件
2. **自动重建**: esbuild 会自动检测变更并重建
3. **重启插件**: 在 Obsidian 中禁用并重新启用插件
4. **测试功能**: 验证修改是否生效

### 调试技巧

1. **使用 console.log**
   ```typescript
   console.log('Debug info:', data);
   ```

2. **使用 Obsidian Notice**
   ```typescript
   new Notice('Debug message');
   ```

3. **查看网络请求**
   - 打开开发者工具
   - 切换到 Network 标签页
   - 观察 API 请求和响应

### 构建发布版本

```bash
# 构建生产版本
npm run build

# 验证文件
ls -la ../main.js ../manifest.json ../styles.css
```

## 🚀 自动化部署

### GitHub Actions 构建
创建 `.github/workflows/build-plugin.yml`：

```yaml
name: Build Plugin

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd client
        npm ci
        
    - name: Build plugin
      run: |
        cd client
        npm run build
        
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: plugin-files
        path: |
          main.js
          manifest.json
          styles.css
```

### 本地构建脚本
创建 `build-plugin.sh`：

```bash
#!/bin/bash
set -e

echo "🔧 Building Obsidian Plugin..."

# 进入客户端目录
cd client

# 安装依赖
echo "📦 Installing dependencies..."
npm ci

# 构建插件
echo "🔨 Building plugin..."
npm run build

# 验证文件
echo "✅ Verifying build files..."
if [ -f "../main.js" ] && [ -f "../manifest.json" ] && [ -f "../styles.css" ]; then
    echo "🎉 Plugin built successfully!"
    echo "Files:"
    ls -la ../main.js ../manifest.json ../styles.css
else
    echo "❌ Build failed - missing files"
    exit 1
fi

echo "📋 Ready for installation!"
```

## 🔗 相关链接

- [Obsidian 插件开发文档](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian API 参考](https://docs.obsidian.md/Reference/TypeScript+API)
- [项目 GitHub 仓库](https://github.com/ilovethw3/publish-obsidian-plugin)
- [问题报告](https://github.com/ilovethw3/publish-obsidian-plugin/issues)

## 📄 许可证

本插件使用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。