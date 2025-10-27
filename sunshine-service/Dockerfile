# LumaDesk Sunshine Service
# Based on LizardByte/Sunshine Docker image with custom configuration

FROM lizardbyte/sunshine:latest

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Create sunshine user and group
ARG PUID=1000
ARG PGID=1000
RUN groupadd -g ${PGID} sunshine && \
    useradd -u ${PUID} -g sunshine -m -s /bin/bash sunshine

# Create config directory
RUN mkdir -p /config && \
    chown -R sunshine:sunshine /config

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose Sunshine ports
# HTTPS Web UI
EXPOSE 47984
# HTTP Web UI
EXPOSE 47989
# Web UI HTTP Redirect
EXPOSE 47990
# RTSP
EXPOSE 48010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f https://localhost:47984 -k || exit 1

ENTRYPOINT ["/entrypoint.sh"]
