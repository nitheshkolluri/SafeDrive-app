#!/bin/sh
set -e

# Default PORT if not set
export PORT=${PORT:-8080}

echo "Starting SafeDrive application on port ${PORT}..."

# Substitute environment variables in nginx config
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Verify nginx configuration
nginx -t

# Execute the main command (nginx)
exec "$@"
