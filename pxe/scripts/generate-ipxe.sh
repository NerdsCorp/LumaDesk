#!/bin/bash

# Generate default iPXE boot script for LumaDesk clients

PXE_SERVER=${PXE_SERVER_IP:-192.168.1.10}
API_URL=${API_URL:-http://api:3000}

cat > /var/lib/tftpboot/boot.ipxe <<EOF
#!ipxe

# LumaDesk PXE Boot Script
# This script is executed by iPXE on client boot

# Set console output
console --picture

# Show boot banner
echo
echo ========================================
echo LumaDesk Thin Client Boot
echo ========================================
echo

# Configure network (DHCP)
echo Configuring network...
dhcp || goto failed

# Show network configuration
echo Network configured:
echo IP: \${net0/ip}
echo Gateway: \${net0/gateway}
echo DNS: \${net0/dns}
echo

# Set base URL for boot files
set base-url http://${PXE_SERVER}

# Boot LumaDesk client
echo Booting LumaDesk client...
echo

# Try to boot from kernel and initramfs
kernel \${base-url}/vmlinuz quiet loglevel=3 init=/init || goto failed
initrd \${base-url}/initramfs.img || goto failed
boot || goto failed

:failed
echo
echo ========================================
echo Boot failed!
echo ========================================
echo
echo Press any key to reboot...
prompt
reboot

:cancel
echo Boot cancelled
reboot
EOF

chmod 644 /var/lib/tftpboot/boot.ipxe
echo "iPXE boot script generated at /var/lib/tftpboot/boot.ipxe"

# Create a simple HTML index for the HTTP server
cat > /var/www/html/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>LumaDesk PXE Server</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        h1 { color: #0ea5e9; }
        .file-list {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        a { color: #0ea5e9; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>LumaDesk PXE Boot Server</h1>
    <p>This server provides PXE boot files for LumaDesk thin clients.</p>

    <h2>Available Boot Files</h2>
    <div class="file-list">
        <ul>
            <li><a href="/vmlinuz">vmlinuz</a> - Linux kernel</li>
            <li><a href="/initramfs.img">initramfs.img</a> - Initial ramdisk</li>
            <li><a href="/boot.ipxe">boot.ipxe</a> - iPXE boot script</li>
        </ul>
    </div>

    <h2>Status</h2>
    <p>Server: <strong>Running</strong></p>
    <p>Server IP: <strong>${PXE_SERVER}</strong></p>

    <h2>Boot Instructions</h2>
    <ol>
        <li>Configure your thin client to boot from network (PXE)</li>
        <li>Ensure DHCP is pointing to this server (${PXE_SERVER})</li>
        <li>Power on the thin client</li>
        <li>The client will automatically boot into LumaDesk</li>
    </ol>
</body>
</html>
EOF

echo "HTTP index page created"
