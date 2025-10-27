#!/bin/bash
#
# LumaDesk One-Line Installer
# Installs all dependencies and deploys LumaDesk
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/yourusername/LumaDesk/main/install.sh | bash
#   or
#   wget -qO- https://raw.githubusercontent.com/yourusername/LumaDesk/main/install.sh | bash
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_warning "Running as root. This is not recommended."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
        log_info "Detected OS: $PRETTY_NAME"
    else
        log_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."

    # Check CPU cores
    CPU_CORES=$(nproc)
    log_info "CPU cores: $CPU_CORES"
    if [ "$CPU_CORES" -lt 4 ]; then
        log_warning "Recommended: 4+ CPU cores. Found: $CPU_CORES"
    fi

    # Check RAM
    TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
    log_info "Total RAM: ${TOTAL_RAM}GB"
    if [ "$TOTAL_RAM" -lt 8 ]; then
        log_warning "Recommended: 8GB+ RAM. Found: ${TOTAL_RAM}GB"
    fi

    # Check disk space
    DISK_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    log_info "Available disk space: ${DISK_SPACE}GB"
    if [ "$DISK_SPACE" -lt 50 ]; then
        log_warning "Recommended: 50GB+ free space. Found: ${DISK_SPACE}GB"
    fi
}

# Install Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_success "Docker already installed: $(docker --version)"
        return
    fi

    log_info "Installing Docker..."

    case $OS in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y \
                ca-certificates \
                curl \
                gnupg \
                lsb-release

            # Add Docker's official GPG key
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

            # Set up repository
            echo \
                "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
                $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

            # Install Docker Engine
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;

        centos|rhel|fedora)
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
            ;;

        *)
            log_error "Unsupported OS: $OS"
            log_info "Please install Docker manually: https://docs.docker.com/engine/install/"
            exit 1
            ;;
    esac

    # Add current user to docker group
    if [ "$EUID" -ne 0 ]; then
        sudo usermod -aG docker $USER
        log_warning "Added $USER to docker group. You may need to log out and back in for this to take effect."
    fi

    log_success "Docker installed successfully"
}

# Install Docker Compose (standalone if needed)
install_docker_compose() {
    if docker compose version &> /dev/null; then
        log_success "Docker Compose already installed: $(docker compose version)"
        return
    fi

    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose (standalone) already installed: $(docker-compose --version)"
        return
    fi

    log_info "Installing Docker Compose..."

    # Install docker-compose-plugin if not present
    case $OS in
        ubuntu|debian)
            sudo apt-get install -y docker-compose-plugin
            ;;
        centos|rhel|fedora)
            sudo yum install -y docker-compose-plugin
            ;;
        *)
            # Fallback: install standalone docker-compose
            DOCKER_COMPOSE_VERSION="2.24.5"
            sudo curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            ;;
    esac

    log_success "Docker Compose installed successfully"
}

# Install other dependencies
install_dependencies() {
    log_info "Installing additional dependencies..."

    case $OS in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y \
                git \
                curl \
                wget \
                make \
                jq \
                net-tools \
                netcat \
                openssl
            ;;

        centos|rhel|fedora)
            sudo yum install -y \
                git \
                curl \
                wget \
                make \
                jq \
                net-tools \
                nc \
                openssl
            ;;
    esac

    log_success "Dependencies installed"
}

# Clone or update repository
setup_repository() {
    INSTALL_DIR="${INSTALL_DIR:-/opt/lumadesk}"

    log_info "Setting up LumaDesk repository..."

    if [ -d "$INSTALL_DIR" ]; then
        log_info "Directory $INSTALL_DIR already exists"
        read -p "Update existing installation? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd "$INSTALL_DIR"
            git pull
            log_success "Repository updated"
        fi
    else
        log_info "Cloning LumaDesk repository to $INSTALL_DIR..."
        sudo mkdir -p $(dirname "$INSTALL_DIR")
        sudo git clone https://github.com/yourusername/LumaDesk.git "$INSTALL_DIR"
        sudo chown -R $USER:$USER "$INSTALL_DIR"
        cd "$INSTALL_DIR"
        log_success "Repository cloned"
    fi
}

# Generate secure secrets
generate_secrets() {
    log_info "Generating secure secrets..."

    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    ADMIN_PASSWORD=$(openssl rand -base64 16)

    log_success "Secrets generated"
}

# Configure environment
configure_environment() {
    log_info "Configuring environment..."

    if [ -f .env ]; then
        log_warning ".env file already exists"
        read -p "Overwrite with new configuration? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing .env file"
            return
        fi
        mv .env .env.backup.$(date +%s)
    fi

    # Copy template
    cp .env.example .env

    # Get server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="192.168.1.10"
        log_warning "Could not detect server IP, using default: $SERVER_IP"
    else
        log_info "Detected server IP: $SERVER_IP"
    fi

    # Update .env with generated values
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
    sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$ADMIN_PASSWORD/" .env
    sed -i "s/PXE_SERVER_IP=.*/PXE_SERVER_IP=$SERVER_IP/" .env

    # Set permissions
    chmod 600 .env

    log_success "Environment configured"
    log_warning "Admin credentials:"
    echo "  Username: admin"
    echo "  Password: $ADMIN_PASSWORD"
    echo ""
    log_warning "IMPORTANT: Save these credentials! They are also in .env file"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."

    if command -v ufw &> /dev/null; then
        log_info "Detected UFW firewall"
        read -p "Configure UFW firewall rules? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo ufw allow 8080/tcp comment "LumaDesk Web UI"
            sudo ufw allow 3000/tcp comment "LumaDesk API"
            sudo ufw allow 177/udp comment "LumaDesk XDMCP"
            sudo ufw allow 6000:6010/tcp comment "LumaDesk X11"
            sudo ufw allow 69/udp comment "LumaDesk TFTP"
            sudo ufw allow 8069/tcp comment "LumaDesk PXE HTTP"
            sudo ufw allow 67/udp comment "LumaDesk DHCP"
            log_success "Firewall rules configured"
        fi
    elif command -v firewall-cmd &> /dev/null; then
        log_info "Detected firewalld"
        read -p "Configure firewalld rules? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo firewall-cmd --permanent --add-port=8080/tcp
            sudo firewall-cmd --permanent --add-port=3000/tcp
            sudo firewall-cmd --permanent --add-port=177/udp
            sudo firewall-cmd --permanent --add-port=6000-6010/tcp
            sudo firewall-cmd --permanent --add-port=69/udp
            sudo firewall-cmd --permanent --add-port=8069/tcp
            sudo firewall-cmd --permanent --add-port=67/udp
            sudo firewall-cmd --reload
            log_success "Firewall rules configured"
        fi
    else
        log_warning "No supported firewall detected. Please configure firewall manually."
    fi
}

# Deploy LumaDesk
deploy_lumadesk() {
    log_info "Deploying LumaDesk..."

    echo ""
    echo "Select deployment mode:"
    echo "1) Small (single server, < 100 users)"
    echo "2) Enterprise (multi-server with session broker)"
    echo "3) Kubernetes (1000+ users) - manual setup required"
    read -p "Choice [1]: " DEPLOY_MODE
    DEPLOY_MODE=${DEPLOY_MODE:-1}

    case $DEPLOY_MODE in
        1)
            log_info "Deploying small configuration..."
            ./scripts/deploy
            ;;
        2)
            log_info "Deploying enterprise configuration..."
            docker compose --profile enterprise up -d
            ;;
        3)
            log_info "Kubernetes deployment selected"
            log_info "Please follow the guide at: kubernetes/README.md"
            log_info "Quick start: kubectl apply -f kubernetes/"
            return
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac

    log_success "Deployment initiated"
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to start..."

    # Wait for API
    for i in {1..30}; do
        if curl -f http://localhost:3000/health &> /dev/null; then
            log_success "API is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""

    # Wait for Web UI
    for i in {1..30}; do
        if curl -f http://localhost:8080 &> /dev/null; then
            log_success "Web UI is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
}

# Print summary
print_summary() {
    SERVER_IP=$(hostname -I | awk '{print $1}')

    echo ""
    echo "========================================="
    log_success "LumaDesk installation complete!"
    echo "========================================="
    echo ""
    echo "Access LumaDesk:"
    echo "  Web UI:  http://$SERVER_IP:8080"
    echo "  API:     http://$SERVER_IP:3000"
    echo "  PXE:     http://$SERVER_IP:8069"
    echo ""
    echo "Admin Login:"
    echo "  Username: admin"
    echo "  Password: (see above or check .env file)"
    echo ""
    echo "Next Steps:"
    echo "  1. Login to Web UI at http://$SERVER_IP:8080"
    echo "  2. Change admin password"
    echo "  3. Create users"
    echo "  4. Configure PXE for thin clients"
    echo ""
    echo "Documentation:"
    echo "  README:     $INSTALL_DIR/README.md"
    echo "  Security:   $INSTALL_DIR/docs/SECURITY.md"
    echo "  Scaling:    $INSTALL_DIR/docs/ARCHITECTURE_SCALE.md"
    echo ""
    echo "Useful Commands:"
    echo "  Status:  docker compose ps"
    echo "  Logs:    docker compose logs -f"
    echo "  Stop:    docker compose down"
    echo "  Restart: docker compose restart"
    echo ""
    log_info "Installation directory: $INSTALL_DIR"
    echo "========================================="
}

# Main installation flow
main() {
    echo ""
    echo "========================================="
    echo "  LumaDesk One-Line Installer"
    echo "  Enterprise Thin Client System"
    echo "========================================="
    echo ""

    # Check if running in CI/automated mode
    if [ "$LUMADESK_AUTO_INSTALL" = "true" ]; then
        log_info "Running in automated mode"
    else
        log_warning "This script will install Docker and other dependencies"
        read -p "Continue with installation? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Installation cancelled"
            exit 0
        fi
    fi

    # Run installation steps
    check_root
    detect_os
    check_requirements
    install_docker
    install_docker_compose
    install_dependencies
    setup_repository
    generate_secrets
    configure_environment
    configure_firewall
    deploy_lumadesk
    wait_for_services
    print_summary

    echo ""
    log_success "Thank you for installing LumaDesk!"
    echo ""
}

# Run main installation
main "$@"
