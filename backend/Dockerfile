# Use official Node.js LTS image
FROM node:18

# Install system dependencies: ffmpeg, python3, pip (yt-dlp requires Python)
RUN apt-get update && apt-get install -y ffmpeg python3 python3-pip

# Symlink python to python3 so npm scripts find `python`
RUN ln -s /usr/bin/python3 /usr/bin/python

# Install yt-dlp globally using pip (use --break-system-packages flag to override)
RUN pip3 install --break-system-packages yt-dlp

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json or pnpm-lock.yaml first for caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy rest of the backend source code
COPY . .

# Expose port your backend listens on
EXPOSE 4000

# Start your backend app
CMD ["npm", "start"]
