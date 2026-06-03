FROM nginx:alpine
RUN apk add --no-cache curl
RUN curl -sSL https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js -o /usr/share/nginx/html/jsQR.min.js
COPY index.html /usr/share/nginx/html/index.html
COPY portal.js /usr/share/nginx/html/portal.js
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
