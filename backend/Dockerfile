
# Base Image
FROM node:18-alpine

# Set working directory
WORKDIR /app


# Copy package.json and install deps

COPY package*.json ./

# Install only production dependencies (nodemon will be skipped automatically)
RUN npm install --production

# Copy the rest of the backend source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start the backend
CMD ["node", "server.js"]
