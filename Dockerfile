# Multi-stage Docker build for Quizrun
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and frontend configs
COPY package.json ./
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
RUN cd frontend && npm ci || npm install

# Copy frontend source code and build production bundle
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copy backend configs and install production dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend assets from builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose container port
EXPOSE 8080

# Start server
CMD ["node", "backend/server.js"]
