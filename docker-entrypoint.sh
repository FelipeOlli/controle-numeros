#!/bin/sh
set -e

echo "Aplicando migrations..."
node_modules/.bin/prisma migrate deploy

echo "Subindo servidor..."
exec node_modules/.bin/next start
