@echo off
cd /d "%~dp0"
set PATH=D:\Games\flutter\bin;C:\Windows\System32;C:\Windows;%PATH%
echo.
echo ========================================
echo   WERET - Run on USB Phone (Samsung A56)
echo ========================================
echo.
echo IMPORTANT: Do NOT run main.dart with dart.exe
echo Use this file or: flutter run -d RKGYC04CVDX
echo.
flutter devices
echo.
flutter run -d RKGYC04CVDX
if errorlevel 1 (
  echo.
  echo If build failed, try:
  echo   1. Enable Developer Mode in Windows Settings
  echo   2. On phone: USB debugging ON + Allow on PC
  echo   3. Run: flutter pub get
)
pause
