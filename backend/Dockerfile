FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN apk add --no-cache freeradius-utils

COPY . .

EXPOSE 5000
CMD [ "npm", "start" ]
