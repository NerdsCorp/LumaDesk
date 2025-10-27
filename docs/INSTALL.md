# LumaDesk Installation Guide

## One-Line Install

For a fresh Linux server, use our automated installer:

### Quick Install (Interactive)

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/LumaDesk/main/install.sh | bash
```

Or with wget:

```bash
wget -qO- https://raw.githubusercontent.com/yourusername/LumaDesk/main/install.sh | bash
```

### Automated Install (Non-Interactive)

For CI/CD or automated deployments:

```bash
export LUMADESK_AUTO_INSTALL=true
export INSTALL_DIR=/opt/lumadesk
curl -fsSL https://raw.githubusercontent.com/yourusername/LumaDesk/main/install.sh | bash
```

## What the Installer Does

The install script automatically:

1. ✅ **Detects your Linux distribution** (Ubuntu, Debian, CentOS, Fedora, RHEL)
2. ✅ **Checks system requirements** (CPU, RAM, disk space)
3. ✅ **Installs Docker** and Docker Compose
4. ✅ **Installs dependencies** (git, curl, wget, make, jq, openssl)
5. ✅ **Clones LumaDesk repository** to `/opt/lumadesk`
6. ✅ **Generates secure secrets** (JWT tokens, passwords)
7. ✅ **Configures environment** (`.env` file with secure defaults)
8. ✅ **Configures firewall** (optional - UFW or firewalld)
9. ✅ **Deploys LumaDesk** (Docker Compose)
10. ✅ **Waits for services** to be ready
11. ✅ **Displays credentials** and access URLs

## System Requirements

### Minimum (Small Deployment)
- **OS**: Ubuntu 20.04+, Debian 11+, CentOS 8+, Fedora 35+
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disk**: 50 GB free space
- **Network**: Static IP recommended

### Recommended (< 100 users)
- **CPU**: 16-32 cores
- **RAM**: 32-64 GB
- **Disk**: 100 GB SSD
- **Network**: 1 Gbps Ethernet

### Enterprise (1000+ users)
- **Kubernetes cluster**: 10-30 nodes
- **Total CPU**: 200+ cores
- **Total RAM**: 500+ GB
- **Storage**: NFS or distributed storage (1+ TB)
- **Network**: 10 Gbps backbone

## Manual Installation

If you prefer manual installation:

### 1. Install Docker

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**CentOS/RHEL/Fedora:**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/LumaDesk.git
cd LumaDesk
```

### 3. Configure Environment

```bash
cp .env.example .env

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
ADMIN_PASSWORD=$(openssl rand -base64 16)

# Update .env file
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$ADMIN_PASSWORD/" .env

chmod 600 .env
```

### 4. Deploy

```bash
make deploy
```

## Post-Installation

### 1. Verify Services

```bash
# Check all services are running
docker compose ps

# Check logs
docker compose logs -f

# Test API
curl http://localhost:3000/health

# Test Web UI
curl http://localhost:8080
```

### 2. Access Web UI

Open in browser: `http://YOUR_SERVER_IP:8080`

**Default credentials:**
- Username: `admin`
- Password: (check `.env` file or installer output)

### 3. Change Admin Password

**IMPORTANT:** Change the default admin password immediately!

1. Login to Web UI
2. Go to Settings
3. Change password
4. Update `.env` file with new password (optional)

### 4. Create Users

1. Go to Users page
2. Click "Add User"
3. Fill in details
4. Choose desktop environment (XFCE, KDE, or GNOME)
5. Save

### 5. Configure PXE Boot

See [PXE Setup Guide](../pxe/README.md) for detailed instructions.

## Firewall Configuration

### UFW (Ubuntu/Debian)

```bash
# Allow Web UI
sudo ufw allow 8080/tcp

# Allow API
sudo ufw allow 3000/tcp

# Allow XDMCP (for thin clients)
sudo ufw allow 177/udp

# Allow X11 (for thin clients)
sudo ufw allow 6000:6010/tcp

# Allow PXE (TFTP)
sudo ufw allow 69/udp

# Allow PXE (HTTP)
sudo ufw allow 8069/tcp

# Allow DHCP (if using built-in DHCP)
sudo ufw allow 67/udp

# Enable firewall
sudo ufw enable
```

### firewalld (CentOS/RHEL/Fedora)

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=177/udp
sudo firewall-cmd --permanent --add-port=6000-6010/tcp
sudo firewall-cmd --permanent --add-port=69/udp
sudo firewall-cmd --permanent --add-port=8069/tcp
sudo firewall-cmd --permanent --add-port=67/udp
sudo firewall-cmd --reload
```

## Troubleshooting

### Installation Fails

**Problem:** Docker installation fails

**Solution:**
```bash
# Check Docker service
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check logs
sudo journalctl -u docker -n 50
```

**Problem:** Permission denied errors

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Re-login or use:
newgrp docker
```

### Services Won't Start

**Problem:** Port already in use

**Solution:**
```bash
# Check what's using the port
sudo netstat -tulpn | grep 8080

# Stop conflicting service or change port in .env
```

**Problem:** Database connection errors

**Solution:**
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Restart database
docker compose restart postgres
```

### Can't Access Web UI

**Problem:** Connection refused

**Solution:**
```bash
# Check if container is running
docker compose ps web

# Check container logs
docker compose logs web

# Check if port is bound
sudo netstat -tulpn | grep 8080

# Check firewall
sudo ufw status
```

**Problem:** 502 Bad Gateway

**Solution:**
```bash
# API might not be ready
docker compose logs api

# Restart services
docker compose restart web api
```

## Uninstall

To completely remove LumaDesk:

```bash
# Stop and remove containers
docker compose down -v

# Remove images
docker rmi $(docker images | grep lumadesk | awk '{print $3}')

# Remove installation directory
sudo rm -rf /opt/lumadesk

# Remove configuration (optional)
sudo rm -rf ~/.lumadesk
```

## Upgrade

To upgrade to a newer version:

```bash
cd /opt/lumadesk

# Backup current configuration
cp .env .env.backup

# Pull latest changes
git pull

# Rebuild containers
make build

# Restart services
docker compose down
docker compose up -d

# Verify upgrade
docker compose ps
```

## Advanced Installation Options

### Custom Installation Directory

```bash
export INSTALL_DIR=/custom/path
curl -fsSL https://raw.githubusercontent.com/yourusername/LumaDesk/main/install.sh | bash
```

### Skip Firewall Configuration

```bash
# The script will prompt for firewall configuration
# Choose 'N' when asked
```

### Enterprise Mode (Multi-Server)

```bash
# After installation, enable enterprise profile
cd /opt/lumadesk
docker compose --profile enterprise up -d
```

### Kubernetes Deployment

For enterprise scale (1000+ users):

```bash
# Install kubectl and setup cluster
# Then deploy LumaDesk
kubectl apply -f kubernetes/

# See kubernetes/README.md for details
```

## Security Hardening

After installation, follow these security best practices:

1. **Change all default passwords**
2. **Configure TLS/HTTPS** (use Caddy or Nginx reverse proxy)
3. **Restrict network access** (firewall rules)
4. **Enable audit logging**
5. **Regular updates** (git pull && make build)
6. **Backup regularly** (make backup)
7. **Monitor logs** (docker compose logs -f)

See [Security Guide](SECURITY.md) for detailed security recommendations.

## Support

- **Documentation**: `/opt/lumadesk/README.md`
- **Issues**: https://github.com/yourusername/LumaDesk/issues
- **Discussions**: https://github.com/yourusername/LumaDesk/discussions

## License

MIT License - see [LICENSE](../LICENSE) for details.
