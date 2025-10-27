# LumaDesk PXE Boot Service

This service provides PXE boot capabilities for LumaDesk thin clients.

## Features

- **TFTP Server**: Serves iPXE bootloader and boot scripts
- **HTTP Server**: Serves kernel, initramfs, and client images
- **DHCP Server** (optional): Can provide DHCP services or integrate with existing DHCP
- **iPXE Support**: Both BIOS and UEFI boot modes

## Architecture

```
Client Boot Flow:
1. Client powers on → PXE ROM requests DHCP
2. DHCP responds with PXE server IP and bootloader filename
3. Client downloads iPXE bootloader via TFTP
4. iPXE executes boot script (boot.ipxe)
5. iPXE downloads kernel and initramfs via HTTP
6. Linux kernel boots with custom init system
7. Init system connects to LumaDesk API and Sunshine
```

## Configuration

### Environment Variables

- `PXE_DHCP_ENABLED`: Enable/disable built-in DHCP server (true/false)
- `PXE_DHCP_RANGE_START`: DHCP pool start IP
- `PXE_DHCP_RANGE_END`: DHCP pool end IP
- `PXE_DHCP_SUBNET`: Network subnet
- `PXE_DHCP_NETMASK`: Network netmask
- `PXE_DHCP_GATEWAY`: Default gateway
- `PXE_DHCP_DNS`: DNS server
- `PXE_SERVER_IP`: PXE server IP address
- `API_URL`: LumaDesk API URL

### Volumes

- `/var/lib/tftpboot`: TFTP root directory (bootloaders, iPXE scripts)
- `/var/www/html`: HTTP root directory (kernel, initramfs, client images)
- `/etc/pxe`: Custom configuration files

### Ports

- `69/udp`: TFTP
- `80/tcp`: HTTP
- `67/udp`: DHCP (if enabled)

## Network Setup

### Option 1: Built-in DHCP (Isolated Network)

Set `PXE_DHCP_ENABLED=true` and configure DHCP range. Best for isolated networks.

```yaml
environment:
  PXE_DHCP_ENABLED: "true"
  PXE_DHCP_RANGE_START: 192.168.1.100
  PXE_DHCP_RANGE_END: 192.168.1.200
```

### Option 2: Existing DHCP Server

Set `PXE_DHCP_ENABLED=false` and configure your existing DHCP server:

```
# ISC DHCP example
next-server 192.168.1.10;
filename "undionly.kpxe";

# dnsmasq example
dhcp-boot=undionly.kpxe,lumadesk-pxe,192.168.1.10
```

## BIOS vs UEFI

The PXE server automatically detects client architecture:

- **BIOS**: Serves `undionly.kpxe`
- **UEFI 64-bit**: Serves `ipxe.efi`
- **UEFI 32-bit**: Serves `ipxe.efi`

## Boot Files

### Required Files

Place these files in `/var/www/html`:

1. **vmlinuz**: Linux kernel
2. **initramfs.img**: Initial ramdisk with LumaDesk client

### Generating Boot Files

Use the provided script:

```bash
./scripts/build-client-image.sh
```

This will:
1. Build a minimal Linux kernel
2. Create an initramfs with LumaDesk client agent
3. Copy files to the PXE HTTP directory

## Testing

### Test TFTP

```bash
tftp 192.168.1.10
> get boot.ipxe
> quit
```

### Test HTTP

```bash
curl http://192.168.1.10/
curl http://192.168.1.10/boot.ipxe
```

### Test DHCP

```bash
# From a client machine
dhclient -v eth0
```

### Test PXE Boot

Use QEMU for testing:

```bash
qemu-system-x86_64 \
  -m 2048 \
  -boot n \
  -netdev user,id=net0,tftp=/var/lib/tftpboot,bootfile=boot.ipxe \
  -device e1000,netdev=net0
```

## Troubleshooting

### Client not getting DHCP

- Check firewall allows UDP port 67
- Verify DHCP range is correct
- Check network interface in container

### Client not downloading bootloader

- Check firewall allows UDP port 69 (TFTP)
- Verify TFTP directory has correct permissions
- Check DHCP next-server option

### Client not downloading kernel

- Check firewall allows TCP port 80 (HTTP)
- Verify kernel and initramfs exist in /var/www/html
- Check HTTP server logs

### Logs

```bash
# Container logs
docker logs lumadesk-pxe

# dnsmasq logs
docker exec lumadesk-pxe cat /var/log/dnsmasq.log

# nginx logs
docker exec lumadesk-pxe cat /var/log/nginx/access.log
```

## Security

- Run with minimal capabilities (NET_ADMIN, NET_RAW for DHCP)
- Use isolated network for PXE clients
- Implement firewall rules to restrict PXE server access
- Consider HTTPS for boot file downloads
- Use secure boot with signed kernels in production
