# Obsidian Publishing System 文档

这是 Obsidian Publishing System 的完整文档，基于 DeepWiki 分析生成。

## 📋 项目概述

Obsidian Publishing System 是一个允许用户将 Obsidian 笔记发布到公共网络的完整解决方案。该系统采用客户端-服务器架构，由三个主要组件组成：

- **客户端**: Obsidian 插件，用于发布笔记
- **服务器**: Express.js Web 服务，用于托管发布的内容  
- **共享**: 客户端和服务器之间的公共 TypeScript 类型

## 🏗️ 系统架构

### 单体仓库结构
```
├── client/          # Obsidian 插件 (TypeScript + esbuild)
├── server/          # Express.js API 服务器 (TypeScript + Docker)
├── shared/          # 共享 TypeScript 接口
└── deployment/      # Docker compose, 部署脚本
```

### 主要组件

**客户端架构:**
- `client/src/obsius.ts` - 核心 API 客户端和帖子管理
- `client/src/http.ts` - HTTP 客户端包装器，包含错误处理
- `client/main.ts` - Obsidian 插件入口点
- `client/src/modals.ts` - 帖子管理 UI 组件

**服务器架构:**
- `server/src/app.ts` - Express 应用程序，配置 CORS 支持 Obsidian 应用
- `server/src/routes/posts.ts` - REST API 端点 (POST, GET, PUT, DELETE)
- `server/src/models/` - 数据库模型 (SQLite 单例模式)
- `server/src/utils/` - ID 生成和 Markdown 渲染
- `server/src/middleware/` - 错误处理和日志记录

**共享类型:**
- `shared/types.ts` - 客户端和服务器使用的 API 请求/响应接口

## 📊 数据流程

1. 用户通过 Obsidian 插件发布笔记
2. 插件向服务器 API 发送 HTTP 请求
3. 服务器将笔记存储在 SQLite 数据库中
4. 服务器生成公共访问的短 URL
5. 插件接收 URL 并在本地存储帖子元数据

## 🔧 技术栈

- **前端**: TypeScript, esbuild
- **后端**: Node.js, Express.js
- **数据库**: SQLite
- **缓存**: node-cache
- **容器化**: Docker, Docker Compose
- **认证**: Bearer Token (UUID 密钥)
- **安全**: Helmet.js, DOMPurify
- **SSL**: Let's Encrypt + Certbot

## 📚 文档结构

本文档集合包含以下详细指南：

- **[系统架构](./architecture.md)** - 详细的架构设计和组件说明
- **[客户端 API](./client-api.md)** - Obsidian 插件 API 和功能文档
- **[服务器 API](./server-api.md)** - RESTful API 端点和接口规范
- **[部署指南](./deployment.md)** - Docker 配置、环境变量和 CI/CD 流程

## 🚀 快速开始

### 开发环境设置

```bash
# 安装所有依赖
npm run install-all

# 开发模式运行
npm run dev

# 构建项目
npm run build
```

### 生产部署

```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env 文件设置 DOMAIN 和 LETSENCRYPT_EMAIL

# 快速部署
./deploy.sh deploy
```

## 🔐 安全特性

- CORS 配置支持 Obsidian 应用源 (`app://obsidian.md`)
- Helmet.js 安全头
- 输入验证使用 express-validator
- UUID 密钥控制帖子访问权限
- DOMPurify 防 XSS 攻击

## 📈 监控和维护

- 健康检查端点: `/health`
- Docker 日志: `docker-compose logs -f`
- 数据库监控: `du -sh server/database/`
- 容器状态: `docker stats`

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](../LICENSE) 文件。

---

> 📝 **注意**: 本文档通过 DeepWiki 自动分析代码库生成，如有问题请参考源代码或提交 Issue。