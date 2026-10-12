FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/order-service ./services/order-service
RUN npm install
EXPOSE 4005
CMD ["npm", "--workspace=services/order-service", "run", "dev"]
