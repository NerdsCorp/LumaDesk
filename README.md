# LumaDesk

![LumaDesk Logo](docs/logo.png)

**Open-source Sun Ray-style hotdesking system with X server/XDMCP and RDP**

LumaDesk is an enterprise-scale thin client infrastructure that enables network-booted workstations to connect to centralized desktop servers. Supports both traditional X11/XDMCP and modern RDP for Wayland. **Scales to 1000+ concurrent users** with Kubernetes orchestration. Perfect for hotdesking environments, labs, kiosks, and enterprise VDI deployments.

## Features

- 🚀 **PXE Boot**: Thin clients boot from network - no local storage required
- 🖥️ **Dual Protocol**: X11/XDMCP for LAN + RDP/xrdp for WAN/Wayland
- 🎨 **Multiple Desktops**: KDE Plasma, GNOME, or XFCE - user choice
- ⚡ **Enterprise Scale**: 1000+ concurrent users with Kubernetes auto-scaling
- 🔄 **Load Balancing**: Session broker distributes users across server pool
- 👥 **User Management**: Web-based admin UI for managing users and sessions
- 🔐 **Secure Authentication**: JWT-based auth with role-based access control
- 📊 **Session Monitoring**: Real-time monitoring of active sessions and devices
- 📝 **Audit Logging**: Complete audit trail of all administrative actions
- 🐳 **Flexible Deployment**: Docker Compose or Kubernetes
- 🌐 **Modern Stack**: React + TypeScript + Fastify + PostgreSQL

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Thin Clients                        │
│              (PXE Boot, No Local Storage)               │
└────────────────────┬────────────────────────────────────┘
                     │ Network Boot + Streaming
┌────────────────────┴────────────────────────────────────┐
│                   LumaDesk Server                       │
│  ┌────────────┬────────────┬──────────────────────┐ │
│  │   Web UI   │  API/Auth  │   Session Broker     │ │
│  └────────────┴────────────┴──────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │     Desktop Server Pool (Auto-scaling)          │ │
│  │  XFCE │ KDE │ GNOME  (X11/XDMCP + RDP)         │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐  │
│  │            PostgreSQL Database                    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

**Small Deployment (< 100 users):**
- Docker and Docker Compose
- Single Linux server: 32 cores, 64GB RAM, 100GB storage
- Network with DHCP capability

**Enterprise Deployment (1000+ users):**
- Kubernetes cluster (10-30 nodes)
- Total: 200+ cores, 500+ GB RAM
- NFS or distributed storage
- See [Enterprise Scale Guide](docs/ARCHITECTURE_SCALE.md)

### Installation

#### Option 1: One-Line Install (Recommended)

For a fresh Linux server, use our automated installer:

```bash
curl -fsSL https://raw.githubusercontent.com/nerdscorp/LumaDesk/main/install.sh | bash
```

Or with wget:

```bash
wget -qO- https://raw.githubusercontent.com/nerdscorp/LumaDesk/main/install.sh | bash
```

The installer will:
- ✅ Detect your OS and install Docker
- ✅ Clone the repository to `/opt/lumadesk`
- ✅ Generate secure secrets automatically
- ✅ Configure environment with your server IP
- ✅ Deploy all services
- ✅ Display access credentials

See [Installation Guide](docs/INSTALL.md) for detailed options and troubleshooting.

#### Option 2: Manual Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/LumaDesk.git
   cd LumaDesk
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and set secure passwords
   ```

3. **Deploy LumaDesk**
   ```bash
   make deploy
   ```

4. **Access the admin UI**
   ```
   URL: http://YOUR_SERVER_IP:8080
   Username: admin
   Password: (check .env file)
   ```

   **⚠️ IMPORTANT: Change the admin password immediately!**

### Configuration

Edit `.env` file to customize your deployment:

```bash
# Security (CHANGE THESE!)
JWT_SECRET=your-secure-random-string
ADMIN_PASSWORD=your-secure-password

# Network
PXE_SERVER_IP=192.168.1.10
PXE_DHCP_RANGE_START=192.168.1.100
PXE_DHCP_RANGE_END=192.168.1.200

# Sunshine Ports
SUNSHINE_PORT_HTTPS=47984
SUNSHINE_PORT_HTTP=47989
```

See `.env.example` for all available options.

## Usage

### Admin UI

The web UI provides:

- **Dashboard**: Overview of system status, active sessions, devices
- **Users**: Create, edit, delete users with role management
- **Devices**: Register and manage thin client devices
- **Sessions**: View and terminate active streaming sessions
- **Audit Logs**: Complete audit trail with filtering
- **Settings**: System configuration and PXE management

### User Workflow

1. **Admin creates user** via Web UI
2. **Admin registers device** and generates pairing token
3. **Thin client boots** from network (PXE)
4. **Client connects** to Sunshine server using credentials
5. **User streams desktop** via Moonlight protocol
6. **Session monitored** in real-time by admin
7. **On logout**, client reboots and returns to login screen

### PXE Boot Setup

#### BIOS/UEFI Configuration

Configure thin clients to boot from network (PXE):

**BIOS:**
1. Enter BIOS setup (usually F2, Del, or F12)
2. Go to Boot Options
3. Enable Network Boot / PXE Boot
4. Set Network as first boot device
5. Save and exit

**UEFI:**
1. Enter UEFI setup
2. Boot Manager → Add Boot Option
3. Select network interface
4. Save and exit

#### DHCP Server Configuration

**Option 1: Use LumaDesk's built-in DHCP**

Set in `.env`:
```bash
PXE_DHCP_ENABLED=true
```

**Option 2: Use existing DHCP server**

Add to your DHCP configuration:

**ISC DHCP (`/etc/dhcp/dhcpd.conf`):**
```
next-server 192.168.1.10;
if exists user-class and option user-class = "iPXE" {
    filename "http://192.168.1.10:8069/boot.ipxe";
} else {
    filename "undionly.kpxe";
}
```

**dnsmasq:**
```
dhcp-boot=undionly.kpxe,lumadesk-pxe,192.168.1.10
```

## Development

### Project Structure

```
LumaDesk/
├── api/                    # Backend API (Fastify + TypeScript)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Auth, error handling
│   │   └── migrations/    # Database migrations
│   └── tests/             # API tests
├── web/                    # Web UI (React + Vite + Tailwind)
│   ├── src/
│   │   ├── pages/         # UI pages
│   │   ├── components/    # React components
│   │   └── services/      # API client
│   └── public/
├── sunshine-service/       # Sunshine streaming container
├── pxe/                    # PXE boot server
│   ├── config/            # dnsmasq, nginx configs
│   └── scripts/           # Boot scripts
├── client/                 # Thin client runtime
│   ├── scripts/           # Client agent, init
│   └── rootfs/            # Client filesystem
├── scripts/                # Build and deployment scripts
└── docs/                   # Documentation

```

### Building from Source

```bash
# Build all containers
make build

# Build individual components
docker build -t lumadesk/api:latest ./api
docker build -t lumadesk/web:latest ./web
docker build -t lumadesk/sunshine:latest ./sunshine-service
docker build -t lumadesk/pxe:latest ./pxe
docker build -t lumadesk/client:latest ./client
```

### Running Tests

```bash
# API tests
cd api && npm test

# Linting
make lint
```

### Development Mode

```bash
# API (with hot reload)
cd api && npm run dev

# Web UI (with hot reload)
cd web && npm run dev
```

## Management

### Starting/Stopping Services

```bash
# Start all services
make start

# Stop all services
make stop

# Restart services
make restart

# View logs
make logs
```

### Backup and Restore

```bash
# Create backup
make backup

# Restore from backup
make restore backups/lumadesk_backup_20240126_120000.tar.gz
```

### Monitoring

```bash
# Check service status
docker-compose ps

# View API logs
docker-compose logs -f api

# View Sunshine logs
docker-compose logs -f sunshine

# Check database
docker-compose exec postgres psql -U lumadesk -d lumadesk
```

## Troubleshooting

### Common Issues

**1. Admin UI not accessible**
```bash
# Check if web container is running
docker-compose ps web

# Check logs
docker-compose logs web

# Verify port is not in use
netstat -tulpn | grep 8080
```

**2. PXE clients not booting**
```bash
# Check PXE server
docker-compose logs pxe

# Verify TFTP is accessible
tftp 192.168.1.10 -c get boot.ipxe

# Check DHCP configuration
tcpdump -i eth0 port 67 or port 68
```

**3. Sunshine not streaming**
```bash
# Check GPU passthrough
docker exec lumadesk-sunshine ls -la /dev/dri

# Verify Sunshine is running
docker-compose logs sunshine

# Test Sunshine web UI
curl -k https://localhost:47984
```

**4. Database connection errors**
```bash
# Check database status
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready

# Check migrations
docker-compose logs api | grep migration
```

### Debug Mode

Enable debug logging:

```bash
# In .env
LOG_LEVEL=debug

# Restart services
docker-compose restart
```

## Security

See [SECURITY.md](docs/SECURITY.md) for detailed security guidelines.

**Quick Security Checklist:**

- [ ] Change default admin password
- [ ] Set strong JWT secrets
- [ ] Configure CORS origins
- [ ] Enable TLS/HTTPS (reverse proxy)
- [ ] Restrict Sunshine ports to LAN only
- [ ] Regular backups
- [ ] Update Docker images regularly
- [ ] Review audit logs

## API Documentation

### Authentication

All API requests require JWT authentication (except login):

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Use token in subsequent requests
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Key Endpoints

- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/me` - Get current user
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `DELETE /api/users/:id` - Delete user
- `GET /api/devices` - List devices
- `POST /api/devices/:id/pair` - Generate pairing token
- `GET /api/sessions` - List active sessions
- `POST /api/sessions/:id/terminate` - Terminate session
- `GET /api/audit-logs` - View audit logs

See [API.md](docs/API.md) for complete API documentation.

## Hardware Requirements

### Server

**Minimum:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB
- GPU: Intel HD Graphics or equivalent
- Network: Gigabit Ethernet

**Recommended:**
- CPU: 8+ cores
- RAM: 16GB+
- Storage: 100GB+ SSD
- GPU: Dedicated GPU (NVIDIA/AMD)
- Network: 10 Gigabit Ethernet

### Thin Clients

**Minimum:**
- CPU: 2 cores, 2GHz
- RAM: 2GB
- Network: PXE-capable NIC, Gigabit Ethernet
- GPU: Any (used only for decode)
- Storage: None required

## Performance

- **Latency**: <10ms on LAN
- **Bandwidth**: 10-50 Mbps per client (depends on resolution/quality)
- **Concurrent Sessions**: Limited by GPU encoding capacity
- **Boot Time**: 30-60 seconds from power-on to desktop

## Firewall Rules

```bash
# Allow on server
ufw allow 3000/tcp    # API
ufw allow 8080/tcp    # Web UI
ufw allow 47984/tcp   # Sunshine HTTPS
ufw allow 47989/tcp   # Sunshine HTTP
ufw allow 48010/tcp   # Sunshine RTSP
ufw allow 69/udp      # TFTP
ufw allow 8069/tcp    # PXE HTTP
ufw allow 67/udp      # DHCP (if enabled)
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [LizardByte/Sunshine](https://github.com/LizardByte/Sunshine) - Game streaming server
- [Moonlight](https://moonlight-stream.org/) - Game streaming client
- [iPXE](https://ipxe.org/) - Network boot firmware

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/LumaDesk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/LumaDesk/discussions)

## Roadmap

- [ ] LDAP/Active Directory integration
- [ ] Multi-GPU support and load balancing
- [ ] Client OTA updates
- [ ] Session recording and replay
- [ ] Mobile admin app
- [ ] Kubernetes deployment option
- [ ] Custom branding and themes
- [ ] SSO support (OAuth2, SAML)

## Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### User Management
![Users](docs/screenshots/users.png)

### Active Sessions
![Sessions](docs/screenshots/sessions.png)

---

**Made with ❤️ by the LumaDesk team**
