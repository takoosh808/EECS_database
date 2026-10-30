#!/bin/sh
set -eu

curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
"http://web:3000/api/automated_email"