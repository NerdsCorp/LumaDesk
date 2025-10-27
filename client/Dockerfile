# LumaDesk Client Runtime Container
# Minimal Alpine-based client that runs Moonlight and connects to Sunshine

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
    xorg-server \
    xf86-video-fbdev \
    xf86-input-evdev \
    xinit \
    openbox \
    && rm -rf /var/cache/apk/*

# Install Moonlight (placeholder - will need to build or download binary)
# For now, we'll create a script that can download and setup Moonlight
COPY scripts/install-moonlight.sh /tmp/
RUN chmod +x /tmp/install-moonlight.sh && /tmp/install-moonlight.sh

# Create lumadesk user
RUN addgroup -g 1000 lumadesk && \
    adduser -u 1000 -G lumadesk -h /home/lumadesk -s /bin/bash -D lumadesk

# Copy client agent
COPY scripts/client-agent.sh /usr/local/bin/lumadesk-agent
COPY scripts/client-init.sh /usr/local/bin/lumadesk-init
COPY rootfs/xinitrc /home/lumadesk/.xinitrc

RUN chmod +x /usr/local/bin/lumadesk-agent /usr/local/bin/lumadesk-init && \
    chown -R lumadesk:lumadesk /home/lumadesk

# Create config directory
RUN mkdir -p /etc/lumadesk /var/log/lumadesk && \
    chown lumadesk:lumadesk /var/log/lumadesk

WORKDIR /home/lumadesk

ENTRYPOINT ["/usr/local/bin/lumadesk-init"]
