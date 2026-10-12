param([switch]$Publish)
$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$application = Join-Path $workspace 'Fase 2/Evidencias Proyecto/Evidencias de sistema Aplicacion'
$api = Join-Path $application 'aprueba_api'
$web = Join-Path $application 'aprueba_student_web'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$staging = Join-Path $workspace ".deployment/aprueba-$stamp"
$archive = Join-Path $workspace ".deployment/aprueba-$stamp.tar.gz"
$ssh = 'C:/Windows/System32/OpenSSH/ssh.exe'
$scp = 'C:/Windows/System32/OpenSSH/scp.exe'
$identity = 'C:/Users/Shamii/Desktop/Torneo-GTA/.deployment/shamii-server'
$knownHosts = 'C:/Users/Shamii/Desktop/Torneo-GTA/.ssh-known-hosts'
function Invoke-Checked {
  param([string]$Executable, [string[]]$Arguments)
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Falló $Executable con código $LASTEXITCODE" }
}
Push-Location $api
try { Invoke-Checked 'E:/Node/npm.cmd' @('test') } finally { Pop-Location }
Push-Location $web
$previousApiBase = $env:VITE_API_BASE_URL
try {
  Invoke-Checked 'E:/Node/npm.cmd' @('test')
  Invoke-Checked 'E:/Node/npm.cmd' @('run','lint')
  $env:VITE_API_BASE_URL = '/api/v1'
  Invoke-Checked 'E:/Node/npm.cmd' @('run','build')
} finally { $env:VITE_API_BASE_URL = $previousApiBase; Pop-Location }
# Explicit allowlist: no .env, SSH keys, users, emulator data or node_modules.
New-Item -ItemType Directory -Path "$staging/api","$staging/web","$staging/database" -Force | Out-Null
Copy-Item -LiteralPath "$api/src" -Destination "$staging/api" -Recurse
Copy-Item -LiteralPath "$api/package.json","$api/package-lock.json" -Destination "$staging/api"
Copy-Item -LiteralPath "$web/dist" -Destination "$staging/web" -Recurse
Copy-Item -LiteralPath "$application/database/firestore.rules","$application/database/firestore.indexes.json" -Destination "$staging/database"
Invoke-Checked 'C:/Windows/System32/tar.exe' @('-czf',$archive,'-C',$staging,'api','web','database')
$localLock = (Get-FileHash "$api/package-lock.json" -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output "Paquete validado: $archive"
if (-not $Publish) { return }
if (-not (Test-Path -LiteralPath $identity)) { throw 'Falta la clave SSH autorizada; no crear otra ni desactivar verificación de host.' }
$connection = @('-i',$identity,'-p','10047','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$knownHosts",'root@93.127.139.145')
$remoteLock = & $ssh @connection 'sha256sum /opt/shamii/aprueba/api/package-lock.json'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar el lockfile remoto.' }
if (($remoteLock -split '\s+')[0] -ne $localLock) { throw 'Cambió package-lock: revisar e instalar dependencias en la VPS antes de publicar.' }
Invoke-Checked $scp @('-i',$identity,'-P','10047','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$knownHosts",$archive,"root@93.127.139.145:/tmp/aprueba-$stamp.tar.gz")
# Snapshot first; keep dependency/configuration directories and only update Aprueba.
$remote = "set -eu; test -d /opt/shamii/aprueba/api/node_modules; mkdir -p /opt/shamii/aprueba-backups; tar --exclude=node_modules -czf /opt/shamii/aprueba-backups/aprueba-$stamp.tar.gz -C /opt/shamii aprueba; tar -xzf /tmp/aprueba-$stamp.tar.gz -C /opt/shamii/aprueba; chown -R shamii:shamii /opt/shamii/aprueba; /opt/node/bin/node --check /opt/shamii/aprueba/api/src/index.js; if systemctl is-active --quiet aprueba-api; then systemctl restart aprueba-api; fi; curl --fail --silent --output /dev/null http://127.0.0.1:8081/; printf 'Aprueba actualizada. Backup: /opt/shamii/aprueba-backups/aprueba-$stamp.tar.gz\n'; systemctl is-active nginx; systemctl is-active shamii-tournaments"
Invoke-Checked $ssh ($connection + @($remote))
