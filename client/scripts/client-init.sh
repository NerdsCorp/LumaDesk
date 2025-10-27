#!/bin/bash
# LumaDesk Client Init Script
# Runs on client boot, sets up environment and starts X server with XDMCP

set -e

echo "========================================="
echo "LumaDesk Thin Client Starting..."
echo "========================================="

# Configuration from kernel command line or environment
API_URL="${API_URL:-http://192.168.1.10:3000}"
XSERVER_HOST="${XSERVER_HOST:-192.168.1.10}"
XDMCP_PORT="${XDMCP_PORT:-177}"
SESSION_TOKEN="${SESSION_TOKEN:-}"

# Create necessary directories
mkdir -p /var/log/lumadesk /var/run/lumadesk /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

# Get device ID
DEVICE_ID=$(cat /sys/class/dmi/id/product_uuid 2>/dev/null || uuidgen)
echo "$DEVICE_ID" > /var/run/lumadesk/device-id

echo "Device ID: $DEVICE_ID"
echo "API URL: $API_URL"
echo "X Server Host: $XSERVER_HOST"
echo "XDMCP Port: $XDMCP_PORT"

# Configure network (should already be done by kernel/initramfs)
echo "Checking network configuration..."
ip addr show

# Wait for network connectivity
echo "Waiting for network connectivity..."
for i in {1..30}; do
    if ping -c 1 -W 1 "$XSERVER_HOST" > /dev/null 2>&1; then
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

echo "========================================="
echo "Starting X Server with XDMCP..."
echo "========================================="
echo "Connecting to: $XSERVER_HOST:$XDMCP_PORT"
echo ""

# Start X server with XDMCP query
# The X server will connect to the XDMCP server and display the login screen
X :0 \
    -query "$XSERVER_HOST" \
    -once \
    -retro \
    -terminate \
    -noreset \
    vt7 \
    2>&1 | tee /var/log/lumadesk/xserver.log &

X_PID=$!
echo "$X_PID" > /var/run/lumadesk/x.pid

echo "========================================="
echo "LumaDesk Client Started Successfully"
echo "========================================="
echo "Agent PID: $AGENT_PID"
echo "X Server PID: $X_PID"
echo ""
echo "X Server connecting to $XSERVER_HOST..."
echo "Login screen should appear shortly"
echo ""
echo "Press Ctrl+C to shutdown"

# Wait for X server (it will exit when session ends)
wait $X_PID

echo ""
echo "Session ended. Rebooting..."
sleep 2
reboot
