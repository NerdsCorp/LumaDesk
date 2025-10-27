# LumaDesk Client Runtime Container
# Minimal Alpine-based client that runs X server with XDMCP

FROM alpine:latest

# Install required packages
RUN apk add --no-cache \
    bash \
    curl \
    wget \
    ca-certificates \
    procps \
    net-tools \
    iproute2 \
    && rm -rf /var/cache/apk/*

# Install X.org server for XDMCP thin client
COPY scripts/install-xorg.sh /tmp/
RUN chmod +x /tmp/install-xorg.sh && /tmp/install-xorg.sh

# Create lumadesk user
RUN addgroup -g 1000 lumadesk && \
    adduser -u 1000 -G lumadesk -h /home/lumadesk -s /bin/bash -D lumadesk

# Copy client agent
COPY scripts/client-agent.sh /usr/local/bin/lumadesk-agent
COPY scripts/client-init.sh /usr/local/bin/lumadesk-init

RUN chmod +x /usr/local/bin/lumadesk-agent /usr/local/bin/lumadesk-init

# Create config directory
RUN mkdir -p /etc/lumadesk /var/log/lumadesk && \
    chown lumadesk:lumadesk /var/log/lumadesk

WORKDIR /home/lumadesk

ENTRYPOINT ["/usr/local/bin/lumadesk-init"]
