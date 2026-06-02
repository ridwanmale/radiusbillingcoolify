FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY portal.js /usr/share/nginx/html/portal.js
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
