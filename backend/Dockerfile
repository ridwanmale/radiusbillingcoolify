FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN apk add --no-cache freeradius-utils mysql-client


COPY . .

EXPOSE 5000
CMD [ "npm", "start" ]
