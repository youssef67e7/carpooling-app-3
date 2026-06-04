# Build WERET APK locally → dist/WERET-debug.apk
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"

$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
if (-not (Test-Path $env:JAVA_HOME)) {
  $env:JAVA_HOME = $env:JAVA_HOME
}
$env:ANDROID_HOME = if (Test-Path "E:\Instagram\Android\Sdk") { "E:\Instagram\Android\Sdk" } else { "$env:LOCALAPPDATA\Android\Sdk" }
$env:NODE_ENV = "production"
$env:CMAKE_BUILD_PARALLEL_LEVEL = "1"
$env:GRADLE_OPTS = "-Xmx1280m"

# Short path avoids spaces + lowers CreateProcess failures on low-RAM Windows
$drive = "W:"
$mapped = $false
try {
  subst $drive /D 2>$null | Out-Null
  subst $drive $root
  $mapped = $true
  $android = Join-Path "${drive}\" "mobile\android"
} catch {
  $android = Join-Path $root "mobile\android"
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null

Write-Host "Building APK (arm64, low-memory mode)..." -ForegroundColor Cyan
Write-Host "Close Chrome/other apps. If it fails: increase Windows Page file to 16GB (BUILD_APK.md)" -ForegroundColor Yellow

Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Push-Location $android
try {
  # Two-step build avoids OOM on 7–8GB RAM PCs (worklets C++ first, then APK)
  & .\gradlew.bat :react-native-worklets:buildCMakeDebug --no-daemon
  if ($LASTEXITCODE -ne 0) { throw "worklets CMake failed ($LASTEXITCODE)" }
  & .\gradlew.bat :app:assembleDebug --no-daemon -PreactNativeArchitectures=arm64-v8a
  if ($LASTEXITCODE -ne 0) { throw "Gradle exit $LASTEXITCODE" }

  $apk = Get-ChildItem -Path "app\build\outputs\apk\debug\*.apk" | Select-Object -First 1
  if (-not $apk) { throw "APK not found" }

  $dest = Join-Path $dist "WERET-debug.apk"
  Copy-Item $apk.FullName $dest -Force
  Write-Host ""
  Write-Host "Success: $dest" -ForegroundColor Green
  Write-Host "Size: $([math]::Round($apk.Length / 1MB, 1)) MB"
} finally {
  Pop-Location
  if ($mapped) { subst $drive /D 2>$null | Out-Null }
}
