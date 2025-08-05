# Use a base Node image
FROM node:18

# Create working directory
WORKDIR /app

# Copy the full repo from two levels up
COPY ../../ /app/

# Move into your app directory
WORKDIR /app/web/song-share

# Install dependencies
RUN npm install

# Build the app (optional if needed)
RUN npm run build

# Start the app
CMD ["npm", "start"]