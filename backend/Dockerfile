FROM node:18-alpine3.18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN apk add --no-cache freeradius-utils

COPY . .

EXPOSE 5000
CMD [ "npm", "start" ]
