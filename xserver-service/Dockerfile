FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install X server, display manager, and desktop environment
RUN apt-get update && apt-get install -y \
    xorg \
    lightdm \
    xfce4 \
    xfce4-goodies \
    dbus-x11 \
    firefox \
    vim \
    curl \
    wget \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Configure LightDM for XDMCP
RUN mkdir -p /etc/lightdm/lightdm.conf.d

COPY lightdm-xdmcp.conf /etc/lightdm/lightdm.conf.d/50-xdmcp.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create lumadesk user for testing
RUN useradd -m -s /bin/bash -G sudo lumadesk && \
    echo "lumadesk:lumadesk" | chpasswd

# Expose XDMCP port
EXPOSE 177/udp
# Expose X11 ports (6000-6010)
EXPOSE 6000-6010/tcp

# Create necessary directories
RUN mkdir -p /var/run/lightdm /var/log/lightdm /var/lib/lightdm

ENTRYPOINT ["/entrypoint.sh"]
