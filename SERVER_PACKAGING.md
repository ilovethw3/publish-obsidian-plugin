# Server端打包部署说明

本文档说明如何使用server端打包工具，创建可独立部署的ZIP包。

## 概述

Server端打包系统包含以下组件：

- **`build-server-package.sh`** - 核心打包脚本
- **`release-server.sh`** - 版本管理和发布工具
- **`.github/workflows/build-server-package.yml`** - GitHub Actions自动构建

## 快速使用

### 构建最新版本包
```bash
./release-server.sh
# 或
./release-server.sh latest
```

### 构建特定版本包
```bash
./release-server.sh v1.0.0
./release-server.sh v1.2.3-beta
```

### 查看已构建的包
```bash
./release-server.sh list
```

### 清理构建目录
```bash
./release-server.sh clean
```

## 包结构

生成的ZIP包包含以下文件：

```
obsidian-publisher-server/
├── deploy.sh                    # 优化的部署脚本
├── .env.example                 # 环境变量模板
├── INSTALL.md                   # 详细安装说明
├── README.md                    # 项目说明
├── DEPLOYMENT.md                # 部署文档
├── docker-compose.yml           # Docker配置
├── server/
│   ├── nginx/                   # Nginx配置文件
│   │   └── nginx-cloudflare.conf
│   ├── database/               # 数据库目录(空)
│   └── logs/                   # 日志目录(空)
└── shared/
    └── types.ts                # 共享类型定义
```

## 用户使用流程

用户收到ZIP包后的使用流程：

1. **解压包**：
   ```bash
   unzip obsidian-publisher-server-v1.0.0.zip
   cd obsidian-publisher-server
   ```

2. **配置环境**：
   ```bash
   cp .env.example .env
   nano .env  # 编辑配置
   ```

3. **部署服务**：
   ```bash
   ./deploy.sh deploy-prod
   ```

4. **验证部署**：
   ```bash
   ./deploy.sh status
   curl http://localhost/health
   ```

## 优化的deploy.sh特性

打包版本的deploy.sh相比原版有以下改进：

### 🔍 智能环境检查
- 自动检查Docker和Docker Compose可用性
- 验证.env文件存在性和完整性
- 检查API_TOKEN长度和格式
- 友好的错误提示和解决建议

### 📦 离线部署支持
- 移除git依赖，支持离线环境
- 自动处理Docker镜像拉取失败情况
- 支持从本地构建或预构建镜像部署

### 🛠 增强的错误处理
- 详细的错误日志和调试信息
- 自动权限修复建议
- 完整的故障排除指南

### 📊 改进的状态显示
- 更清晰的容器状态展示
- 健康检查结果显示
- 有用的管理命令提示

## GitHub Actions集成

项目包含GitHub Actions工作流，可以：

### 自动触发条件
- 推送版本标签时自动构建 (例如：`git push origin v1.0.0`)
- 手动触发构建
- 支持自定义版本号

### 自动化功能
- 构建server包
- 生成校验和(SHA256, MD5)
- 创建发布说明
- 上传到GitHub Releases
- 构建摘要报告

### 使用方法
```bash
# 创建版本标签并推送
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions会自动：
# 1. 构建包
# 2. 创建Release
# 3. 上传文件和校验和
```

## 高级功能

### 版本管理
- 支持语义化版本号 (v1.0.0)
- 支持预发布版本 (v1.0.0-beta)
- 自动生成校验和文件
- 维护latest符号链接

### 包优化
- 排除不必要文件(.git, node_modules等)
- 压缩大小约33KB
- 包含所有必需的配置和文档

### 部署脚本功能
完整的部署命令支持：
```bash
./deploy.sh deploy        # 默认部署
./deploy.sh deploy-prod   # 生产部署
./deploy.sh deploy-dev    # 开发部署
./deploy.sh status        # 状态检查
./deploy.sh logs          # 查看日志
./deploy.sh restart       # 重启服务
./deploy.sh stop          # 停止服务
./deploy.sh backup        # 创建备份
./deploy.sh help          # 帮助信息
```

## 最佳实践

### 发布流程
1. 测试本地构建：`./release-server.sh v1.0.0`
2. 测试包部署：解压并部署测试
3. 创建git标签：`git tag v1.0.0`
4. 推送标签：`git push origin v1.0.0`
5. GitHub Actions自动处理后续发布

### 版本号约定
- 主版本：`v1.0.0`, `v2.0.0`
- 次版本：`v1.1.0`, `v1.2.0`
- 补丁版本：`v1.0.1`, `v1.0.2`
- 预发布：`v1.0.0-alpha`, `v1.0.0-beta`, `v1.0.0-rc1`

### 测试建议
1. 在干净的Linux环境测试部署
2. 验证所有配置选项
3. 测试不同的nginx配置文件
4. 验证健康检查和API功能

## 故障排除

### 常见问题

**构建失败**：
- 检查build-server-package.sh权限
- 确保在项目根目录运行
- 验证zip/unzip工具已安装

**GitHub Actions失败**：
- 检查版本标签格式
- 确保GITHUB_TOKEN权限充足
- 查看Actions日志详细错误

**部署失败**：
- 检查.env文件配置
- 验证Docker权限
- 查看deploy.sh日志输出

### 获取帮助
- 查看INSTALL.md详细说明
- 使用`./deploy.sh help`查看命令
- 检查构建日志和错误信息

## 总结

Server端打包系统提供了完整的解决方案，让用户能够：
- 快速部署Obsidian发布服务
- 无需了解复杂的Docker和nginx配置
- 获得生产就绪的部署包
- 享受自动化的构建和发布流程

这大大简化了server端的分发和部署过程。