param(
    [string]$Workspace = "Y:\Home Asistan",
    [string]$TaskName = "JarvisSelfHealingWatchdog"
)

$Python = "py"
$Arguments = "-3 -m watchdog.jarvis_watchdog"
$Action = New-ScheduledTaskAction -Execute $Python -Argument $Arguments -WorkingDirectory $Workspace
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Starts the Jarvis watchdog on Windows startup." `
    -Force

Write-Host "Registered scheduled task: $TaskName"
