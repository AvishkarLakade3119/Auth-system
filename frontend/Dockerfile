
# 1. Build Stage (Vite Build)
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY . .

RUN npm install
RUN npm run build

# 2. Production Stage (NGINX)
FROM nginx:stable-alpine

# Remove default NGINX website
RUN rm -rf /usr/share/nginx/html/*

# Copy Vite build output to NGINX
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
