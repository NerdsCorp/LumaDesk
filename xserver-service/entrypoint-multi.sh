#!/bin/bash
set -e

DESKTOP="${DESKTOP_ENVIRONMENT:-xfce}"

echo "========================================="
echo "Starting LumaDesk X Server Service"
echo "Desktop Environment: $DESKTOP"
echo "========================================="

# Initialize D-Bus
mkdir -p /var/run/dbus
rm -f /var/run/dbus/pid
dbus-daemon --system --fork

# Create necessary directories
mkdir -p /var/run/lightdm /var/log/lightdm /var/lib/lightdm
chown -R root:root /var/run/lightdm /var/log/lightdm /var/lib/lightdm

# Configure LightDM session based on desktop
case "$DESKTOP" in
  kde)
    export DESKTOP_SESSION=plasma
    export XDG_SESSION_DESKTOP=plasma
    export XDG_CURRENT_DESKTOP=KDE
    ;;
  gnome)
    export DESKTOP_SESSION=gnome
    export XDG_SESSION_DESKTOP=gnome
    export XDG_CURRENT_DESKTOP=GNOME
    ;;
  xfce|*)
    export DESKTOP_SESSION=xfce
    export XDG_SESSION_DESKTOP=xfce
    export XDG_CURRENT_DESKTOP=XFCE
    ;;
esac

# Update LightDM config with desktop session
sed -i "s/user-session=.*/user-session=$DESKTOP_SESSION/" /etc/lightdm/lightdm.conf.d/50-xdmcp.conf

# Display configuration
echo "Configuration:"
echo "  XDMCP Port: 177/udp"
echo "  X11 Ports: 6000-6010/tcp"
echo "  Desktop: $DESKTOP ($DESKTOP_SESSION)"
echo ""

# Start health check server in background
/usr/local/bin/health-server &

# Start LightDM with XDMCP
echo "Starting LightDM..."
exec /usr/sbin/lightdm
