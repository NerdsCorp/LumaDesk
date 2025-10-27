# LumaDesk X Server Service

This container runs an X server with XDMCP (X Display Manager Control Protocol) enabled, allowing thin clients to connect and run remote desktop sessions.

## Architecture

Traditional thin client architecture:
- **Server**: Runs X applications and display manager (LightDM)
- **Client**: Runs X server that displays output from server
- **Protocol**: XDMCP for session management, X11 for display

```
┌─────────────────────────┐
│   Thin Client (X.org)   │
│   - X Server            │
│   - Keyboard/Mouse      │
│   - Display output      │
└───────────┬─────────────┘
            │ XDMCP (UDP 177)
            │ X11 (TCP 6000+)
┌───────────┴─────────────┐
│   LumaDesk Server       │
│   - LightDM (XDMCP)     │
│   - XFCE Desktop        │
│   - Applications        │
│   - User sessions       │
└─────────────────────────┘
```

## Components

### LightDM
- Display manager with XDMCP support
- Handles user authentication
- Manages X sessions
- Provides login greeter

### XFCE Desktop
- Lightweight desktop environment
- Fast and responsive
- Good for remote sessions
- Customizable

### XDMCP
- Session discovery and management
- User authentication
- Display allocation
- Session lifecycle

## Configuration

### Ports

- **177/udp**: XDMCP (required)
- **6000-6010/tcp**: X11 displays (X display 0-10)

### Environment Variables

- `DISPLAY_MANAGER`: Display manager to use (default: lightdm)
- `DESKTOP_ENVIRONMENT`: Desktop to use (default: xfce4)
- `XDMCP_PORT`: XDMCP port (default: 177)

### Volumes

- `/home`: User home directories (persistent)
- `/var/log/lightdm`: LightDM logs

## Usage

### Start the service

```bash
docker-compose up -d xserver
```

### Create users

```bash
# Add user via API
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username":"john","email":"john@example.com","password":"password123"}'

# Or manually in container
docker exec lumadesk-xserver useradd -m -s /bin/bash john
docker exec lumadesk-xserver passwd john
```

### Test XDMCP

From a client with X installed:

```bash
# Query available displays
Xorg -query <server-ip> :1

# Or use X with indirect XDMCP
X :1 -query <server-ip>
```

## Security

### XDMCP Security Considerations

⚠️ **XDMCP is not encrypted by default**

**For production:**

1. **Use VPN or isolated network**
   - XDMCP should only run on trusted networks
   - Consider IPsec or VPN tunnel

2. **SSH tunneling** (alternative)
   ```bash
   ssh -X user@server application
   ```

3. **X11 Forwarding with compression**
   ```bash
   ssh -XC user@server
   ```

4. **Network isolation**
   - Keep X server traffic on separate VLAN
   - Firewall rules to restrict access

### Firewall Rules

```bash
# Allow XDMCP from thin client network only
ufw allow from 192.168.2.0/24 to any port 177 proto udp

# Allow X11 connections from thin client network
ufw allow from 192.168.2.0/24 to any port 6000:6010 proto tcp
```

## Desktop Environments

### Current: XFCE4
- Fast and lightweight
- Good for remote sessions
- Low resource usage

### Alternatives

**GNOME:**
```dockerfile
RUN apt-get install -y gnome-session gdm3
```

**KDE Plasma:**
```dockerfile
RUN apt-get install -y kde-plasma-desktop sddm
```

**Minimal (Window Manager only):**
```dockerfile
RUN apt-get install -y openbox tint2 pcmanfm
```

## User Management

### Creating Users

Users can be created via:

1. **LumaDesk API** (recommended)
   - Automatic sync with system users
   - Managed through web UI

2. **Direct in container**
   ```bash
   docker exec lumadesk-xserver useradd -m -s /bin/bash username
   docker exec lumadesk-xserver passwd username
   ```

### Home Directories

User home directories can be:
- **Local**: Stored in container volume
- **NFS**: Mounted from network storage
- **LDAP**: Centralized user management

## Performance Tuning

### X Server Settings

**Disable compositing for better performance:**
```bash
# In XFCE Settings → Window Manager Tweaks → Compositor
# Uncheck "Enable display compositing"
```

**Optimize network:**
```bash
# Add to /etc/ssh/ssh_config for X forwarding
Compression yes
CompressionLevel 6
```

### Session Limits

Configure in `lightdm.conf`:
```ini
[Seat:*]
# Maximum sessions per user
maximum-sessions=1

# Session timeout
session-timeout=0
```

## Troubleshooting

### Check XDMCP is listening

```bash
docker exec lumadesk-xserver netstat -uln | grep 177
```

### View LightDM logs

```bash
docker exec lumadesk-xserver cat /var/log/lightdm/lightdm.log
docker exec lumadesk-xserver cat /var/log/lightdm/x-0.log
```

### Test from client

```bash
# Test XDMCP query
X -query <server-ip> :1

# If X starts but no login screen, check:
# 1. Firewall rules
# 2. XDMCP configuration
# 3. LightDM logs
```

### Common Issues

**1. Connection refused**
- Check firewall rules
- Verify XDMCP is enabled in lightdm.conf
- Check port 177/udp is open

**2. Login screen doesn't appear**
- Check LightDM greeter is installed
- Verify X server can connect to display
- Check logs for errors

**3. Session starts but closes immediately**
- Check user's shell is valid
- Verify desktop environment is installed
- Check session logs in ~/.xsession-errors

## Monitoring

### Active Sessions

```bash
# List logged-in users
docker exec lumadesk-xserver who

# Show X sessions
docker exec lumadesk-xserver ps aux | grep X

# Display manager status
docker exec lumadesk-xserver systemctl status lightdm
```

### Resource Usage

```bash
# Per-user resource usage
docker exec lumadesk-xserver ps aux --sort=-%cpu | head

# Memory usage
docker stats lumadesk-xserver
```

## Comparison with Sunshine

| Feature | X Server/XDMCP | Sunshine/Moonlight |
|---------|----------------|-------------------|
| Protocol | X11/XDMCP | H.264/H.265 streaming |
| Encryption | No (use VPN) | Yes (TLS) |
| Bandwidth | Low-Medium | Higher |
| Latency | Very Low | Low |
| GPU Required | No | Yes |
| Client Software | X.org | Moonlight |
| Setup Complexity | Simple | Complex |
| Best For | LAN thin clients | Remote gaming/WAN |

## Benefits of X Server Approach

✅ **Simpler**: No video encoding/decoding
✅ **Lower latency**: Direct X11 protocol
✅ **No GPU required**: CPU-only operation
✅ **Traditional**: Proven thin client technology
✅ **Lower bandwidth**: For typical office apps
✅ **Better for text**: Crisp text rendering

## Limitations

❌ **No encryption**: Requires VPN for security
❌ **LAN-optimized**: Not ideal for WAN
❌ **No video acceleration**: Poor for video/gaming
❌ **Network-dependent**: Latency sensitive

## Recommendations

**Use X Server/XDMCP when:**
- Local network deployment
- Office/productivity applications
- Lower hardware requirements
- Traditional thin client infrastructure

**Consider alternatives when:**
- Remote access over internet required
- Video/multimedia applications important
- Built-in encryption required
- Gaming or CAD applications
