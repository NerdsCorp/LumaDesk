#!/bin/bash
set -e

echo "Starting LumaDesk X Server Service..."

# Initialize D-Bus
mkdir -p /var/run/dbus
rm -f /var/run/dbus/pid
dbus-daemon --system --fork

# Create necessary directories
mkdir -p /var/run/lightdm /var/log/lightdm /var/lib/lightdm
chown -R root:root /var/run/lightdm /var/log/lightdm /var/lib/lightdm

# Display configuration
echo "XDMCP Server Configuration:"
echo "  Port: 177/udp"
echo "  X Display Ports: 6000-6010/tcp"
echo "  Desktop Environment: XFCE4"
echo ""

# Start LightDM with XDMCP
echo "Starting LightDM with XDMCP..."
exec /usr/sbin/lightdm --debug
