# Use official Node image
FROM node:18

# Create app directory
WORKDIR /app

# Copy app code
COPY . .

# Install dependencies
RUN npm install

# Expose both ports (MCP + Chat)
EXPOSE 3000
EXPOSE 4000

# Start both servers
CMD ["node", "start-all.js"]
