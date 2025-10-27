FROM alpine:latest

# Install dnsmasq, tftp, nginx, and utilities
RUN apk add --no-cache \
    dnsmasq \
    tftp-hpa \
    nginx \
    bash \
    curl \
    wget \
    ipxe \
    && rm -rf /var/cache/apk/*

# Create necessary directories
RUN mkdir -p /var/lib/tftpboot \
    /var/www/html \
    /etc/pxe \
    /run/nginx

# Copy configuration files
COPY config/dnsmasq.conf /etc/dnsmasq.conf
COPY config/nginx.conf /etc/nginx/http.d/default.conf
COPY scripts/entrypoint.sh /entrypoint.sh
COPY scripts/generate-ipxe.sh /usr/local/bin/generate-ipxe

# Copy iPXE boot files
RUN cp /usr/share/ipxe/undionly.kpxe /var/lib/tftpboot/ 2>/dev/null || true
RUN cp /usr/share/ipxe/ipxe.efi /var/lib/tftpboot/ 2>/dev/null || true

# Make scripts executable
RUN chmod +x /entrypoint.sh /usr/local/bin/generate-ipxe

# Expose ports
# TFTP
EXPOSE 69/udp
# HTTP
EXPOSE 80
# DHCP
EXPOSE 67/udp 67/tcp

ENTRYPOINT ["/entrypoint.sh"]
