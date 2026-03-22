FROM node:20-alpine

WORKDIR /app

# Copy package files and install
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy server source
COPY src/ ./src/

# Expose Colyseus port
EXPOSE 2567

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:2567/health || exit 1

# Start server
CMD ["node", "src/index.js"]
