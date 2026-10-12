FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/api-gateway ./services/api-gateway
RUN npm install
EXPOSE 4000
CMD ["npm", "--workspace=services/api-gateway", "run", "dev"]
