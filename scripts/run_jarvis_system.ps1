param(
    [string]$Workspace = "Y:\Home Asistan",
    [int]$BackendPort = 5235,
    [switch]$SkipBuild,
    [switch]$OpenPanel
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Wait-ForHealth {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 3
            if ($response.status -eq "Healthy") {
                return $response
            }
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "Health check failed: $Url"
}

Set-Location $Workspace

Write-Step "Workspace"
Write-Host $Workspace

if (-not $SkipBuild) {
    Write-Step "Building backend"
    dotnet build "$Workspace\Jarvis.Backend\Jarvis.Backend.csproj"
}

Write-Step "Starting self-healing watchdog"
$stdout = Join-Path $Workspace "logs\watchdog_stdout.log"
$stderr = Join-Path $Workspace "logs\watchdog_stderr.log"
New-Item -ItemType Directory -Force -Path (Join-Path $Workspace "logs") | Out-Null

$watchdog = Start-Process `
    -FilePath "py" `
    -ArgumentList @("-3", "-m", "watchdog.jarvis_watchdog", "--backend-port", "$BackendPort") `
    -WorkingDirectory $Workspace `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -PassThru

Write-Host "Watchdog PID: $($watchdog.Id)"

Write-Step "Waiting for backend health"
$healthUrl = "http://localhost:$BackendPort/health"
$health = Wait-ForHealth -Url $healthUrl -TimeoutSeconds 40

Write-Host "Backend: $($health.status)"
Write-Host "ProcessId: $($health.processId)"
Write-Host "DeviceCount: $($health.deviceCount)"

Write-Step "Checking Jarvis heartbeat"
$heartbeatFile = Join-Path $Workspace "runtime\jarvis_heartbeat.json"
if (Test-Path $heartbeatFile) {
    Get-Content $heartbeatFile
}
else {
    Write-Warning "Jarvis heartbeat file not found yet: $heartbeatFile"
}

Write-Step "Ready"
Write-Host "Health: http://localhost:$BackendPort/health"
Write-Host "Panel:  http://localhost:$BackendPort/panel"
Write-Host "Logs:   $Workspace\logs\watchdog.jsonl"

if ($OpenPanel) {
    Start-Process "http://localhost:$BackendPort/panel"
}

