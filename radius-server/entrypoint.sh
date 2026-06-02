#!/bin/sh

# Start Python HTTP webhook server on port 8080 in the background
# This listener will wait for HTTP requests (Reload and Kick) from the Web Server
python3 /webhook.py &

# Start FreeRADIUS in the foreground
exec radiusd -f -l stdout
