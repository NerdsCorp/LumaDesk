FROM ubuntu:22.04

ARG DESKTOP=xfce
ENV DEBIAN_FRONTEND=noninteractive

# Install xrdp and desktop environment
RUN apt-get update && apt-get install -y \
    xrdp \
    xorgxrdp \
    dbus-x11 \
    firefox \
    vim \
    curl \
    wget \
    net-tools \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install desktop environment
RUN if [ "$DESKTOP" = "kde" ]; then \
      apt-get update && apt-get install -y \
      kde-plasma-desktop \
      sddm \
      && rm -rf /var/lib/apt/lists/*; \
    elif [ "$DESKTOP" = "gnome" ]; then \
      apt-get update && apt-get install -y \
      ubuntu-gnome-desktop \
      && rm -rf /var/lib/apt/lists/*; \
    else \
      apt-get update && apt-get install -y \
      xfce4 \
      xfce4-goodies \
      && rm -rf /var/lib/apt/lists/*; \
    fi

# Configure xrdp
RUN sed -i 's/3389/3389/g' /etc/xrdp/xrdp.ini && \
    sed -i 's/max_bpp=32/max_bpp=24/g' /etc/xrdp/xrdp.ini && \
    sed -i 's/#max_bpp=24/max_bpp=24/g' /etc/xrdp/xrdp.ini

# Add xrdp user to ssl-cert group
RUN adduser xrdp ssl-cert

# Configure desktop session
RUN mkdir -p /etc/xrdp
COPY startwm.sh /etc/xrdp/startwm.sh
RUN chmod +x /etc/xrdp/startwm.sh

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose RDP port
EXPOSE 3389/tcp

ENTRYPOINT ["/entrypoint.sh"]
