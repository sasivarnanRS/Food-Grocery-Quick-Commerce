FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/delivery-service ./services/delivery-service
RUN npm install
EXPOSE 4006
CMD ["npm", "--workspace=services/delivery-service", "run", "dev"]
