# Dockerfile for SA-HALL React + Vite Application
# Production build

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 viteuser

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Install serve package for production
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Set the correct permission for the dist folder
RUN chown -R viteuser:nodejs /app

USER viteuser

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
