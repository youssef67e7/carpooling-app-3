# Run PowerShell as Administrator so iPhone/Android can reach Metro (Expo).
# Without this, Expo Go often spins forever or never opens the project on Windows.
#
# Usage (Admin PowerShell):
#   .\scripts\allow-metro-port-windows.ps1
#   .\scripts\allow-metro-port-windows.ps1 -Port 8082

param(
    [int]$Port = 8081
)

$name = "ReachNative Car Metro (dev $Port)"

Remove-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue

New-NetFirewallRule `
  -DisplayName $name `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort $Port `
  -Action Allow `
  -Profile Any `
  -ErrorAction Stop

Write-Host "Firewall rule added: $name (TCP $Port, all profiles)."
Write-Host "In Expo Go paste: exp://<your-wifi-ip>:$Port"
Write-Host "Wi-Fi IP example from this PC: run  ipconfig  and use the Wi-Fi IPv4 address."
