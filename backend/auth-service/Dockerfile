# Auth Service Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (postinstall will run prisma generate)
RUN npm ci --include=dev

# Copy application code
COPY . .

# Regenerate Prisma client for the correct platform
RUN npx prisma generate --schema=./shared/prisma/schema.prisma

# Expose the service port
EXPOSE 3001

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "start"]
