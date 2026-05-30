FROM alpine:3.18

# Install FreeRADIUS and MySQL module from Alpine repositories to ensure compatibility
RUN apk update && apk add --no-cache \
    freeradius \
    freeradius-mysql \
    freeradius-utils \
    mariadb-client

# Enable SQL module
RUN ln -sf /etc/raddb/mods-available/sql /etc/raddb/mods-enabled/sql

# Enable SQL in the default virtual server (authorize, accounting, session, post-auth)
# Using word boundary \< and \> to match exact 'sql' word
RUN sed -i 's/^[[:space:]]*#[[:space:]]*sql\([[:space:]]*\)$/	sql\1/g' /etc/raddb/sites-available/default && \
    sed -i 's/^[[:space:]]*#[[:space:]]*-sql\([[:space:]]*\)$/	-sql\1/g' /etc/raddb/sites-available/default

# Copy custom configs
COPY clients.conf /etc/raddb/clients.conf
COPY sql.conf /etc/raddb/mods-available/sql
COPY default /etc/raddb/sites-available/default

# Set permissions
RUN chown -R radius:radius /etc/raddb

# Run FreeRADIUS in foreground with logging to stdout
CMD ["radiusd", "-f", "-l", "stdout"]
