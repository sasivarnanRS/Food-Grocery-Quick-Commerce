FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/cart-service ./services/cart-service
RUN npm install
EXPOSE 4004
CMD ["npm", "--workspace=services/cart-service", "run", "dev"]
