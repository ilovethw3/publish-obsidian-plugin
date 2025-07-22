# Deployment Guide

This guide covers deploying the Obsidian Publishing System using Docker on a VPS.

## Prerequisites

- VPS with Ubuntu 20.04+ (2GB RAM, 1 CPU minimum)
- Domain name pointing to your VPS IP
- Docker and Docker Compose installed
- Basic command line knowledge

## Quick Deployment

1. **Clone and Setup**
   ```bash
   git clone <your-repo-url>
   cd publish-obsidian-plugin
   
   # Copy environment file and configure
   cp .env.example .env
   nano .env
   ```

2. **Configure Environment**
   Update `.env` with your settings:
   ```env
   DOMAIN=your-domain.com
   SSL_EMAIL=your-email@domain.com
   CORS_ORIGIN=https://your-domain.com
   ```

3. **Deploy**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Manual Deployment Steps

### 1. VPS Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Logout and login again for group changes
```

### 2. DNS Configuration

Point your domain to your VPS IP:
- A record: `your-domain.com` → `YOUR_VPS_IP`
- A record: `www.your-domain.com` → `YOUR_VPS_IP` (optional)

### 3. Firewall Configuration

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 4. Deploy Application

```bash
# Clone repository
git clone <your-repo-url>
cd publish-obsidian-plugin

# Set up environment
cp .env.example .env
nano .env  # Configure your settings

# Deploy
./deploy.sh
```

## SSL Certificate Setup

The deployment script automatically handles SSL certificates using Let's Encrypt:

```bash
# Initial setup (done automatically in deploy.sh)
./deploy.sh ssl-setup

# Manual renewal (automatic via cron recommended)
./deploy.sh ssl-renew
```

### Automatic SSL Renewal

Add to crontab for automatic renewal:
```bash
crontab -e

# Add this line for weekly renewal checks
0 2 * * 0 cd /path/to/your/app && ./ssl-renew.sh >> ssl-renewal.log 2>&1
```

## Service Management

### Check Status
```bash
# View container status
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f nginx
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app
docker-compose restart nginx
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Database Management

### Backup Database
```bash
# Create backup
./deploy.sh backup

# Manual backup
tar -czf backup-$(date +%Y%m%d).tar.gz server/database/
```

### Restore Database
```bash
# Stop services
docker-compose down

# Restore from backup
tar -xzf backup-YYYYMMDD.tar.gz

# Start services
docker-compose up -d
```

## Monitoring

### Health Checks
```bash
# Check application health
curl https://your-domain.com/health

# Check all services
./deploy.sh status
```

### Log Monitoring
```bash
# Follow logs in real-time
docker-compose logs -f --tail=100

# Check error logs
docker-compose logs app | grep ERROR
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   docker-compose logs certbot
   
   # Manually renew
   ./deploy.sh ssl-renew
   ```

2. **Application Won't Start**
   ```bash
   # Check logs
   docker-compose logs app
   
   # Check database permissions
   ls -la server/database/
   ```

3. **Database Connection Issues**
   ```bash
   # Check database file
   ls -la server/database/posts.db
   
   # Reset database (WARNING: deletes all data)
   rm server/database/posts.db
   docker-compose restart app
   ```

4. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER server/database server/logs
   chmod 755 server/database server/logs
   ```

### Performance Optimization

1. **Enable Log Rotation**
   ```bash
   # Create logrotate config
   sudo nano /etc/logrotate.d/obsidian-publisher
   
   # Add content:
   /path/to/app/server/logs/*.log {
       daily
       rotate 7
       compress
       delaycompress
       missingok
       notifempty
       create 0644 1001 1001
   }
   ```

2. **Monitor Resource Usage**
   ```bash
   # Monitor containers
   docker stats
   
   # Monitor system resources
   htop
   ```

## Security Considerations

1. **Regular Updates**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade
   
   # Update Docker images
   docker-compose pull
   docker-compose up -d
   ```

2. **Backup Strategy**
   - Automated daily backups
   - Off-site backup storage
   - Regular restore testing

3. **Monitoring**
   - Set up log monitoring
   - Configure alerting for critical errors
   - Regular security audits

## Support

For issues and support:
1. Check application logs: `docker-compose logs app`
2. Review this documentation
3. Check GitHub issues
4. Contact system administrator

## Production Checklist

- [ ] Domain configured and pointing to VPS
- [ ] SSL certificates installed and working
- [ ] Firewall properly configured
- [ ] Database backups configured
- [ ] Log rotation set up
- [ ] Monitoring in place
- [ ] Documentation updated
- [ ] SSL renewal automation configured