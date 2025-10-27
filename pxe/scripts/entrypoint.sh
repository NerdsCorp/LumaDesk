#!/bin/bash
set -e

echo "Starting LumaDesk PXE Server..."

# Configure dnsmasq from environment variables
if [ "${PXE_DHCP_ENABLED}" = "true" ]; then
    echo "Configuring DHCP server..."

    # Add DHCP range to config
    cat >> /etc/dnsmasq.conf <<EOF

# DHCP Configuration (from environment)
dhcp-range=${PXE_DHCP_RANGE_START},${PXE_DHCP_RANGE_END},12h
dhcp-option=option:router,${PXE_DHCP_GATEWAY}
dhcp-option=option:dns-server,${PXE_DHCP_DNS}
dhcp-option=option:netmask,${PXE_DHCP_NETMASK}

# Next server (PXE boot server)
dhcp-option=option:tftp-server,${PXE_SERVER_IP}
dhcp-next-server=${PXE_SERVER_IP}
EOF
else
    echo "DHCP server disabled. Using existing DHCP with next-server pointing to ${PXE_SERVER_IP}"
fi

# Generate default iPXE boot script
echo "Generating iPXE boot script..."
/usr/local/bin/generate-ipxe

# Start nginx in background
echo "Starting HTTP server..."
nginx

# Start dnsmasq in foreground
echo "Starting TFTP/DHCP server..."
exec dnsmasq --no-daemon --log-facility=-
