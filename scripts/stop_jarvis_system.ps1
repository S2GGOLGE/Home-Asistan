param(
    [int[]]$Ports = @(5235, 5236, 5237)
)

$ErrorActionPreference = "Continue"

Write-Host "Stopping Jarvis related processes..." -ForegroundColor Cyan

$names = @("Jarvis.Backend", "dotnet", "py", "python")
Get-Process |
    Where-Object { $names -contains $_.ProcessName } |
    ForEach-Object {
        Write-Host "Stopping $($_.ProcessName) PID $($_.Id)"
        Stop-Process -Id $_.Id -Force
    }

foreach ($port in $Ports) {
    $rows = netstat -ano -p tcp | Select-String ":$port"
    foreach ($row in $rows) {
        $parts = ($row.ToString() -split "\s+") | Where-Object { $_ }
        if ($parts.Length -ge 5 -and $parts[3] -eq "LISTENING") {
            $pidText = $parts[4]
            if ($pidText -match "^\d+$") {
                Write-Host "Cleaning port $port PID $pidText"
                Stop-Process -Id ([int]$pidText) -Force
            }
        }
    }
}

Write-Host "Stopped."

