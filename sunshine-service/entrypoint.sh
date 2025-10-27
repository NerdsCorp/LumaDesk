#!/bin/bash
set -e

echo "Starting LumaDesk Sunshine Service..."

# Set up permissions
chown -R sunshine:sunshine /config

# Create default Sunshine configuration if it doesn't exist
if [ ! -f /config/sunshine.conf ]; then
    echo "Creating default Sunshine configuration..."
    cat > /config/sunshine.conf <<EOF
# LumaDesk Sunshine Configuration
# This file is auto-generated on first run

# Output settings
output_name = 0

# Encoder settings
encoder = auto
# Use software encoding if GPU not available
sw_preset = superfast

# Network settings
address_family = both
port = 47989

# Security settings
# Credentials and pairing will be managed by LumaDesk API
credentials_file = /config/credentials.json

# UPnP
upnp = disabled

# Logging
min_log_level = info
log_path = /config/sunshine.log
EOF
    chown sunshine:sunshine /config/sunshine.conf
fi

# Start Sunshine as the sunshine user
exec su -c "/usr/bin/sunshine /config/sunshine.conf" sunshine
