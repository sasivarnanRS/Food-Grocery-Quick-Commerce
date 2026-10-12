FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/product-service ./services/product-service
RUN npm install
EXPOSE 4002
CMD ["npm", "--workspace=services/product-service", "run", "dev"]
