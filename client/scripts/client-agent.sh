#!/bin/bash
# LumaDesk Client Agent
# Manages registration, heartbeat, and session lifecycle

set -e

# Configuration
API_URL="${API_URL:-http://192.168.1.10:3000}"
DEVICE_ID="${DEVICE_ID:-$(cat /sys/class/dmi/id/product_uuid 2>/dev/null || uuidgen)}"
HEARTBEAT_INTERVAL=${HEARTBEAT_INTERVAL:-30}
LOG_FILE="/var/log/lumadesk/agent.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Get device information
get_device_info() {
    HOSTNAME=$(hostname)
    MAC_ADDRESS=$(ip link show | grep ether | head -1 | awk '{print $2}')
    IP_ADDRESS=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1)
}

# Register device with API
register_device() {
    log "Registering device with LumaDesk API..."
    get_device_info

    RESPONSE=$(curl -s -X POST "${API_URL}/api/devices/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"device_id\": \"${DEVICE_ID}\",
            \"hostname\": \"${HOSTNAME}\",
            \"mac_address\": \"${MAC_ADDRESS}\",
            \"ip_address\": \"${IP_ADDRESS}\"
        }" || echo "")

    if [ -n "$RESPONSE" ]; then
        log "Device registered successfully"
        echo "$RESPONSE" > /tmp/device-info.json
        return 0
    else
        log "ERROR: Failed to register device"
        return 1
    fi
}

# Send heartbeat to API
send_heartbeat() {
    if [ -z "$SESSION_TOKEN" ]; then
        return 1
    fi

    curl -s -X POST "${API_URL}/api/sessions/heartbeat" \
        -H "Content-Type: application/json" \
        -d "{
            \"device_id\": \"${DEVICE_ID}\",
            \"session_token\": \"${SESSION_TOKEN}\"
        }" > /dev/null 2>&1

    return $?
}

# Main agent loop
main() {
    log "Starting LumaDesk Client Agent"
    log "Device ID: ${DEVICE_ID}"
    log "API URL: ${API_URL}"

    # Register device on startup
    register_device || log "WARNING: Device registration failed, will retry..."

    # Load session token if exists
    if [ -f /tmp/session-token ]; then
        SESSION_TOKEN=$(cat /tmp/session-token)
        log "Loaded existing session token"
    fi

    # Main loop
    while true; do
        # Send heartbeat if we have a session
        if [ -n "$SESSION_TOKEN" ]; then
            if send_heartbeat; then
                log "Heartbeat sent successfully"
            else
                log "Heartbeat failed, session may have expired"
                SESSION_TOKEN=""
                rm -f /tmp/session-token
            fi
        else
            log "No active session, waiting for session token..."
            # Try to get session token from file (would be set by boot process)
            if [ -f /tmp/session-token ]; then
                SESSION_TOKEN=$(cat /tmp/session-token)
                log "New session token loaded"
            fi
        fi

        sleep "$HEARTBEAT_INTERVAL"
    done
}

# Handle signals
trap 'log "Agent shutting down..."; exit 0' SIGTERM SIGINT

# Start agent
main
