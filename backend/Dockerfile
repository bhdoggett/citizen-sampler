# Use Node 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy only package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Build the project
RUN npm run build

# Set command to run the built app
CMD ["node", "dist/index.js"]
