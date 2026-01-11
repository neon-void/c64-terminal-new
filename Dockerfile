# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
# Skip prepare script (husky) in Docker
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Version from git commit
ARG APP_VERSION=0000
ENV APP_VERSION=${APP_VERSION}

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose ports (API and TCP)
EXPOSE 9000 10000

# Start the application
CMD ["node", "dist/main.js"]
