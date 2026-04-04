#!/bin/sh
set -e
export POSTGRES_PASSWORD=$(cat /run/secrets/postgres_password)
export BETTER_AUTH_SECRET=$(cat /run/secrets/better_auth_secret)
exec node server.js
