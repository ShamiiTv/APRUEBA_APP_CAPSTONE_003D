param([switch]$Publish,[switch]$IncludeMobile,[switch]$IncludeApk,[string]$FlutterPath)
$ErrorActionPreference = 'Stop'
if ($IncludeApk -and (-not $IncludeMobile -or -not $FlutterPath)) { throw 'IncludeApk requiere IncludeMobile y FlutterPath explícitos.' }
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
if ($IncludeMobile) {
  & (Join-Path $PSScriptRoot 'Build-ApruebaMobile.ps1') -FlutterPath $FlutterPath
} else {
  Write-Warning 'La app móvil remota se conserva. Usa -IncludeMobile para recompilarla y actualizarla también.'
}
# Explicit allowlist: no .env, SSH keys, users, emulator data or node_modules.
New-Item -ItemType Directory -Path "$staging/api","$staging/web","$staging/database" -Force | Out-Null
Copy-Item -LiteralPath "$api/src" -Destination "$staging/api" -Recurse
Copy-Item -LiteralPath "$api/package.json","$api/package-lock.json" -Destination "$staging/api"
Copy-Item -LiteralPath "$web/dist" -Destination "$staging/web" -Recurse
if ($IncludeMobile) {
  Copy-Item -LiteralPath "$application/aprueba_app/build/web" -Destination "$staging/web/dist/movil" -Recurse
}
if ($IncludeApk) {
  Push-Location "$application/aprueba_app"
  try { Invoke-Checked $FlutterPath @('build','apk','--release','--dart-define=API_URL=https://aprueba.shamiiplay.com/api/v1') } finally { Pop-Location }
  New-Item -ItemType Directory -Force -Path "$staging/web/dist/descargas" | Out-Null
  Copy-Item -LiteralPath "$application/aprueba_app/build/app/outputs/flutter-apk/app-release.apk" -Destination "$staging/web/dist/descargas/Aprueba-Android-pruebas-$stamp.apk"
  $apkVersion = [regex]::Match([System.IO.File]::ReadAllText("$application/aprueba_app/pubspec.yaml"),'(?m)^version:\s*(\d+\.\d+\.\d+)\+').Groups[1].Value
  if (-not $apkVersion) { throw 'No se pudo leer la versión del APK.' }
  Copy-Item -LiteralPath "$application/aprueba_app/build/app/outputs/flutter-apk/app-release.apk" -Destination "$staging/web/dist/descargas/Aprueba-$apkVersion.apk"
}
Copy-Item -LiteralPath "$application/database/firestore.rules","$application/database/firestore.indexes.json" -Destination "$staging/database"
Invoke-Checked 'C:/Windows/System32/tar.exe' @('-czf',$archive,'-C',$staging,'api','web','database')
Write-Output "Paquete validado: $archive"
if (-not $Publish) { return }
if (-not (Test-Path -LiteralPath $identity)) { throw 'Falta la clave SSH autorizada; no crear otra ni desactivar verificación de host.' }
$connection = @('-i',$identity,'-p','10047','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$knownHosts",'root@93.127.139.145')
Invoke-Checked $scp @('-i',$identity,'-P','10047','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$knownHosts",$archive,"root@93.127.139.145:/tmp/aprueba-$stamp.tar.gz")
# Prepare dependencies separately, activate atomically, preserve prior APK/assets and hardened ownership.
$linuxInstaller = Join-Path $staging 'Install-ApruebaRelease.sh'
[System.IO.File]::WriteAllText($linuxInstaller,[System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'Install-ApruebaRelease.sh')).Replace("`r`n","`n"),[System.Text.UTF8Encoding]::new($false))
Invoke-Checked $scp @('-i',$identity,'-P','10047','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',"UserKnownHostsFile=$knownHosts",$linuxInstaller,"root@93.127.139.145:/tmp/install-aprueba-$stamp.sh")
Invoke-Checked $ssh ($connection + @("bash /tmp/install-aprueba-$stamp.sh /tmp/aprueba-$stamp.tar.gz"))
