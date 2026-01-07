FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "start:dev"]

