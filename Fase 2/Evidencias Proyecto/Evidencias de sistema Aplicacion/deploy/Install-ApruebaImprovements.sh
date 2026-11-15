#!/bin/sh
# Instala únicamente código de Aprueba; no modifica Nginx, TLS ni Firebase.
set -eu
archive=${1:?Indica el paquete validado}
test -f "$archive"
test -d /opt/shamii/aprueba/api/node_modules
stamp=$(date +%Y%m%d-%H%M%S)
backup=/opt/shamii/aprueba-backups/improvements-$stamp.tar.gz
override=/etc/systemd/system/aprueba-api.service.d/payments-simulation.conf
mkdir -p /opt/shamii/aprueba-backups
tar -czf "$backup" -C /opt/shamii/aprueba api/src api/package.json api/package-lock.json web/dist
chmod 600 "$backup"
had_override=no
if test -f "$override"; then
  cp "$override" "$backup.systemd.conf"
  had_override=yes
fi
tar -xzf "$archive" -C /opt/shamii/aprueba
mkdir -p /etc/systemd/system/aprueba-api.service.d
printf '[Service]\nEnvironment=PAYMENTS_MODE=simulation\n' > "$override"
chown -R shamii:shamii /opt/shamii/aprueba/api/src /opt/shamii/aprueba/web/dist
/opt/node/bin/node --check /opt/shamii/aprueba/api/src/index.js
systemctl daemon-reload
systemctl restart aprueba-api
healthy=no
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:4000/api/v1/health >/dev/null; then healthy=yes; break; fi
  sleep 1
done
if test "$healthy" != yes; then
  tar -xzf "$backup" -C /opt/shamii/aprueba
  if test "$had_override" = yes; then cp "$backup.systemd.conf" "$override"; else rm -f "$override"; fi
  systemctl daemon-reload
  systemctl restart aprueba-api
  printf 'Se restauró el respaldo: %s\n' "$backup" >&2
  exit 1
fi
curl -fsS http://127.0.0.1:8081/ >/dev/null
nginx -t
systemctl is-active aprueba-api nginx shamii-tournaments
printf 'Backup: %s\n' "$backup"
