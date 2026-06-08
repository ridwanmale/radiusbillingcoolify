FROM alpine:3.18

# Install FreeRADIUS and MySQL module from Alpine repositories to ensure compatibility
RUN apk update && apk add --no-cache \
    freeradius \
    freeradius-mysql \
    freeradius-utils \
    mariadb-client \
    netcat-openbsd \
    python3

# Enable SQL module
RUN ln -sf /etc/raddb/mods-available/sql /etc/raddb/mods-enabled/sql

# Enable SQL in the default virtual server (authorize, accounting, session, post-auth)
# Using word boundary \< and \> to match exact 'sql' word
RUN sed -i 's/^[[:space:]]*#[[:space:]]*sql\([[:space:]]*\)$/	sql\1/g' /etc/raddb/sites-available/default && \
    sed -i 's/^[[:space:]]*#[[:space:]]*-sql\([[:space:]]*\)$/	-sql\1/g' /etc/raddb/sites-available/default

# Enable Authentication Logging in radiusd.conf
RUN sed -i 's/auth = no/auth = yes/g' /etc/raddb/radiusd.conf && \
    sed -i 's/auth_badpass = no/auth_badpass = yes/g' /etc/raddb/radiusd.conf && \
    sed -i 's/auth_goodpass = no/auth_goodpass = yes/g' /etc/raddb/radiusd.conf

# Allow Reply-Message to pass through Access-Reject packets
RUN sed -i '/^DEFAULT/a \	Reply-Message =* ANY,' /etc/raddb/mods-config/attr_filter/access_reject

# Copy custom configs
COPY clients.conf /etc/raddb/clients.conf
COPY sql.conf /etc/raddb/mods-available/sql
COPY default /etc/raddb/sites-available/default
COPY webhook.py /webhook.py
COPY entrypoint.sh /entrypoint.sh

# Set permissions
RUN chown -R radius:radius /etc/raddb
RUN chmod +x /entrypoint.sh

# Run via entrypoint to support webhook reloads
CMD ["/entrypoint.sh"]
