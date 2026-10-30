#!/bin/sh
set -eu

: "${CRON_SECRET:?CRON_SECRET is required}"

printf 'CRON_SECRET=%s\n' "$CRON_SECRET" > /etc/scheduler.env
chmod 600 /etc/scheduler.env

exec crond -f -l 2