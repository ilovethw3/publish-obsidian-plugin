#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [version]"
    echo ""
    echo "Examples:"
    echo "  $0              # Build latest version"
    echo "  $0 v1.0.0       # Build specific version"
    echo "  $0 v1.2.3-beta  # Build beta version"
    echo ""
    echo "Commands:"
    echo "  help            # Show this help"
    echo "  clean           # Clean build artifacts"
    echo "  build [version] # Build package (default)"
    echo "  list            # List built packages"
}

# Function to clean build artifacts
clean_build() {
    log_info "Cleaning build artifacts..."
    if [ -d "build" ]; then
        rm -rf build/
        log_success "Build directory cleaned"
    else
        log_info "No build directory to clean"
    fi
}

# Function to list built packages
list_packages() {
    if [ ! -d "build" ]; then
        log_info "No build directory found"
        return
    fi
    
    log_info "Built packages:"
    cd build/
    for file in *.zip; do
        if [ -f "$file" ]; then
            size=$(ls -lh "$file" | awk '{print $5}')
            date=$(ls -l "$file" | awk '{print $6, $7, $8}')
            if [ -L "$file" ]; then
                target=$(readlink "$file")
                echo "  📦 $file -> $target ($size, $date)"
            else
                echo "  📦 $file ($size, $date)"
                # Show checksums if available
                if [ -f "$file.sha256" ]; then
                    sha256=$(cat "$file.sha256" | cut -d' ' -f1)
                    echo "     SHA256: $sha256"
                fi
            fi
        fi
    done
    cd - > /dev/null
}

# Function to build package with version
build_package() {
    local version="${1:-latest}"
    
    log_info "Building Obsidian Publisher Server package..."
    log_info "Version: $version"
    
    # Validate version format if not 'latest'
    if [[ "$version" != "latest" ]] && [[ ! "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
        log_warning "Version format should be like: v1.0.0 or v1.0.0-beta"
        log_info "Continuing with: $version"
    fi
    
    # Set version environment variable for the build script
    export VERSION="$version"
    
    # Run the build script
    if [ ! -f "build-server-package.sh" ]; then
        log_error "build-server-package.sh not found!"
        log_info "Make sure you're in the project root directory"
        exit 1
    fi
    
    chmod +x build-server-package.sh
    ./build-server-package.sh
    
    # If version is not 'latest', create a versioned copy
    if [[ "$version" != "latest" ]]; then
        cd build/
        
        # Find the timestamped zip file
        original_zip=$(ls obsidian-publisher-server-*.zip | grep -v latest | head -1)
        
        if [ -n "$original_zip" ]; then
            versioned_name="obsidian-publisher-server-$version.zip"
            
            # Create versioned copy
            cp "$original_zip" "$versioned_name"
            
            # Update latest symlink
            rm -f obsidian-publisher-server-latest.zip
            ln -s "$versioned_name" obsidian-publisher-server-latest.zip
            
            log_success "Created versioned package: $versioned_name"
            
            # Generate checksums
            sha256sum "$versioned_name" > "$versioned_name.sha256"
            md5sum "$versioned_name" > "$versioned_name.md5"
            
            log_info "Generated checksums:"
            echo "  SHA256: $(cat $versioned_name.sha256 | cut -d' ' -f1)"
            echo "  MD5: $(cat $versioned_name.md5 | cut -d' ' -f1)"
        fi
        
        cd - > /dev/null
    fi
    
    # Show build summary
    echo ""
    log_success "🎉 Server package build completed!"
    echo ""
    list_packages
    
    # Show next steps
    echo ""
    log_info "📋 Next steps:"
    echo "  1. Test the package: unzip build/obsidian-publisher-server-*.zip"
    echo "  2. Upload to your server or release page"
    echo "  3. Update documentation with new version"
    
    if [[ "$version" != "latest" ]]; then
        echo ""
        log_info "🏷️  Version Release:"
        echo "  • Package: build/obsidian-publisher-server-$version.zip"
        echo "  • Create git tag: git tag $version && git push origin $version"
        echo "  • GitHub Actions will auto-build on tag push"
    fi
}

# Function to validate environment
validate_environment() {
    # Check required tools
    local missing_tools=()
    
    for tool in zip unzip; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install missing tools and try again"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "build-server-package.sh" ] || [ ! -f "deploy.sh" ] || [ ! -d "server" ]; then
        log_error "Not in the correct project directory"
        log_info "Please run this script from the project root"
        exit 1
    fi
}

# Main function
main() {
    local command="${1:-build}"
    
    case "$command" in
        "help"|"-h"|"--help")
            show_usage
            ;;
        "clean")
            validate_environment
            clean_build
            ;;
        "list")
            list_packages
            ;;
        "build")
            validate_environment
            build_package "$2"
            ;;
        *)
            # Default to build with the argument as version
            validate_environment
            build_package "$1"
            ;;
    esac
}

# Run main function
main "$@"