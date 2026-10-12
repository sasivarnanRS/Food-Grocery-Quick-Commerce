FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/inventory-service ./services/inventory-service
RUN npm install
EXPOSE 4003
CMD ["npm", "--workspace=services/inventory-service", "run", "dev"]
