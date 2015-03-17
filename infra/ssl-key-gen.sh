#!/bin/bash

openssl req -x509 -newkey rsa:2048 -keyout site.key -out site.crt -days 10000
cat site.crt site.key > site.pem
cp site.pem /etc/ssl/private/