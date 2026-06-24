# Build Flutter debug APK
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$app = Join-Path $root "apps\mobile-flutter"

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  Write-Host "Flutter SDK not found. Run: npm run init:flutter after installing Flutter." -ForegroundColor Yellow
  exit 1
}

Push-Location $app
try {
  if (-not (Test-Path "android")) {
    flutter create . --platforms=android,ios --org com.weret.app
  }
  flutter pub get
  $api = $env:API_URL
  if (-not $api) { $api = "http://192.168.1.9:3000" }
  flutter build apk --debug --dart-define=API_URL=$api
  $out = Join-Path $root "dist"
  New-Item -ItemType Directory -Force -Path $out | Out-Null
  Copy-Item "build\app\outputs\flutter-apk\app-debug.apk" (Join-Path $out "WERET-debug.apk") -Force
  Write-Host "APK: dist/WERET-debug.apk" -ForegroundColor Green
} finally {
  Pop-Location
}
