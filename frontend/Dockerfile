# Stage 1: Build stage
FROM node:18-alpine3.18 AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Set Vite build environment variables
ENV VITE_API_URL=/api
RUN npm run build

# Stage 2: Production stage using Nginx
FROM nginx:alpine3.18

# Copy built static files from builder stage
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
