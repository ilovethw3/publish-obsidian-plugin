#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${DOMAIN:-"share.141029.xyz"}
SSL_EMAIL=${SSL_EMAIL:-"admin@share.141029.xyz"}
BACKUP_DIR="./backups"

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
    
    local deps=("docker" "docker-compose" "git")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Function to create backup
create_backup() {
    if [ -d "./server/database" ] && [ "$(ls -A ./server/database)" ]; then
        log_info "Creating database backup..."
        
        mkdir -p "$BACKUP_DIR"
        local backup_file="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
        
        tar -czf "$backup_file" ./server/database/ ./server/logs/ 2>/dev/null || {
            log_warning "Backup creation failed, but continuing deployment..."
            return 0
        }
        
        log_success "Backup created: $backup_file"
        
        # Keep only the last 5 backups
        ls -t "$BACKUP_DIR"/backup-*.tar.gz | tail -n +6 | xargs -r rm --
        log_info "Old backups cleaned up"
    else
        log_info "No existing data to backup"
    fi
}

# Function to setup SSL certificates
setup_ssl() {
    log_info "Setting up SSL certificates for $DOMAIN..."
    
    # Create certbot directories
    mkdir -p ./ssl-data/certbot/conf ./ssl-data/certbot/www
    
    # Check if certificates already exist
    if [ -d "./ssl-data/certbot/conf/live/$DOMAIN" ]; then
        log_info "SSL certificates already exist for $DOMAIN"
        return 0
    fi
    
    # Request initial certificate
    log_info "Requesting SSL certificate from Let's Encrypt..."
    
    export DOMAIN SSL_EMAIL
    docker-compose --profile ssl-init up --abort-on-container-exit certbot
    
    if [ $? -eq 0 ]; then
        log_success "SSL certificate obtained successfully"
    else
        log_error "Failed to obtain SSL certificate"
        return 1
    fi
}

# Function to deploy the application
deploy_app() {
    log_info "🚀 Starting deployment of Obsidian Publishing System..."
    
    # Pull latest changes
    if [ -d ".git" ]; then
        log_info "Pulling latest changes from Git..."
        git pull origin main || {
            log_warning "Git pull failed, continuing with current code..."
        }
    fi
    
    # Create necessary directories
    mkdir -p ./server/database ./server/logs
    
    # Set correct permissions
    chmod 755 ./server/database ./server/logs
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down --remove-orphans || true
    
    # Build and start new containers
    log_info "Building and starting containers..."
    docker-compose build --no-cache app
    docker-compose up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -q "healthy"; then
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Services failed to become healthy after $max_attempts attempts"
            log_info "Checking logs..."
            docker-compose logs --tail=50
            return 1
        fi
        
        log_info "Attempt $attempt/$max_attempts - Services not healthy yet, waiting..."
        sleep 10
        ((attempt++))
    done
    
    log_success "Services are healthy!"
}

# Function to run health checks
health_check() {
    log_info "Running health checks..."
    
    local health_url="http://localhost/health"
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "$health_url" &> /dev/null; then
            log_success "Health check passed!"
            
            # Test a basic API call
            log_info "Testing API functionality..."
            local test_response=$(curl -s -X POST "$health_url" \
                -H "Content-Type: application/json" \
                -d '{"title":"Test","content":"# Test Post"}' \
                -w "%{http_code}" -o /dev/null || echo "000")
            
            if [ "$test_response" = "201" ] || [ "$test_response" = "400" ]; then
                log_success "API is responding correctly"
                return 0
            fi
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check failed after $max_attempts attempts"
            log_info "Checking application logs..."
            docker-compose logs app --tail=20
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
    docker-compose ps
    echo ""
    
    log_info "Application URLs:"
    echo "  • Health Check: https://$DOMAIN/health"
    echo "  • API Endpoint: https://$DOMAIN/"
    echo "  • Example Post: https://$DOMAIN/abc12345"
    echo ""
    
    log_info "Useful Commands:"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Restart services: docker-compose restart"
    echo "  • Stop services: docker-compose down"
    echo "  • Renew SSL: docker-compose --profile ssl-renew up certbot-renew"
}

# Function to setup SSL certificate renewal
setup_ssl_renewal() {
    log_info "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    cat > ./ssl-renew.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
export DOMAIN=${DOMAIN:-"share.141029.xyz"}
export SSL_EMAIL=${SSL_EMAIL:-"admin@share.141029.xyz"}

echo "[$(date)] Starting SSL renewal..."
docker-compose --profile ssl-renew up certbot-renew

if [ $? -eq 0 ]; then
    echo "[$(date)] SSL renewal successful, reloading nginx..."
    docker-compose exec nginx nginx -s reload
    echo "[$(date)] SSL renewal completed"
else
    echo "[$(date)] SSL renewal failed"
    exit 1
fi
EOF
    
    chmod +x ./ssl-renew.sh
    
    log_info "SSL renewal script created: ./ssl-renew.sh"
    log_info "Consider adding this to your crontab for automatic renewal:"
    echo "  0 2 * * 0 cd $(pwd) && ./ssl-renew.sh >> ./ssl-renewal.log 2>&1"
}

# Main deployment function
main() {
    echo "🚀 Obsidian Publishing System Deployment Script"
    echo "================================================"
    
    # Check dependencies
    check_dependencies
    
    # Create backup of existing data
    create_backup
    
    # Deploy the application
    deploy_app
    
    # Run health checks
    if ! health_check; then
        log_error "Deployment failed health checks"
        log_info "Rolling back..."
        docker-compose down
        exit 1
    fi
    
    # Setup SSL renewal
    setup_ssl_renewal
    
    # Show final status
    show_status
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Your Obsidian Publishing System is now running at https://$DOMAIN"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "ssl-setup")
        check_dependencies
        setup_ssl
        ;;
    "ssl-renew")
        docker-compose --profile ssl-renew up certbot-renew
        docker-compose exec nginx nginx -s reload
        ;;
    "backup")
        create_backup
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker-compose logs -f "${2:-}"
        ;;
    "restart")
        docker-compose restart "${2:-}"
        ;;
    "stop")
        docker-compose down
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy     - Full deployment (default)"
        echo "  ssl-setup  - Setup SSL certificates only"
        echo "  ssl-renew  - Renew SSL certificates"
        echo "  backup     - Create backup only"
        echo "  status     - Show deployment status"
        echo "  logs       - Show application logs"
        echo "  restart    - Restart services"
        echo "  stop       - Stop all services"
        echo "  help       - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac