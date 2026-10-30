FROM alpine:3.20

RUN apk add --no-cache curl tzdata

ENV TZ=America/Los_Angeles

COPY crontab /etc/crontabs/root
COPY run-notifications.sh /usr/local/bin/run-notifications.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN sed -i 's/\r$//' /usr/local/bin/run-notifications.sh \
    && chmod +x /usr/local/bin/run-notifications.sh \
    && sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

CMD ["/usr/local/bin/entrypoint.sh"]