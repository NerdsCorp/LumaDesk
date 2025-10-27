#!/bin/bash
set -e

DESKTOP="${DESKTOP_ENVIRONMENT:-xfce}"

echo "========================================="
echo "Starting LumaDesk RDP Service (Wayland)"
echo "Desktop Environment: $DESKTOP"
echo "========================================="

# Initialize D-Bus
mkdir -p /var/run/dbus
rm -f /var/run/dbus/pid
dbus-daemon --system --fork

# Generate xrdp keys if they don't exist
if [ ! -f /etc/xrdp/rsakeys.ini ]; then
    xrdp-keygen xrdp /etc/xrdp/rsakeys.ini
fi

# Start xrdp-sesman (session manager)
/usr/sbin/xrdp-sesman

# Start xrdp
echo "Starting xrdp on port 3389..."
exec /usr/sbin/xrdp --nodaemon
