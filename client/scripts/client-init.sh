#!/bin/bash
# LumaDesk Client Init Script
# Runs on client boot, sets up environment and starts services

set -e

echo "========================================="
echo "LumaDesk Thin Client Starting..."
echo "========================================="

# Configuration from kernel command line or environment
API_URL="${API_URL:-http://192.168.1.10:3000}"
SUNSHINE_HOST="${SUNSHINE_HOST:-192.168.1.10}"
SESSION_TOKEN="${SESSION_TOKEN:-}"

# Create necessary directories
mkdir -p /var/log/lumadesk /var/run/lumadesk

# Get device ID
DEVICE_ID=$(cat /sys/class/dmi/id/product_uuid 2>/dev/null || uuidgen)
echo "$DEVICE_ID" > /var/run/lumadesk/device-id

echo "Device ID: $DEVICE_ID"
echo "API URL: $API_URL"
echo "Sunshine Host: $SUNSHINE_HOST"

# Configure network (should already be done by kernel/initramfs)
echo "Checking network configuration..."
ip addr show

# Wait for network connectivity
echo "Waiting for network connectivity..."
for i in {1..30}; do
    if ping -c 1 -W 1 "$SUNSHINE_HOST" > /dev/null 2>&1; then
        echo "Network is up!"
        break
    fi
    echo "Waiting for network... ($i/30)"
    sleep 1
done

# Start client agent in background
echo "Starting LumaDesk client agent..."
export API_URL DEVICE_ID
/usr/local/bin/lumadesk-agent &
AGENT_PID=$!
echo "$AGENT_PID" > /var/run/lumadesk/agent.pid

# Save session token if provided
if [ -n "$SESSION_TOKEN" ]; then
    echo "$SESSION_TOKEN" > /tmp/session-token
    echo "Session token loaded"
fi

# Start X server and Moonlight client
echo "Starting X server and streaming client..."

# Set display
export DISPLAY=:0
export SUNSHINE_HOST

# Start X server as lumadesk user
su - lumadesk -c "startx" &
X_PID=$!
echo "$X_PID" > /var/run/lumadesk/x.pid

echo "========================================="
echo "LumaDesk Client Started Successfully"
echo "========================================="
echo "Agent PID: $AGENT_PID"
echo "X Server PID: $X_PID"
echo ""
echo "Press Ctrl+C to shutdown"

# Wait for processes
wait
