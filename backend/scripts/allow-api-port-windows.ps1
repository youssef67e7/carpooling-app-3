# Run PowerShell as Administrator once so phones/emulators can reach the API (or dev proxy).
# Windows Firewall often blocks inbound HTTP to Node by default.
#
# Important: Wi-Fi is often marked "Public network". Rules that only allow Private/Domain
# do NOT apply — include Public (or Any) so the phone can connect.
#
# Usage: .\allow-api-port-windows.ps1
#        .\allow-api-port-windows.ps1 -Port 8090

param(
    [int]$Port = 0
)

$port = if ($Port -gt 0) { $Port } elseif ($env:PORT) { [int]$env:PORT } else { 3000 }
$name = "ReachNative Car API (dev $port)"

# Remove older rule from this project if it lacked Public profile (otherwise it blocks recreating).
Remove-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue

New-NetFirewallRule `
  -DisplayName $name `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort $port `
  -Action Allow `
  -Profile Any `
  -ErrorAction Stop

Write-Host "Firewall rule added: $name (all profiles: Domain/Private/Public)."
Write-Host "Try the app again on the same Wi-Fi. If it still fails: (1) backend running, (2) router AP/client isolation off, (3) Safari http://<your-LAN-IP>:$port/health"
