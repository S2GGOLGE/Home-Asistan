param(
    [string]$Workspace = "Y:\Home Asistan"
)

Set-Location $Workspace
py -3 -m watchdog.jarvis_watchdog
