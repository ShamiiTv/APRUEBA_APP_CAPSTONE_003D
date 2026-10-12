#!/bin/sh
set -eu
# Execute only when the group has finished the demonstration.
test -f /etc/shamii/aprueba.env
test -f /etc/systemd/system/aprueba-api.service.d/demo.conf
mkdir -p /opt/shamii/aprueba/demo/disabled-config
mv /etc/systemd/system/aprueba-api.service.d/demo.conf /opt/shamii/aprueba/demo/disabled-config/demo-$(date +%Y%m%d-%H%M%S).conf
systemctl daemon-reload
systemctl restart aprueba-api
sleep 2
curl -fsS http://127.0.0.1:4000/api/v1/health
# Keep demo emulators running until their export has been verified.
