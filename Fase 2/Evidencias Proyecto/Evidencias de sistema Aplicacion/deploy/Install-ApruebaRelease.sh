#!/usr/bin/env bash
set -euo pipefail
umask 077
archive=${1:?archive required}
case "$archive" in /tmp/aprueba-*.tar.gz) ;; *) exit 2;; esac
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="/opt/shamii/aprueba-backups/security-release-$stamp"
stage="/opt/shamii/aprueba/releases/security-$stamp"
install -d -m700 "$backup"
install -d -m755 "$stage"
tar -xzf "$archive" -C "$stage"
test -f "$stage/api/package-lock.json"
test -f "$stage/api/src/app.js"
if ! test -f "$stage/web/dist/movil/main.dart.js"; then
  test -f /opt/shamii/aprueba/web/dist/movil/main.dart.js
  cp -a /opt/shamii/aprueba/web/dist/movil "$stage/web/dist/movil"
fi
export PATH=/opt/aprueba-node-v22.23.5/bin:/usr/bin:/bin
(cd "$stage/api"; npm ci --omit=dev --ignore-scripts; npm audit --omit=dev --audit-level=low; node --check src/index.js; node --check src/app.js)
# Preserve downloads and hashed assets so existing browser tabs still resolve lazy chunks.
install -d "$stage/web/dist/descargas" "$stage/web/dist/assets"
if test -d /opt/shamii/aprueba/web/dist/descargas; then cp -an /opt/shamii/aprueba/web/dist/descargas/. "$stage/web/dist/descargas/"; fi
if test -d /opt/shamii/aprueba/web/dist/assets; then cp -an /opt/shamii/aprueba/web/dist/assets/. "$stage/web/dist/assets/"; fi
chown -R root:root "$stage"
find "$stage" -type d -exec chmod 755 {} +
find "$stage" -type f -exec chmod a+r,go-w {} +
activation=0
rollback_on_error(){
 rc=$?; trap - ERR
 if test "$activation" = 1; then
  systemctl stop aprueba-api || true
  if test -d "$backup/api-previous"; then
   test ! -d /opt/shamii/aprueba/api || mv /opt/shamii/aprueba/api "$backup/api-failed"
   mv "$backup/api-previous" /opt/shamii/aprueba/api
  fi
  if test -d "$backup/dist-previous"; then
   test ! -d /opt/shamii/aprueba/web/dist || mv /opt/shamii/aprueba/web/dist "$backup/dist-failed"
   mv "$backup/dist-previous" /opt/shamii/aprueba/web/dist
  fi
  systemctl start aprueba-api || true
  echo "Release reverted after activation failure: $backup" >&2
 fi
 exit "$rc"
}
trap rollback_on_error ERR
activation=1
systemctl stop aprueba-api
mv /opt/shamii/aprueba/api "$backup/api-previous"
mv "$stage/api" /opt/shamii/aprueba/api
mv /opt/shamii/aprueba/web/dist "$backup/dist-previous"
mv "$stage/web/dist" /opt/shamii/aprueba/web/dist
systemctl start aprueba-api
curl --fail --silent --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:4000/api/v1/health
curl --fail --silent --output /dev/null -H 'X-Forwarded-Proto: https' http://127.0.0.1:8081/
curl --fail --silent --output /dev/null -H 'X-Forwarded-Proto: https' http://127.0.0.1:8081/movil/
activation=0
trap - ERR
systemctl is-active aprueba-api nginx shamii-tournaments
echo "Release backup: $backup"
sha256sum /opt/shamii/aprueba/api/package-lock.json /opt/shamii/aprueba/web/dist/movil/main.dart.js
