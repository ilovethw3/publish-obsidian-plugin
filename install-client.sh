#!/bin/bash
# install-client.sh - Obsidian Publishing System 客户端自动安装脚本

set -e

# 配置
PLUGIN_NAME="obsidian-publishing-system"
GITHUB_REPO="ilovethw3/publish-obsidian-plugin"
PLUGIN_DISPLAY_NAME="Obsidian Publishing System"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 检测操作系统和 Obsidian 目录
detect_obsidian_dir() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OBSIDIAN_DIR="$HOME/.config/obsidian"
        OS_NAME="Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OBSIDIAN_DIR="$HOME/Library/Application Support/obsidian"
        OS_NAME="macOS"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        OBSIDIAN_DIR="$APPDATA/obsidian"
        OS_NAME="Windows"
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
    
    log_info "检测到操作系统: $OS_NAME"
    log_info "Obsidian 目录: $OBSIDIAN_DIR"
}

# 检查 Obsidian 是否安装
check_obsidian() {
    if [ ! -d "$OBSIDIAN_DIR" ]; then
        log_error "未找到 Obsidian 目录: $OBSIDIAN_DIR"
        log_error "请确保 Obsidian 已安装并至少运行过一次"
        exit 1
    fi
    
    log_info "✓ 找到 Obsidian 安装目录"
}

# 创建插件目录
create_plugin_dir() {
    PLUGIN_DIR="$OBSIDIAN_DIR/plugins/$PLUGIN_NAME"
    
    log_step "创建插件目录..."
    mkdir -p "$PLUGIN_DIR"
    log_info "✓ 插件目录已创建: $PLUGIN_DIR"
}

# 检查是否在项目目录中
check_project_dir() {
    if [ -f "client/package.json" ] && [ -f "server/package.json" ]; then
        return 0  # 在项目目录中
    else
        return 1  # 不在项目目录中
    fi
}

# 本地构建安装
install_from_source() {
    log_step "从源码构建并安装插件..."
    
    # 检查 Node.js 和 npm
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    log_info "✓ Node.js 和 npm 已安装"
    
    # 构建客户端
    log_step "构建客户端插件..."
    cd client
    
    log_info "安装依赖..."
    npm install
    
    log_info "构建插件..."
    npm run build
    
    cd ..
    
    # 复制文件
    log_step "复制插件文件..."
    if [ -f "main.js" ] && [ -f "manifest.json" ]; then
        cp main.js manifest.json "$PLUGIN_DIR/"
        
        # 复制样式文件（如果存在）
        [ -f "styles.css" ] && cp styles.css "$PLUGIN_DIR/"
        
        log_info "✓ 插件文件已复制"
    else
        log_error "构建失败：未找到必需的插件文件"
        exit 1
    fi
}

# 从 Release 下载安装
install_from_release() {
    log_step "从 GitHub Release 下载并安装插件..."
    
    # 检查 curl 或 wget
    if command -v curl &> /dev/null; then
        DOWNLOAD_CMD="curl -L -o"
    elif command -v wget &> /dev/null; then
        DOWNLOAD_CMD="wget -O"
    else
        log_error "需要 curl 或 wget 来下载插件文件"
        exit 1
    fi
    
    # 获取最新 Release URL
    local release_url="https://github.com/$GITHUB_REPO/releases/latest/download/$PLUGIN_NAME.zip"
    
    log_info "下载插件包..."
    local temp_file="/tmp/$PLUGIN_NAME.zip"
    
    if $DOWNLOAD_CMD "$temp_file" "$release_url"; then
        log_info "✓ 插件包下载成功"
    else
        log_error "下载失败，可能是网络问题或 Release 不存在"
        log_info "请尝试手动安装或从源码构建"
        exit 1
    fi
    
    # 解压到插件目录
    log_step "解压插件文件..."
    if command -v unzip &> /dev/null; then
        unzip -o "$temp_file" -d "$PLUGIN_DIR/"
        rm "$temp_file"
        log_info "✓ 插件文件已解压"
    else
        log_error "需要 unzip 命令来解压插件文件"
        exit 1
    fi
}

# 验证安装
verify_installation() {
    log_step "验证插件安装..."
    
    local required_files=("main.js" "manifest.json")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$PLUGIN_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        log_info "✅ 验证成功：所有必需文件都已安装"
        
        # 显示文件信息
        log_info "插件文件:"
        ls -la "$PLUGIN_DIR/"
        
        return 0
    else
        log_error "❌ 验证失败：缺少以下文件:"
        for file in "${missing_files[@]}"; do
            log_error "  - $file"
        done
        return 1
    fi
}

# 显示安装后说明
show_post_install_instructions() {
    echo ""
    echo "🎉 插件安装完成！"
    echo ""
    echo "📝 后续步骤："
    echo "  1. 重启 Obsidian"
    echo "  2. 进入 设置 → 第三方插件"
    echo "  3. 启用 '$PLUGIN_DISPLAY_NAME'"
    echo "  4. 在插件设置中配置服务器 URL"
    echo ""
    echo "🔧 配置示例:"
    echo "  服务器 URL: https://your-domain.com"
    echo "  认证令牌: (可选，用于私有部署)"
    echo ""
    echo "📖 更多帮助："
    echo "  - 文档: https://github.com/$GITHUB_REPO/tree/master/docs"
    echo "  - 问题反馈: https://github.com/$GITHUB_REPO/issues"
}

# 显示帮助信息
show_help() {
    cat << EOF
Obsidian Publishing System 客户端安装脚本

用法: $0 [选项]

选项:
  --source, -s        从源码构建并安装（需要在项目目录中运行）
  --release, -r       从 GitHub Release 下载并安装
  --auto, -a          自动选择安装方式（默认）
  --help, -h          显示此帮助信息

示例:
  $0                  # 自动安装
  $0 --source         # 从源码安装
  $0 --release        # 从 Release 安装

注意:
  - 确保 Obsidian 已安装并至少运行过一次
  - 从源码安装需要 Node.js 和 npm
  - 从 Release 安装需要网络连接

EOF
}

# 主函数
main() {
    local install_mode="auto"
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --source|-s)
                install_mode="source"
                shift
                ;;
            --release|-r)
                install_mode="release"
                shift
                ;;
            --auto|-a)
                install_mode="auto"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo "🚀 开始安装 $PLUGIN_DISPLAY_NAME 插件..."
    echo ""
    
    # 基本检查
    detect_obsidian_dir
    check_obsidian
    create_plugin_dir
    
    # 根据模式安装
    case $install_mode in
        "source")
            if check_project_dir; then
                install_from_source
            else
                log_error "当前目录不是项目目录，无法从源码安装"
                log_info "请在项目根目录中运行，或使用 --release 选项"
                exit 1
            fi
            ;;
        "release")
            install_from_release
            ;;
        "auto")
            if check_project_dir; then
                log_info "检测到项目目录，从源码安装"
                install_from_source
            else
                log_info "未检测到项目目录，从 Release 安装"
                install_from_release
            fi
            ;;
    esac
    
    # 验证安装
    if verify_installation; then
        show_post_install_instructions
    else
        log_error "安装验证失败，请检查错误信息"
        exit 1
    fi
}

# 运行主函数
main "$@"