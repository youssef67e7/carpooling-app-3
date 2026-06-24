#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$app = Join-Path $root "apps\mobile-flutter"

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  Write-Host "Flutter SDK not found. Install from https://docs.flutter.dev/get-started/install" -ForegroundColor Yellow
  Write-Host "Then re-run: .\scripts\init-flutter.ps1"
  exit 1
}

Push-Location $app
try {
  if (-not (Test-Path "android")) {
    Write-Host "Creating Android/iOS platform folders..." -ForegroundColor Cyan
    flutter create . --platforms=android,ios --org com.weret.app
  }
  flutter pub get
  Write-Host "Flutter app ready at apps/mobile-flutter" -ForegroundColor Green
  Write-Host "Run: cd apps/mobile-flutter && flutter run --dart-define=API_URL=http://YOUR_LAN_IP:3000"
} finally {
  Pop-Location
}
