FROM nginx:alpine
RUN apk add --no-cache curl
RUN curl -sSL https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js -o /usr/share/nginx/html/jsQR.min.js
COPY index.html /usr/share/nginx/html/index.html
COPY portal.js /usr/share/nginx/html/portal.js
COPY manifest.json /usr/share/nginx/html/manifest.json
COPY sw.js /usr/share/nginx/html/sw.js
COPY icon.svg /usr/share/nginx/html/icon.svg
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
