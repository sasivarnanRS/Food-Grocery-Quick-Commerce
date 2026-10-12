FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/notification-service ./services/notification-service
RUN npm install
EXPOSE 4007
CMD ["npm", "--workspace=services/notification-service", "run", "dev"]
