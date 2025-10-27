#!/bin/bash
set -e

# Install Moonlight client dependencies
# Note: This is a placeholder. In production, you would:
# 1. Build Moonlight from source, or
# 2. Download pre-built binaries, or
# 3. Install from package repository

echo "Installing Moonlight client..."

# Install additional dependencies for Moonlight
apk add --no-cache \
    sdl2 \
    opus \
    ffmpeg \
    alsa-lib \
    pulseaudio \
    libva \
    libvdpau

# Create moonlight config directory
mkdir -p /etc/moonlight

# Create a placeholder script (replace with actual Moonlight binary)
cat > /usr/local/bin/moonlight <<'EOF'
#!/bin/bash
# Moonlight launcher script
# In production, this would launch the actual Moonlight client

echo "Starting Moonlight client..."
echo "Server: ${SUNSHINE_HOST:-sunshine}"
echo "Mode: ${STREAM_MODE:-desktop}"

# This is a placeholder
# Real implementation would launch: moonlight stream --host $SUNSHINE_HOST --app Desktop
while true; do
    echo "Moonlight streaming session active..."
    sleep 60
done
EOF

chmod +x /usr/local/bin/moonlight

echo "Moonlight installation completed"
echo "Note: This is a placeholder. Replace with actual Moonlight binary for production."
