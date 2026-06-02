#!/bin/sh

# Start a simple webhook listener on port 8080 in the background
# This listener will wait for HTTP requests from the Web Server
(
  while true; do
    echo -e "HTTP/1.1 200 OK\r\nContent-Length: 15\r\n\r\nRadius Reloaded" | nc -l -p 8080 > /dev/null
    echo "[RADIUS] Reload signal received via webhook. Reloading FreeRADIUS..."
    # Send HUP signal to radiusd to reload clients and configs
    killall -HUP radiusd
  done
) &

# Start FreeRADIUS in the foreground
exec radiusd -f -l stdout
