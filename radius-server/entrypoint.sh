#!/bin/sh

# Start a simple webhook listener on port 8080 in the background
# This listener will wait for HTTP requests from the Web Server
(
  while true; do
    printf "HTTP/1.1 200 OK\r\nContent-Length: 15\r\n\r\nRadius Reloaded" | nc -l -p 8080 > /dev/null
    echo "[RADIUS] Reload signal received via webhook. Restarting FreeRADIUS container..."
    # Mematikan radiusd secara penuh agar Docker merestart container (solusi teraman untuk memuat ulang MySQL NAS di FreeRADIUS 3)
    killall radiusd
  done
) &

# Start FreeRADIUS in the foreground
exec radiusd -f -l stdout
