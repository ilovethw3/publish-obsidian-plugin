# Obsidian Publishing System - Deployment Guide

This document provides a comprehensive guide for deploying the Obsidian Publishing System to a production environment. It covers everything from initial server setup to ongoing maintenance and troubleshooting.

## Table of Contents

1. [System Requirements & Prerequisites](#1-system-requirements--prerequisites)
2. [Quick Deployment Guide](#2-quick-deployment-guide)
3. [Manual Step-by-Step Deployment](#3-manual-step-by-step-deployment)
4. [Docker Architecture Details](#4-docker-architecture-details)
5. [Nginx Configuration](#5-nginx-configuration)
6. [SSL Certificate Management](#6-ssl-certificate-management)
7. [Service Management](#7-service-management)
8. [Database Management](#8-database-management)
9. [Monitoring & Maintenance](#9-monitoring--maintenance)
10. [Troubleshooting Guide](#10-troubleshooting-guide)
11. [Security Considerations](#11-security-considerations)
12. [Performance Optimization](#12-performance-optimization)

---

## 1. System Requirements & Prerequisites

### Infrastructure

* **Virtual Private Server (VPS)**: A fresh VPS running a modern Linux distribution.
  * **Recommended OS**: Ubuntu 22.04 LTS
  * **Minimum Specs**: 1 vCPU, 1 GB RAM, 25 GB SSD Storage. This is sufficient for moderate traffic.
* **Domain Name**: A registered domain name (e.g., `your-notes.com`).
* **DNS Configuration**: An **A record** (and optionally an AAAA record for IPv6) pointing your domain to the public IP address of your VPS.

### Software

* **Docker**: The containerization platform.
* **Docker Compose**: The tool for defining and running multi-container Docker applications.
* **Git**: For cloning the application repository.

---

## 2. Quick Deployment Guide

This section is for experienced users familiar with Docker-based deployments.

1. **Clone the Repository**
   ```bash
   git clone <repository_url>
   cd obsidian-publishing-system
   ```

2. **Configure Environment**
   Create a `.env` file from the example and customize it with your domain and SSL settings.
   ```bash
   cp .env.example .env
   nano .env
   ```
   ```ini
   # .env
   DOMAIN=your-notes.com
   LETSENCRYPT_EMAIL=your-email@example.com
   CORS_ORIGIN=https://your-notes.com
   NODE_ENV=production
   VERSION=latest  # Optional: specify Docker image version
   ```

3. **Initialize Database & Deploy**
   Set up the database directory with correct permissions and deploy the system.
   ```bash
   # Ensure the database directory exists with correct permissions
   mkdir -p ./server/database
   touch ./server/database/posts.db
   sudo chown -R 1001:1001 ./server/database

   # Deploy with pre-built images (recommended for production)
   ./deploy.sh deploy-prod
   
   # Or use smart deployment (tries pre-built, falls back to source)
   ./deploy.sh deploy
   ```

Your system should now be live at `https://your-notes.com`.

---

## 3. Manual Step-by-Step Deployment

This detailed guide walks through every step of the deployment process.

### Step 1: VPS Setup

1. Connect to your new VPS via SSH.
2. Update the system's package list and upgrade existing packages.
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

### Step 2: Install Docker and Docker Compose

Follow the official Docker documentation to install the Docker Engine and Docker Compose plugin.

```bash
# Add Docker's official GPG key:
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install Docker packages:
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Add current user to docker group
sudo usermod -aG docker $USER
```

Log out and log back in for the group changes to take effect.

### Step 3: Clone and Configure the Application

1. Clone the repository and navigate into the project directory.
   ```bash
   git clone <repository_url>
   cd obsidian-publishing-system
   ```

2. Create and edit the `.env` file.
   ```bash
   cp .env.example .env
   nano .env
   ```
   Fill in the required values:
   * `DOMAIN`: Your fully qualified domain name.
   * `LETSENCRYPT_EMAIL`: The email address for Let's Encrypt notifications.
   * `CORS_ORIGIN`: Your domain URL for CORS configuration.
   * `NODE_ENV`: Set to `production` for production deployment.

### Step 4: Initialize Database and Permissions

The application container runs under a non-root user (UID 1001). You must create the database file and set its ownership correctly on the host machine.

```bash
# Create directories for persistent data
mkdir -p ./server/database
mkdir -p ./deployment/certbot/conf
mkdir -p ./deployment/certbot/www

# Create the empty database file
touch ./server/database/posts.db

# Set correct ownership for the app container
sudo chown -R 1001:1001 ./server/database
```

> **CRITICAL:** Failure to set the correct permissions will result in the application failing to start, with "permission denied" errors when trying to access the SQLite database.

### Step 5: Configure Firewall

Configure the firewall to allow HTTP, HTTPS, and SSH traffic.

```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### Step 6: Launch the System

With the configuration in place, you can now launch the entire application stack.

```bash
# Run the deployment script
./deploy.sh
```

This will:
1. Build the application images
2. Start all services (app, nginx, certbot)
3. Obtain SSL certificates from Let's Encrypt
4. Set up automatic certificate renewal

Verify that all services are running:
```bash
docker-compose ps
```

---

## 4. Docker Architecture Details

The system is orchestrated using Docker Compose and consists of three main services.

* **`app`**: The core Express.js application server. It handles all API logic, interacts with the SQLite database, and serves content. It listens on port 3000 within the Docker network.
* **`nginx`**: A high-performance Nginx reverse proxy. It faces the public internet, terminates SSL, serves cached content, and forwards API requests to the `app` service.
* **`certbot`**: A service dedicated to managing Let's Encrypt SSL certificates. It runs periodically to ensure certificates are automatically renewed before they expire.

### Volume Mapping

Data persistence is achieved by mapping host directories into the containers:
* `./server/database:/usr/src/app/database`: Persists the SQLite database file, ensuring no data is lost when the `app` container is recreated.
* `./deployment/certbot/conf:/etc/letsencrypt`: Persists the SSL certificates and Let's Encrypt account information.
* `./deployment/certbot/www:/var/www/certbot`: Used by Certbot for HTTP-01 challenge verification.
* `./deployment/nginx.conf:/etc/nginx/nginx.conf`: Mounts the Nginx configuration file into the container.

### Network Configuration

All services are connected to a shared Docker bridge network, allowing them to communicate with each other using their service names as hostnames (e.g., `nginx` can proxy requests to `http://app:3000`).

### Environment Variables

* `DOMAIN`: Used by Nginx and Certbot to configure the correct server name and request the right SSL certificate.
* `LETSENCRYPT_EMAIL`: Used by Certbot for registration and renewal notices.
* `CORS_ORIGIN`: Used by the `app` service to set the `Access-Control-Allow-Origin` header.
* `NODE_ENV`: Sets the application environment (production/development).

### Deployment Strategies

The system supports three deployment strategies:

#### 1. Smart Deployment (Default)
```bash
./deploy.sh deploy
```
- First attempts to pull pre-built Docker images from the registry
- Falls back to building from source if images are unavailable
- Ideal for automated deployments and CI/CD pipelines

#### 2. Production Deployment (Pre-built Images)
```bash
./deploy.sh deploy-prod
```
- Uses pre-compiled Docker images from the registry
- Faster deployment with guaranteed image consistency
- Recommended for production environments
- Requires internet connection to pull images

#### 3. Development Deployment (Build from Source)
```bash
./deploy.sh deploy-dev
```
- Builds Docker images locally from source code
- Useful for custom modifications or air-gapped environments
- Takes longer due to compilation step
- Uses different port (8080) to avoid conflicts

#### Image Management Commands
```bash
# Pull latest image without deploying
./deploy.sh pull

# Upgrade to specific version
VERSION=v1.2.3 ./deploy.sh upgrade

# View current deployment status
./deploy.sh status

# Create database backup
./deploy.sh backup

# Rollback to previous backup
./deploy.sh rollback ./backups/backup-20250131-120000.tar.gz
```

---

## 5. Nginx Configuration

The `deployment/nginx.conf` file is central to the system's security, performance, and functionality.

### Key Configuration Points

A sample server block configuration:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Redirect all HTTP traffic to HTTPS
    server {
        listen 80;
        server_name your-notes.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server block
    server {
        listen 443 ssl http2;
        server_name your-notes.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/your-notes.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-notes.com/privkey.pem;
        
        # SSL Settings
        ssl_session_cache shared:le_nginx_SSL:10m;
        ssl_session_timeout 1440m;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

        # CRITICAL: Set client max body size
        # Prevents "413 Payload Too Large" errors for large notes.
        client_max_body_size 25M;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";
        add_header X-XSS-Protection "1; mode=block";

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeout settings for long-running requests
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
```

### `client_max_body_size`

> **CRITICAL:** The `client_max_body_size 25M;` directive is essential. Obsidian notes can contain embedded images and attachments, leading to large request bodies. The default Nginx limit (1M) is too small and will cause `413 Payload Too Large` errors, preventing users from publishing or updating notes. This value should be set to accommodate your largest expected note size.

---

## 6. SSL Certificate Management

SSL is managed by Certbot in a dedicated container.

* **Initial Setup**: The deployment script handles the first-time certificate issuance. It requires port 80 to be open to the internet.
* **Automatic Renewal**: The `certbot` service is configured with a cron job to check for renewal daily and renew certificates when they're within 30 days of expiration.

### Manual Certificate Operations

```bash
# Check certificate status
docker-compose exec certbot certbot certificates

# Test renewal (dry run)
docker-compose exec certbot certbot renew --dry-run

# Force renewal
docker-compose exec certbot certbot renew --force-renewal

# View certbot logs
docker-compose logs certbot
```

### Troubleshooting SSL Issues

* **Renewal Fails**: Check the Certbot logs with `docker-compose logs certbot`. The most common issue is that port 80 is not accessible from the public internet (e.g., blocked by a firewall).
* **Invalid Certificate**: Ensure your domain's A record is correctly pointing to your server's IP address.
* **Certificate Not Found**: If you get SSL errors, ensure the certificate was created successfully during initial deployment.

---

## 7. Service Management

Use `docker-compose` commands from within the project directory to manage the application stack.

### Basic Operations

* **Start Services**: `docker-compose up -d`
* **Stop Services**: `docker-compose down`
* **Restart Services**: `docker-compose restart` 
* **Restart Specific Service**: `docker-compose restart app`
* **View Service Status**: `docker-compose ps`
* **View Logs**: `docker-compose logs -f`
* **View Specific Service Logs**: `docker-compose logs -f app`

### Health Checks

The application exposes a health check endpoint at `/health`. You can verify the system's status:

```bash
# From the host server
curl http://localhost:3000/health

# From the public internet
curl https://your-notes.com/health
```

A successful response will be a JSON object like `{"status":"ok","timestamp":"2025-07-30T10:00:00.000Z"}`.

### Application Updates

To update the application to the latest version:

1. **Pull the latest code from the Git repository:**
   ```bash
   git pull origin main
   ```

2. **Rebuild the application image:**
   ```bash
   docker-compose build --no-cache app
   ```

3. **Restart the services:**
   ```bash
   docker-compose up -d
   ```

4. **Verify the update:**
   ```bash
   curl https://your-notes.com/health
   docker-compose logs app
   ```

### Rolling Back Updates

If an update causes issues:

1. **Revert to the previous Git commit:**
   ```bash
   git log --oneline  # Find the commit hash
   git checkout <previous-commit-hash>
   ```

2. **Rebuild and restart:**
   ```bash
   docker-compose build --no-cache app
   docker-compose up -d
   ```

---

## 8. Database Management

The system uses a single SQLite database file for all data.

* **Location**: The database file is located at `./server/database/posts.db` on the host machine.
* **Permissions**: The file and its parent directory must be owned by user and group `1001`.

### Backup and Restore

#### Automated Backup

Create a backup script for regular automated backups:

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/home/backup/obsidian-publisher"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/path/to/your/obsidian-publishing-system"

# Create backup directory
mkdir -p $BACKUP_DIR

# Stop the app to ensure consistent backup
cd $APP_DIR
docker-compose stop app

# Create compressed backup
tar -czvf "$BACKUP_DIR/database-backup-$DATE.tar.gz" -C ./server database/

# Restart the app
docker-compose start app

# Keep only last 7 days of backups
find $BACKUP_DIR -name "database-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: database-backup-$DATE.tar.gz"
```

Make it executable and add to crontab:
```bash
chmod +x backup-db.sh
crontab -e
# Add: 0 2 * * * /path/to/backup-db.sh
```

#### Manual Backup

1. **Stop the application** (recommended for consistency):
   ```bash
   docker-compose stop app
   ```

2. **Create backup:**
   ```bash
   tar -czvf backup-$(date +%Y%m%d_%H%M%S).tar.gz ./server/database/
   ```

3. **Restart the application:**
   ```bash
   docker-compose start app
   ```

#### Restore from Backup

1. **Stop the application:**
   ```bash
   docker-compose stop app
   ```

2. **Restore the database:**
   ```bash
   # Extract backup
   tar -xzvf backup-YYYYMMDD_HHMMSS.tar.gz
   
   # Restore permissions
   sudo chown -R 1001:1001 ./server/database/
   ```

3. **Start the application:**
   ```bash
   docker-compose start app
   ```

### Database Maintenance

#### Check Database Size
```bash
du -sh ./server/database/posts.db
```

#### SQLite Maintenance Commands
```bash
# Connect to database (requires sqlite3 installed)
sqlite3 ./server/database/posts.db

# Inside SQLite prompt:
.schema                    # View table structure
SELECT COUNT(*) FROM posts;  # Count total posts
.quit                      # Exit

# Vacuum database to reclaim space
sqlite3 ./server/database/posts.db "VACUUM;"
```

---

## 9. Monitoring & Maintenance

### Log Monitoring

**Application Logs:**
```bash
# Real-time application logs
docker-compose logs -f app

# Error logs only
docker-compose logs app | grep ERROR

# Last 100 lines
docker-compose logs --tail=100 app
```

**Nginx Logs:**
```bash
# Nginx access and error logs
docker-compose logs -f nginx

# Check for 4xx/5xx errors
docker-compose logs nginx | grep -E " [45][0-9][0-9] "
```

### Health Monitoring

**Health Endpoint Integration:**
Set up external monitoring (UptimeRobot, Pingdom, etc.) to check:
- `https://your-notes.com/health` - Application health
- `https://your-notes.com/` - General connectivity

**Resource Monitoring:**
```bash
# Container resource usage
docker stats

# System resource usage
htop
df -h  # Check disk space
free -h  # Check memory usage
```

### Log Rotation

Configure Docker log rotation to prevent disk space issues:

```bash
# Create or edit /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker daemon:
```bash
sudo systemctl restart docker
```

### Maintenance Tasks

**Weekly:**
- Check application health and logs
- Verify SSL certificate status
- Monitor disk space usage

**Monthly:**
- Update system packages: `sudo apt update && sudo apt upgrade -y`
- Review and rotate log files
- Test backup and restore procedures

**Quarterly:**
- Review security settings
- Update Docker images: `docker-compose pull && docker-compose up -d`
- Performance review and optimization

---

## 10. Troubleshooting Guide

### Common Issues and Solutions

#### Error: `413 Payload Too Large`
**Cause:** The note being published is larger than Nginx's configured limit.
**Solution:** 
1. Increase the `client_max_body_size` value in `deployment/nginx.conf`
2. Restart Nginx: `docker-compose restart nginx`

#### Error: `502 Bad Gateway`
**Cause:** The `app` service is down, restarting, or has crashed.
**Solution:**
1. Check application logs: `docker-compose logs app`
2. Check if app container is running: `docker-compose ps`
3. Restart app service: `docker-compose restart app`

#### Error: Database "Permission Denied"
**Cause:** Incorrect file permissions on the SQLite database file.
**Solution:**
```bash
docker-compose down
sudo chown -R 1001:1001 ./server/database/
docker-compose up -d
```

#### Error: CORS Issue / Plugin Cannot Connect
**Cause:** CORS misconfiguration or network connectivity issues.
**Solution:**
1. Check CORS configuration in the app
2. Verify Obsidian plugin settings
3. Test API endpoints directly: `curl -X POST https://your-notes.com/posts -H "Content-Type: application/json" -d '{"title":"test","content":"test"}'`

#### Error: SSL Certificate Issues
**Cause:** Certificate generation or renewal failed.
**Solution:**
1. Check Certbot logs: `docker-compose logs certbot`
2. Verify DNS settings: `nslookup your-notes.com`
3. Test certificate manually: `docker-compose exec certbot certbot certificates`
4. If needed, regenerate certificate: `docker-compose exec certbot certbot delete --cert-name your-notes.com` then restart deployment

#### Error: Container Won't Start
**Cause:** Configuration issues, port conflicts, or resource constraints.
**Solution:**
1. Check detailed logs: `docker-compose logs <service-name>`
2. Verify configuration files
3. Check port availability: `netstat -tulpn | grep :80`
4. Check system resources: `df -h && free -h`

### Performance Issues

#### High Memory Usage
```bash
# Check container memory usage
docker stats --no-stream

# If app container is using too much memory:
docker-compose restart app

# Check for memory leaks in application logs
docker-compose logs app | grep -i memory
```

#### Slow Response Times
```bash
# Check if caching is working
curl -I https://your-notes.com/some-post-id

# Monitor database size
du -sh ./server/database/posts.db

# Check if database needs optimization
sqlite3 ./server/database/posts.db "VACUUM;"
```

#### High CPU Usage
```bash
# Check what's consuming CPU
docker stats

# Check system load
uptime
htop
```

### Network Connectivity Issues

#### Can't Access from Internet
1. **Check firewall:** `sudo ufw status`
2. **Check nginx status:** `docker-compose ps nginx`
3. **Check DNS:** `nslookup your-notes.com`
4. **Check SSL:** `openssl s_client -connect your-notes.com:443`

#### Internal Container Communication Issues
```bash
# Test internal connectivity
docker-compose exec nginx ping app
docker-compose exec app ping nginx

# Check Docker network
docker network ls
docker network inspect <network-name>
```

---

## 11. Security Considerations

### Host Security

**Firewall Configuration:**
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

**SSH Hardening:**
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# Port 2222  # Change from default 22

sudo systemctl reload sshd
```

**System Updates:**
```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Application Security

**Environment Variables:**
- Never commit `.env` files to version control
- Use strong, random values for secrets
- Regularly rotate secrets if compromised

**Database Security:**
- Database file is not web-accessible (stored outside web root)
- Uses UUID secrets for post authentication
- Input validation on all API endpoints

**Network Security:**
- All traffic encrypted with SSL/TLS
- CORS properly configured for Obsidian app origins
- Security headers configured in Nginx
- Rate limiting implemented (if configured)

### Backup Security

**Encrypt Backups:**
```bash
# Create encrypted backup
tar -czvf - ./server/database/ | gpg --symmetric --cipher-algo AES256 --output backup-$(date +%Y%m%d).tar.gz.gpg

# Restore encrypted backup
gpg --decrypt backup-YYYYMMDD.tar.gz.gpg | tar -xzv
```

**Secure Storage:**
- Store backups off-site (different physical location)
- Use encrypted storage services
- Regularly test backup restoration
- Implement backup retention policies

### Monitoring and Alerting

**Log Monitoring:**
```bash
# Monitor for suspicious activity
docker-compose logs nginx | grep -E " [45][0-9][0-9] " | tail -20

# Monitor for repeated failed requests
docker-compose logs nginx | grep "POST\|PUT\|DELETE" | grep -E " [45][0-9][0-9] "
```

**Set up log shipping** to external services like:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Datadog
- New Relic

---

## 12. Performance Optimization

### Caching Strategy

The application uses `node-cache` for in-memory caching of rendered posts:
- Cache TTL: Configurable (default 15 minutes)
- Cache invalidation: Automatic on post updates/deletes
- Cache hit ratio: Monitor via application logs

### Resource Optimization

**Container Resource Limits:**
```yaml
# In docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

**Nginx Optimization:**
```nginx
# In nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

# Enable caching for static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Optimization

**Regular Maintenance:**
```bash
# Vacuum database monthly
sqlite3 ./server/database/posts.db "VACUUM;"

# Analyze query performance
sqlite3 ./server/database/posts.db "EXPLAIN QUERY PLAN SELECT * FROM posts WHERE id = 'test';"

# Check database statistics
sqlite3 ./server/database/posts.db ".dbinfo"
```

**Monitoring Database Growth:**
```bash
# Track database size over time
echo "$(date): $(du -sh ./server/database/posts.db)" >> db-size.log

# Monitor post count
sqlite3 ./server/database/posts.db "SELECT COUNT(*) FROM posts;" >> post-count.log
```

### Scaling Considerations

**Vertical Scaling (Single Server):**
- Increase VPS resources (CPU, RAM, storage)
- Optimize database queries and indexing
- Implement connection pooling
- Use Redis for external caching

**Horizontal Scaling (Multiple Servers):**
- Use external database (PostgreSQL/MySQL)
- Implement session stickiness or external session storage
- Use load balancer (Nginx, HAProxy, Cloudflare)
- Implement distributed caching (Redis Cluster)

### Monitoring Performance

**Application Metrics:**
```bash
# Monitor response times
curl -w "Connect: %{time_connect} TTFB: %{time_starttransfer} Total: %{time_total}\n" -o /dev/null -s https://your-notes.com/health

# Monitor cache performance (check application logs)
docker-compose logs app | grep -i cache
```

**System Metrics:**
```bash
# I/O monitoring
iostat -x 1

# Network monitoring
iftop

# Process monitoring
htop -p $(pgrep -f "node\|nginx")
```

---

This deployment guide provides comprehensive coverage of all aspects needed to successfully deploy and maintain the Obsidian Publishing System in a production environment. Regular review and updates of this documentation will ensure it remains current with system changes and operational experience.