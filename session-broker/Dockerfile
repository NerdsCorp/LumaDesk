FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src

# Create non-root user
RUN addgroup -g 1001 -S broker && \
    adduser -u 1001 -S broker -G broker

USER broker

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
