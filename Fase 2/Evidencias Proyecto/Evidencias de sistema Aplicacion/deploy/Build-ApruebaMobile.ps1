param(
  [string]$FlutterPath,
  [string]$ApiUrl = 'https://aprueba.shamiiplay.com/api/v1'
)
$ErrorActionPreference = 'Stop'
if (-not $FlutterPath) {
  $flutterCommand = Get-Command flutter -ErrorAction SilentlyContinue
  if ($flutterCommand) { $FlutterPath = $flutterCommand.Source }
}
if (-not $FlutterPath -or -not (Test-Path -LiteralPath $FlutterPath)) {
  throw 'Indica -FlutterPath con la ruta de flutter.bat o agrega Flutter al PATH.'
}
$application = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mobile = Join-Path $application 'aprueba_app'
$socialSource = Join-Path $application 'aprueba_student_web/public/social-connect.js'
if (Test-Path -LiteralPath $socialSource) {
  Copy-Item -LiteralPath $socialSource -Destination (Join-Path $mobile 'web/social-connect.js')
}
Push-Location $mobile
try {
  & $FlutterPath analyze
  if ($LASTEXITCODE -ne 0) { throw 'Falló flutter analyze' }
  & $FlutterPath test
  if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas Flutter' }
  & $FlutterPath build web --release --base-href /movil/ "--dart-define=API_URL=$ApiUrl"
  if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación móvil para navegador' }
} finally { Pop-Location }
