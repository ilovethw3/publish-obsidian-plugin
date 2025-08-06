#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_NAME="obsidian-publisher-server"
BUILD_DIR="./build"
TEMP_DIR="$BUILD_DIR/temp"
PACKAGE_DIR="$TEMP_DIR/$PACKAGE_NAME"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Clean up function
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Function to create directory structure
create_structure() {
    log_info "Creating package directory structure..."
    
    mkdir -p "$PACKAGE_DIR"
    mkdir -p "$PACKAGE_DIR/server/nginx"
    mkdir -p "$PACKAGE_DIR/server/database"
    mkdir -p "$PACKAGE_DIR/server/logs"
    mkdir -p "$PACKAGE_DIR/shared"
    
    # Set proper permissions for database and logs directories
    chmod 755 "$PACKAGE_DIR/server/database"
    chmod 755 "$PACKAGE_DIR/server/logs"
}

# Function to copy core files
copy_core_files() {
    log_info "Copying core deployment files..."
    
    # Copy deployment scripts
    cp deploy.sh "$PACKAGE_DIR/"
    chmod +x "$PACKAGE_DIR/deploy.sh"
    
    # Copy Docker configuration files
    cp docker-compose.yml "$PACKAGE_DIR/"
    # docker-compose.prod.yml no longer needed - using unified config
    
    # Copy nginx configurations
    cp server/nginx/nginx-cloudflare.conf "$PACKAGE_DIR/server/nginx/"
    
    # Copy shared types
    cp shared/types.ts "$PACKAGE_DIR/shared/"
    
    # Copy documentation
    if [ -f "README.md" ]; then
        cp README.md "$PACKAGE_DIR/"
    fi
    
    if [ -f "DEPLOYMENT.md" ]; then
        cp DEPLOYMENT.md "$PACKAGE_DIR/"
    fi
}

# Function to create environment template
create_env_template() {
    log_info "Creating .env.example template..."
    
    cat > "$PACKAGE_DIR/.env.example" << 'EOF'
# Obsidian Publishing System - Environment Configuration
# 
# IMPORTANT: Copy this file to .env and configure your values
# cp .env.example .env

# =============================================================================
# API AUTHENTICATION (REQUIRED)
# =============================================================================

# API Token for authentication - MUST be at least 32 characters
# Generate a secure token: openssl rand -base64 32
API_TOKEN=CHANGE_THIS_TO_A_SECURE_32_CHAR_TOKEN

# Optional: Description for the API token
API_TOKEN_DESCRIPTION="Production API access for Obsidian Publishing"

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================

# Application environment (production/development)
NODE_ENV=production

# Port for the Express server (internal container port)
PORT=3000

# Database file path (inside container - do not change)
DB_PATH=/app/data/posts.db

# =============================================================================
# CORS CONFIGURATION
# =============================================================================

# CORS origin - your domain where the service is hosted
# IMPORTANT: Change this to your actual domain
CORS_ORIGIN=https://your-domain.com

# =============================================================================
# DEPLOYMENT CONFIGURATION
# =============================================================================

# Your domain name (used by deployment scripts)
# IMPORTANT: Change this to your actual domain
DOMAIN=your-domain.com

# Email for notifications (optional)
SSL_EMAIL=admin@your-domain.com

# Docker image version (latest, or specific version like v1.2.3)
VERSION=latest

# =============================================================================
# ADVANCED CONFIGURATION (Optional)
# =============================================================================

# Rate limiting (requests per second)
# RATE_LIMIT_API=10
# RATE_LIMIT_STATIC=1

# Log level (error, warn, info, debug)
# LOG_LEVEL=info

# Maximum request body size
# MAX_REQUEST_SIZE=1mb
EOF
}

# Function to create installation documentation
create_install_docs() {
    log_info "Creating installation documentation..."
    
    cat > "$PACKAGE_DIR/INSTALL.md" << 'EOF'
# Obsidian Publisher Server - Installation Guide

## System Requirements

- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later (or docker-compose v1.29+)
- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+, etc.)
- **RAM**: Minimum 512MB, Recommended 1GB+
- **Disk Space**: Minimum 1GB free space
- **Network**: Port 80 must be available (or configure different port)

## Quick Installation

1. **Extract the package:**
   ```bash
   unzip obsidian-publisher-server.zip
   cd obsidian-publisher-server
   ```

2. **Configure environment:**
   ```bash
   # Copy and edit the environment file
   cp .env.example .env
   nano .env  # or use your preferred editor
   ```

3. **Configure your domain and API token:**
   ```bash
   # In .env file, set:
   DOMAIN=your-domain.com
   CORS_ORIGIN=https://your-domain.com
   API_TOKEN=$(openssl rand -base64 32)
   ```

4. **Deploy the service:**
   ```bash
   # For production deployment
   ./deploy.sh deploy-prod
   
   # For development deployment
   ./deploy.sh deploy-dev
   ```

5. **Verify installation:**
   ```bash
   # Check service status
   ./deploy.sh status
   
   # Test health endpoint
   curl http://localhost/health
   ```

## Detailed Configuration

### Environment Variables

Edit `.env` file with your specific configuration:

- **API_TOKEN**: Generate with `openssl rand -base64 32`
- **DOMAIN**: Your domain name (e.g., example.com)
- **CORS_ORIGIN**: Full URL with protocol (e.g., https://example.com)
- **NODE_ENV**: Set to `production` for production use

### SSL/HTTPS Setup

This package is configured for use with Cloudflare or similar proxy services that handle SSL termination. The container runs on HTTP (port 80) and expects the proxy to handle HTTPS.

If you're not using a proxy service, you'll need to modify the nginx configuration.

### Custom Nginx Configuration

The package includes several nginx configurations:

- `nginx-cloudflare.conf`: Unified nginx configuration optimized for Cloudflare

## Deployment Commands

```bash
# Start production deployment
./deploy.sh deploy-prod

# Start development deployment
./deploy.sh deploy-dev

# Show service status
./deploy.sh status

# View logs
./deploy.sh logs

# Restart services
./deploy.sh restart

# Stop services
./deploy.sh stop

# Create backup
./deploy.sh backup

# Show help
./deploy.sh help
```

## Troubleshooting

### Common Issues

1. **Port 80 already in use:**
   ```bash
   # Check what's using port 80
   sudo netstat -tlnp | grep :80
   
   # Stop conflicting service (e.g., apache)
   sudo systemctl stop apache2
   ```

2. **Docker permission denied:**
   ```bash
   # Add user to docker group
   sudo usermod -aG docker $USER
   # Logout and login again, or:
   newgrp docker
   ```

3. **Database permission errors:**
   ```bash
   # Fix database directory permissions
   sudo chown -R 1001:1001 ./server/database
   ```

4. **API token too short:**
   - API_TOKEN must be at least 32 characters
   - Generate with: `openssl rand -base64 32`

### Health Check

After deployment, verify the service is working:

```bash
# Basic health check
curl http://localhost/health

# Test API endpoint (requires valid API token)
curl -X POST http://localhost/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"title":"Test","content":"# Test Post"}'
```

### Log Files

Check logs for troubleshooting:

```bash
# View all logs
./deploy.sh logs

# View specific service logs
docker-compose logs app
docker-compose logs nginx

# Follow logs in real-time
docker-compose logs -f
```

## Security Considerations

1. **Change default API token** before deployment
2. **Use HTTPS** in production (via proxy like Cloudflare)
3. **Restrict network access** to necessary ports only
4. **Regular backups** of database and configuration
5. **Monitor logs** for suspicious activity

## Updates

To update the service:

1. Download new version of the package
2. Extract to a new directory
3. Copy your `.env` file from old installation
4. Run deployment script
5. Verify everything works correctly

## Support

For issues and questions:
- Check logs: `./deploy.sh logs`
- Review configuration: `cat .env`
- Test connectivity: `curl http://localhost/health`

Remember to check the README.md and DEPLOYMENT.md files for additional information.
EOF
}

# Function to create optimized deploy script for package
create_package_deploy_script() {
    log_info "Creating optimized deploy script for package..."
    
    # First, let's backup the original
    cp "$PACKAGE_DIR/deploy.sh" "$PACKAGE_DIR/deploy.sh.original"
    
    # Create the new deploy script optimized for package deployment
    cat > "$PACKAGE_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${DOMAIN:-"localhost"}
SSL_EMAIL=${SSL_EMAIL:-"admin@localhost"}
BACKUP_DIR="./backups"
VERSION=${VERSION:-"latest"}
DOCKER_IMAGE="candy0327/obsidian-publisher-server"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required commands are available
check_dependencies() {
    log_info "Checking dependencies..."
    
    local deps=("docker")
    # Check docker compose availability
    if ! docker compose version &> /dev/null; then
        deps+=("docker-compose")
    fi
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        log_info "Installation guide:"
        log_info "  Docker: https://docs.docker.com/engine/install/"
        log_info "  Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Function to check environment configuration
check_environment() {
    log_info "Checking environment configuration..."
    
    if [ ! -f ".env" ]; then
        log_error ".env file not found!"
        log_info "Please create .env file from template:"
        log_info "  cp .env.example .env"
        log_info "  nano .env  # Edit with your configuration"
        exit 1
    fi
    
    # Source the .env file
    set -a
    source .env
    set +a
    
    # Check required variables
    local required_vars=("API_TOKEN" "DOMAIN" "CORS_ORIGIN")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [[ "${!var}" == *"CHANGE_THIS"* ]] || [[ "${!var}" == *"your-domain"* ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing or invalid environment variables: ${missing_vars[*]}"
        log_info "Please edit .env file and set proper values for:"
        for var in "${missing_vars[@]}"; do
            log_info "  $var"
        done
        exit 1
    fi
    
    # Check API token length
    if [ ${#API_TOKEN} -lt 32 ]; then
        log_error "API_TOKEN is too short (must be at least 32 characters)"
        log_info "Generate a secure token: openssl rand -base64 32"
        exit 1
    fi
    
    log_success "Environment configuration is valid"
}

# Function to run docker compose with fallback to docker-compose
docker_compose() {
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        docker compose "$@"
    elif command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    else
        log_error "Neither 'docker compose' nor 'docker-compose' is available"
        exit 1
    fi
}

# Function to create backup
create_backup() {
    if [ -d "./server/database" ] && [ "$(ls -A ./server/database 2>/dev/null)" ]; then
        log_info "Creating database backup..."
        
        mkdir -p "$BACKUP_DIR"
        local backup_file="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
        
        tar -czf "$backup_file" ./server/database/ ./server/logs/ 2>/dev/null || {
            log_warning "Backup creation failed, but continuing deployment..."
            return 0
        }
        
        log_success "Backup created: $backup_file"
        
        # Keep only the last 5 backups
        ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm --
        log_info "Old backups cleaned up"
    else
        log_info "No existing data to backup"
    fi
}

# Function to pull Docker image
pull_image() {
    log_info "Pulling Docker image: $DOCKER_IMAGE:$VERSION"
    
    if docker pull "$DOCKER_IMAGE:$VERSION"; then
        log_success "Successfully pulled image: $DOCKER_IMAGE:$VERSION"
        return 0
    else
        log_error "Failed to pull image: $DOCKER_IMAGE:$VERSION"
        log_warning "Will attempt to build from source instead..."
        return 1
    fi
}

# Function to setup directories and permissions
setup_directories() {
    log_info "Setting up directories and permissions..."
    
    # Create necessary directories
    mkdir -p ./server/database ./server/logs
    
    # Set correct permissions (1001:1001 is the nodejs user in the container)
    if command -v chown &> /dev/null; then
        if [ "$EUID" -eq 0 ]; then
            chown -R 1001:1001 ./server/database ./server/logs
        else
            # Try with sudo if available
            if command -v sudo &> /dev/null; then
                sudo chown -R 1001:1001 ./server/database ./server/logs 2>/dev/null || {
                    log_warning "Could not set ownership, you may need to run: sudo chown -R 1001:1001 ./server/database ./server/logs"
                }
            else
                log_warning "Cannot set proper ownership. If you encounter database errors, run: sudo chown -R 1001:1001 ./server/database ./server/logs"
            fi
        fi
    fi
    
    chmod 755 ./server/database ./server/logs
    
    log_success "Directories setup completed"
}

# Function to deploy the application
deploy_app() {
    log_info "🚀 Starting deployment of Obsidian Publishing System..."
    
    # Export environment variables for docker-compose
    export VERSION DOMAIN SSL_EMAIL NODE_ENV API_TOKEN CORS_ORIGIN
    
    # Setup directories
    setup_directories
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker_compose down --remove-orphans || true
    
    # Try to pull pre-built image, fallback to building from source if available
    if ! pull_image; then
        if [ -f "server/Dockerfile" ]; then
            log_info "Building from source..."
            docker_compose build --no-cache app || {
                log_error "Failed to build from source"
                exit 1
            }
            docker_compose up -d
        else
            log_error "Cannot pull image and no Dockerfile found for building"
            exit 1
        fi
    else
        log_info "Starting containers with pre-built image..."
        docker_compose up -d
    fi
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker_compose ps | grep -q "healthy\|Up"; then
            sleep 5  # Give it a bit more time to fully start
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Services failed to become healthy after $max_attempts attempts"
            log_info "Checking logs..."
            docker_compose logs --tail=50
            return 1
        fi
        
        log_info "Attempt $attempt/$max_attempts - Services not ready yet, waiting..."
        sleep 10
        ((attempt++))
    done
    
    log_success "Services are running!"
}

# Function to run health checks
health_check() {
    log_info "Running health checks..."
    
    local health_url="http://localhost/health"
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_url" &> /dev/null; then
            log_success "Health check passed!"
            
            # Show the health response
            log_info "Health endpoint response:"
            curl -s "$health_url" | jq . 2>/dev/null || curl -s "$health_url"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check failed after $max_attempts attempts"
            log_info "Checking application logs..."
            docker_compose logs app --tail=20
            return 1
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 5
        ((attempt++))
    done
}

# Function to show status
show_status() {
    log_info "🎯 Deployment Status:"
    echo ""
    
    log_info "Container Status:"
    docker_compose ps
    echo ""
    
    log_info "Application URLs:"
    echo "  • Health Check: http://$DOMAIN/health"
    echo "  • API Endpoint: http://$DOMAIN/"
    echo ""
    
    if [ "$DOMAIN" != "localhost" ]; then
        echo "  • External Health Check: https://$DOMAIN/health"
        echo "  • External API Endpoint: https://$DOMAIN/"
        echo ""
    fi
    
    log_info "Useful Commands:"
    echo "  • View logs: ./deploy.sh logs"
    echo "  • Restart services: ./deploy.sh restart"
    echo "  • Stop services: ./deploy.sh stop"
    echo "  • Create backup: ./deploy.sh backup"
}

# Main deployment function
main() {
    echo "🚀 Obsidian Publishing System Deployment Script"
    echo "================================================"
    
    # Check dependencies
    check_dependencies
    
    # Check environment configuration
    check_environment
    
    # Create backup of existing data
    create_backup
    
    # Deploy the application
    deploy_app
    
    # Run health checks
    if ! health_check; then
        log_error "Deployment failed health checks"
        log_info "Check logs with: ./deploy.sh logs"
        exit 1
    fi
    
    # Show final status
    show_status
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Your Obsidian Publishing System is now running!"
    
    if [ "$DOMAIN" != "localhost" ]; then
        log_info "Access your service at: https://$DOMAIN"
    else
        log_info "Access your service at: http://localhost"
    fi
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "deploy-dev")
        check_dependencies
        check_environment
        create_backup
        log_info "Starting development deployment..."
        setup_directories
        export VERSION DOMAIN SSL_EMAIL NODE_ENV API_TOKEN CORS_ORIGIN
        docker_compose down --remove-orphans || true
        # Using unified docker-compose.yml configuration
        docker_compose up -d --build
        show_status
        ;;
    "deploy-prod"|"production")
        main
        ;;
    "pull")
        pull_image
        ;;
    "backup")
        create_backup
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker_compose logs -f "${2:-}"
        ;;
    "restart")
        docker_compose restart "${2:-}"
        ;;
    "stop")
        docker_compose down
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  deploy         - Deploy the application (default)"
        echo "  deploy-dev     - Development deployment"
        echo "  deploy-prod    - Production deployment (same as deploy)"
        echo "  pull           - Pull latest Docker image"
        echo "  backup         - Create backup only"
        echo "  status         - Show deployment status"
        echo "  logs [service] - Show application logs"
        echo "  restart [svc]  - Restart services"
        echo "  stop           - Stop all services"
        echo "  help           - Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  VERSION        - Docker image version (default: latest)"
        echo "  DOMAIN         - Your domain name"
        echo "  API_TOKEN      - API authentication token"
        echo ""
        echo "Examples:"
        echo "  $0 deploy                     # Deploy the application"
        echo "  $0 logs app                   # Show app logs"
        echo "  $0 restart nginx              # Restart nginx service"
        echo ""
        echo "First time setup:"
        echo "  1. cp .env.example .env"
        echo "  2. nano .env  # Configure your settings"
        echo "  3. $0 deploy"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
EOF
    
    chmod +x "$PACKAGE_DIR/deploy.sh"
}

# Function to create the ZIP package
create_package() {
    log_info "Creating ZIP package..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local zip_name="$PACKAGE_NAME-$timestamp.zip"
    local zip_path="$BUILD_DIR/$zip_name"
    
    cd "$TEMP_DIR"
    zip -r "../$zip_name" "$PACKAGE_NAME/" -x "*.DS_Store" "*/.git/*" "*/node_modules/*" "*/.gitignore" "*/.github/*" || {
        log_error "Failed to create ZIP package"
        return 1
    }
    cd - > /dev/null
    
    # Create a symlink to the latest package
    local latest_link="$BUILD_DIR/$PACKAGE_NAME-latest.zip"
    if [ -L "$latest_link" ]; then
        rm "$latest_link"
    fi
    ln -s "$zip_name" "$latest_link"
    
    log_success "Package created: $zip_path"
    log_info "Latest package link: $latest_link"
    
    # Show package info
    local size=$(du -h "$zip_path" | cut -f1)
    log_info "Package size: $size"
    
    return 0
}

# Main execution
main() {
    echo "🏗️  Building Obsidian Publisher Server Package"
    echo "=============================================="
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Create package structure
    create_structure
    
    # Copy core files
    copy_core_files
    
    # Create configuration templates
    create_env_template
    
    # Create documentation
    create_install_docs
    
    # Create optimized deploy script
    create_package_deploy_script
    
    # Create the final package
    create_package
    
    log_success "🎉 Server package build completed!"
    echo ""
    log_info "Package contents:"
    echo "  📦 ZIP file: $BUILD_DIR/$PACKAGE_NAME-*.zip"
    echo "  📂 Contents: Docker configs, nginx configs, deploy script, documentation"
    echo "  📋 Installation: Extract ZIP and run ./deploy.sh"
    echo ""
    log_info "Next steps:"
    echo "  1. Test the package in a clean environment"
    echo "  2. Upload to releases or distribution server"
    echo "  3. Update installation documentation"
}

# Run main function
main "$@"