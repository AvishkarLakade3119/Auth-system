# 1️⃣ Build Stage (Vite Build)
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the source code
COPY . .

# Build the Vite app
RUN npm run build

# 2️⃣ Production Stage (NGINX)
FROM nginx:stable-alpine

# Remove default NGINX website
RUN rm -rf /usr/share/nginx/html/*

# Copy Vite build output to NGINX
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
