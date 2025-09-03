# Stage 1: Build
FROM node:20-alpine

WORKDIR /app

# Copy package files and install both production and development dependencies
COPY package*.json ./
COPY package-lock*.json ./

# Install all dependencies (including devDependencies) in the builder stage
RUN npm install && npm cache clean --force

# Copy the rest of the application files
COPY . .

EXPOSE 8081

# Start the application in development mode
CMD ["npm", "run", "dev"]