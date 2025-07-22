# 服务端部署文档

本文档详细说明如何在 VPS 上部署 Obsidian Publishing System 服务端。

## 📋 目录

- [系统要求](#系统要求)
- [VPS 准备工作](#vps-准备工作)
- [快速部署](#快速部署)
- [手动部署步骤](#手动部署步骤)
- [SSL 证书配置](#ssl-证书配置)
- [服务管理](#服务管理)
- [监控和维护](#监控和维护)
- [备份策略](#备份策略)
- [故障排除](#故障排除)
- [性能优化](#性能优化)

## 💻 系统要求

### VPS 最低配置
- **CPU**: 1 核心
- **内存**: 2GB RAM
- **存储**: 20GB SSD
- **带宽**: 1Mbps
- **操作系统**: Ubuntu 20.04+ / Debian 10+ / CentOS 8+

### 推荐配置
- **CPU**: 2 核心
- **内存**: 4GB RAM
- **存储**: 40GB SSD
- **带宽**: 10Mbps

### 必需软件
- **Docker**: v20.10+
- **Docker Compose**: v2.0+
- **Git**: v2.25+
- **Curl**: 用于健康检查

### 域名要求
- 拥有一个域名（例如：`share.141029.xyz`）
- 域名 DNS 解析到 VPS IP 地址
- 支持 Let's Encrypt SSL 证书申请

## 🚀 VPS 准备工作

### 1. 更新系统
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
# 或者对于较新版本
sudo dnf update -y
```

### 2. 安装必需软件

#### 安装 Docker
```bash
# 使用官方安装脚本
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 添加用户到 docker 组
sudo usermod -aG docker $USER

# 启用 Docker 服务
sudo systemctl enable docker
sudo systemctl start docker
```

#### 安装 Docker Compose
```bash
# 方法1: 使用包管理器（推荐）
sudo apt install docker-compose-plugin

# 方法2: 直接下载（如果包管理器版本太旧）
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 安装其他工具
```bash
# Ubuntu/Debian
sudo apt install git curl ufw htop -y

# CentOS/RHEL
sudo yum install git curl firewalld htop -y
```

### 3. 配置防火墙

#### Ubuntu/Debian (UFW)
```bash
# 启用 UFW
sudo ufw enable

# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 查看状态
sudo ufw status
```

#### CentOS/RHEL (Firewalld)
```bash
# 启动防火墙
sudo systemctl enable firewalld
sudo systemctl start firewalld

# 允许服务
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 重新加载配置
sudo firewall-cmd --reload
```

### 4. 配置域名 DNS
在你的域名服务商控制面板中设置：
```
Type: A
Name: @
Value: YOUR_VPS_IP_ADDRESS
TTL: 300

Type: A
Name: www
Value: YOUR_VPS_IP_ADDRESS
TTL: 300
```

## 🚀 快速部署

### 1. 克隆项目
```bash
# 克隆代码库
git clone https://github.com/ilovethw3/publish-obsidian-plugin.git
cd publish-obsidian-plugin

# 使 deploy.sh 可执行
chmod +x deploy.sh
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env
```

配置示例：
```env
# 应用设置
NODE_ENV=production
PORT=3000

# 数据库
DB_PATH=/app/data/posts.db

# CORS 设置
CORS_ORIGIN=https://share.141029.xyz

# SSL 配置
SSL_EMAIL=your-email@example.com
DOMAIN=share.141029.xyz

# 日志级别
LOG_LEVEL=info
```

### 3. 一键部署
```bash
# 设置环境变量
export DOMAIN=share.141029.xyz
export SSL_EMAIL=your-email@example.com

# 执行部署
./deploy.sh
```

部署脚本将自动：
- ✅ 检查系统依赖
- ✅ 创建数据备份
- ✅ 构建 Docker 镜像
- ✅ 启动所有服务
- ✅ 申请 SSL 证书
- ✅ 运行健康检查

## 🔧 手动部署步骤

如果自动部署失败，可以按以下步骤手动部署：

### 1. 准备项目结构
```bash
# 克隆项目
git clone https://github.com/ilovethw3/publish-obsidian-plugin.git
cd publish-obsidian-plugin

# 创建必要目录
mkdir -p server/database server/logs
chmod 755 server/database server/logs
```

### 2. 配置环境
```bash
# 复制环境配置
cp .env.example .env

# 编辑配置
nano .env
```

### 3. 构建应用
```bash
# 构建服务端应用
cd server
docker build -t obsidian-publisher-app .
cd ..
```

### 4. 启动服务
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 5. 配置 SSL（手动）
```bash
# 申请 SSL 证书
docker-compose --profile ssl-init up --abort-on-container-exit certbot

# 重新加载 Nginx
docker-compose exec nginx nginx -s reload
```

## 🔒 SSL 证书配置

### 自动配置（推荐）
部署脚本会自动处理 SSL 证书，但如果需要手动配置：

```bash
# 初始申请证书
./deploy.sh ssl-setup

# 测试证书申请（干运行）
docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --dry-run --email your-email@example.com --agree-tos --no-eff-email -d your-domain.com
```

### 证书续期
```bash
# 手动续期
./deploy.sh ssl-renew

# 设置自动续期（添加到 crontab）
crontab -e

# 添加以下行（每周日凌晨2点检查续期）
0 2 * * 0 cd /path/to/your/project && ./ssl-renew.sh >> ssl-renewal.log 2>&1
```

### 证书验证
```bash
# 检查证书有效性
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 在线检查工具
curl -I https://your-domain.com
```

## 🔧 服务管理

### Docker Compose 命令

#### 查看服务状态
```bash
# 查看所有容器状态
docker-compose ps

# 查看服务详细信息
docker-compose ps --services
```

#### 日志管理
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app
docker-compose logs -f nginx

# 查看最近的日志
docker-compose logs --tail=100 app
```

#### 服务控制
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart app
docker-compose restart nginx

# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 强制重新构建
docker-compose build --no-cache
docker-compose up -d
```

### 系统服务管理

#### 创建 Systemd 服务
```bash
# 创建服务文件
sudo nano /etc/systemd/system/obsidian-publisher.service
```

服务文件内容：
```ini
[Unit]
Description=Obsidian Publisher Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/publish-obsidian-plugin
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启用服务
sudo systemctl enable obsidian-publisher

# 启动服务
sudo systemctl start obsidian-publisher

# 检查状态
sudo systemctl status obsidian-publisher
```

## 📊 监控和维护

### 健康检查

#### 自动健康检查
```bash
# 使用部署脚本检查
./deploy.sh status

# 直接 HTTP 检查
curl -f https://your-domain.com/health

# 详细检查
curl -v https://your-domain.com/health
```

#### 手动检查脚本
创建 `health-check.sh`：
```bash
#!/bin/bash
DOMAIN="share.141029.xyz"
HEALTH_URL="https://$DOMAIN/health"

echo "🔍 Checking system health..."

# 检查 HTTP 响应
if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✅ Application is healthy"
else
    echo "❌ Application health check failed"
    exit 1
fi

# 检查容器状态
UNHEALTHY=$(docker-compose ps | grep -v "healthy\|Up" | wc -l)
if [ "$UNHEALTHY" -eq 1 ]; then  # 标题行
    echo "✅ All containers are healthy"
else
    echo "❌ Some containers are unhealthy"
    docker-compose ps
    exit 1
fi

echo "🎉 System is fully operational"
```

### 性能监控

#### 资源使用情况
```bash
# 查看容器资源使用
docker stats

# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看数据库大小
du -sh server/database/
```

#### 日志监控
```bash
# 实时监控错误日志
docker-compose logs -f app | grep ERROR

# 监控访问量
docker-compose logs nginx | grep "GET\|POST" | wc -l

# 分析响应时间
docker-compose logs nginx | awk '{print $(NF-1)}' | sort -n
```

## 💾 备份策略

### 自动备份

#### 创建备份脚本
创建 `backup.sh`：
```bash
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$DATE.tar.gz"

echo "📦 Creating backup..."

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 创建备份
tar -czf "$BACKUP_FILE" \
    server/database/ \
    server/logs/ \
    .env \
    docker-compose.yml

if [ $? -eq 0 ]; then
    echo "✅ Backup created: $BACKUP_FILE"
    
    # 保留最近 7 个备份
    ls -t "$BACKUP_DIR"/backup-*.tar.gz | tail -n +8 | xargs -r rm --
    echo "🗑️  Old backups cleaned up"
else
    echo "❌ Backup failed"
    exit 1
fi
```

#### 设置定时备份
```bash
# 编辑 crontab
crontab -e

# 添加每日备份（每天凌晨 3 点）
0 3 * * * cd /path/to/publish-obsidian-plugin && ./backup.sh >> backup.log 2>&1
```

### 备份恢复
```bash
# 停止服务
docker-compose down

# 恢复备份
tar -xzf backups/backup-YYYYMMDD-HHMMSS.tar.gz

# 重启服务
docker-compose up -d

# 验证恢复
curl https://your-domain.com/health
```

## 🛠️ 故障排除

### 常见问题和解决方案

#### 1. 容器启动失败

**症状**: `docker-compose up -d` 失败
```bash
# 查看详细错误
docker-compose logs app

# 常见原因和解决方案
```

**解决方案**:
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 检查文件权限
ls -la server/database server/logs

# 修复权限
sudo chown -R 1001:1001 server/database server/logs
```

#### 2. SSL 证书问题

**症状**: HTTPS 访问失败
```bash
# 检查证书状态
docker-compose logs certbot

# 检查 Nginx 配置
docker-compose exec nginx nginx -t
```

**解决方案**:
```bash
# 重新申请证书
docker-compose down
docker-compose --profile ssl-init up certbot
docker-compose up -d

# 检查域名解析
nslookup your-domain.com
dig your-domain.com
```

#### 3. 数据库连接错误

**症状**: API 返回 500 错误
```bash
# 检查数据库文件
ls -la server/database/posts.db

# 查看应用日志
docker-compose logs app | grep -i database
```

**解决方案**:
```bash
# 检查数据库文件权限
chmod 644 server/database/posts.db

# 重新初始化数据库
rm server/database/posts.db
docker-compose restart app
```

#### 4. 内存不足

**症状**: 容器被 OOM killer 终止
```bash
# 检查内存使用
free -h
docker stats

# 查看系统日志
sudo journalctl -u docker.service | grep -i oom
```

**解决方案**:
```bash
# 增加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久启用 swap
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 5. 磁盘空间不足

**症状**: 容器无法写入数据
```bash
# 检查磁盘使用
df -h

# 清理 Docker 资源
docker system df
docker system prune -a
```

**解决方案**:
```bash
# 清理日志文件
sudo find /var/log -type f -name "*.log" -exec truncate -s 0 {} \;

# 清理旧的 Docker 镜像
docker image prune -a

# 设置日志轮转
sudo nano /etc/logrotate.d/obsidian-publisher
```

### 调试工具

#### 诊断脚本
创建 `diagnose.sh`：
```bash
#!/bin/bash
echo "🔍 System Diagnostics"
echo "===================="

echo "📊 System Resources:"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk: $(df -h / | awk '/\// {print $3 "/" $2 " (" $5 " used)"}')"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"

echo -e "\n🐳 Docker Status:"
docker --version
docker-compose --version
docker system df

echo -e "\n📦 Container Status:"
docker-compose ps

echo -e "\n🌐 Network Connectivity:"
curl -I https://google.com
curl -I https://$(grep DOMAIN .env | cut -d'=' -f2)

echo -e "\n📋 Recent Errors:"
docker-compose logs --tail=10 app | grep -i error
```

## ⚡ 性能优化

### Nginx 优化

#### 编辑 `server/nginx/nginx.conf`
```nginx
# 在 http 块中添加
client_max_body_size 5M;
client_body_timeout 60s;
client_header_timeout 60s;

# 启用 Brotli 压缩（如果支持）
# brotli on;
# brotli_comp_level 6;

# 缓存静态资源
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 数据库优化

#### SQLite 优化设置
在 `server/src/models/database.ts` 中添加：
```typescript
// 添加 SQLite 优化设置
this.db.run('PRAGMA journal_mode = WAL');
this.db.run('PRAGMA synchronous = NORMAL');
this.db.run('PRAGMA cache_size = 1000');
this.db.run('PRAGMA temp_store = memory');
```

### 监控设置

#### 添加 Prometheus 监控（可选）
创建 `docker-compose.monitoring.yml`：
```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

## 🔗 相关资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)
- [Nginx 配置指南](https://nginx.org/en/docs/)
- [项目 GitHub 仓库](https://github.com/ilovethw3/publish-obsidian-plugin)

## 🆘 获取帮助

如果遇到问题：
1. 查看 [故障排除](#故障排除) 部分
2. 检查项目 [Issues](https://github.com/ilovethw3/publish-obsidian-plugin/issues)
3. 运行诊断脚本：`./diagnose.sh`
4. 提供详细的错误日志和系统信息

---

**注意**: 部署前请确保已仔细阅读并理解所有配置选项。生产环境部署建议先在测试环境中验证。