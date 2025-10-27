# LumaDesk RDP Service

RDP (Remote Desktop Protocol) service with xrdp for Wayland session support and Windows RDP client compatibility.

## Features

- **Wayland Support**: Run Wayland sessions (though most desktops fall back to X11 via xrdp)
- **Encrypted**: RDP has built-in TLS encryption
- **Windows Compatible**: Works with Windows Remote Desktop client
- **Multiple Desktops**: KDE, GNOME, XFCE

## Build

```bash
# Build with XFCE (default)
docker build -t lumadesk/rdp-xfce:latest ./rdp-service

# Build with KDE
docker build --build-arg DESKTOP=kde -t lumadesk/rdp-kde:latest ./rdp-service

# Build with GNOME
docker build --build-arg DESKTOP=gnome -t lumadesk/rdp-gnome:latest ./rdp-service
```

## Usage

```bash
# Run RDP server
docker run -d -p 3389:3389 \
  -e DESKTOP_ENVIRONMENT=xfce \
  lumadesk/rdp-xfce:latest

# Connect from Windows
mstsc /v:server-ip:3389

# Connect from Linux
xfreerdp /v:server-ip /u:username /p:password
```

## Ports

- **3389/tcp**: RDP

## Desktop Environments

- **XFCE**: Lightweight, fast (2 GB RAM per user)
- **KDE**: Modern, feature-rich (3 GB RAM per user)
- **GNOME**: Polished, popular (4 GB RAM per user)

## vs X11/XDMCP

| Feature | RDP | X11/XDMCP |
|---------|-----|-----------|
| Encryption | Yes (TLS) | No (add VPN) |
| Wayland | Partial | No |
| Bandwidth | Higher | Lower |
| Latency | 10-30ms | 1-5ms |
| Best For | WAN, Remote | LAN, Low-latency |
