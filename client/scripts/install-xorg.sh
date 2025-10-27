#!/bin/bash
set -e

# Install X.org server and drivers for thin client

echo "Installing X.org server..."

apk add --no-cache \
    xorg-server \
    xf86-video-vesa \
    xf86-video-fbdev \
    xf86-input-evdev \
    xf86-input-keyboard \
    xf86-input-mouse \
    xinit \
    xauth \
    xrandr \
    xdpyinfo

# Create X server configuration for XDMCP
mkdir -p /etc/X11

cat > /etc/X11/xorg.conf.d/10-headless.conf <<'EOF'
Section "Device"
    Identifier "Card0"
    Driver "fbdev"
EndSection

Section "Screen"
    Identifier "Screen0"
    Device "Card0"
EndSection
EOF

echo "X.org installation completed"
