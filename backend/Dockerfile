FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN apk add --no-cache freeradius-utils mysql-client chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser


COPY . .

EXPOSE 5000
CMD [ "npm", "start" ]
