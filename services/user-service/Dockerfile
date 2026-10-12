FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY services/user-service ./services/user-service
RUN npm install
EXPOSE 4001
CMD ["npm", "--workspace=services/user-service", "run", "dev"]
