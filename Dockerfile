# Use an official Node.js runtime as a parent image with Alpine
FROM node:16-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install any needed packages
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Make port 8080 available to the outside world
EXPOSE 8080

# Run the app
CMD ["node", "server.js"]
