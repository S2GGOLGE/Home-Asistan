# Jarvis Plugin-Based Command System

This repository contains a starter architecture for a Jarvis system where the AI layer only produces intent JSON and the Python core routes that intent to runtime plugins.

## Main Parts

- `docs/jarvis_plugin_architecture.md`: architecture, lifecycle, hot reload, isolation
- `docs/backend_api_design.md`: C# backend endpoint design
- `docs/sql_server_schema.sql`: SQL Server 2022 schema
- `docs/device_monitoring_notification_architecture.md`: IoT device heartbeat, monitoring, SignalR, notification flow
- `docs/device_monitoring_sql_server_schema.sql`: SQL Server 2022 device monitoring schema
- `backend_samples/DeviceMonitoring`: C# HostedService, heartbeat endpoint, SignalR hub samples
- `jarvis_core/core`: router, plugin manager, event bus
- `jarvis_core/contracts`: plugin contract
- `jarvis_core/plugins/light_plugin`: example LightPlugin
- `jarvis_core/infrastructure/device_notification_handler.py`: Python Jarvis voice notification handler
- `jarvis_core/infrastructure/signalr_device_status_client.py`: Python SignalR listener adapter
- `Jarvis.Backend`: runnable ASP.NET Core demo backend
- `docs/run_demo.md`: commands for running and testing the local demo
- `docs/self_healing_architecture.md`: auto-restart, crash recovery, watchdog design
- `docs/full_production_architecture.md`: combined backend, Jarvis, SQL, plugin, and self-healing blueprint
- `watchdog/jarvis_watchdog.py`: runnable self-healing watchdog
- `scripts/start_watchdog.ps1`: starts the watchdog manually
- `scripts/install_watchdog_task.ps1`: registers the watchdog in Windows Task Scheduler

## Run Locally

Start the backend:

```powershell
cd "Y:\Home Asistan\Jarvis.Backend"
dotnet run --urls http://localhost:5235
```

Open the live device notification panel:

```text
http://localhost:5235/panel
```

Run the Python plugin routing demo:

```powershell
cd "Y:\Home Asistan"
py -3 -m jarvis_core.app.main --backend http://localhost:5235 --intent light.turn_on --room Salon
```

More commands are in `docs/run_demo.md`.

Run the self-healing watchdog:

```powershell
cd "Y:\Home Asistan"
py -3 -m watchdog.jarvis_watchdog
```

Or start the whole local system with one script:

```powershell
cd "Y:\Home Asistan"
.\scripts\run_jarvis_system.ps1
```

Shortcut:

```bat
run.bat
```

Stop local Jarvis processes:

```powershell
.\scripts\stop_jarvis_system.ps1
```

## Command Flow

```text
User -> Speech -> AI -> Intent JSON -> Jarvis Core -> Plugin Router -> Plugin Execute -> C# API -> Device -> Response
```

## Add a New Plugin

1. Create a new folder under `jarvis_core/plugins`.
2. Add a `manifest.json`.
3. Add a `plugin.py` implementing `BasePlugin`.
4. Add supported intent names to the manifest and plugin class.
5. Let the Plugin Manager discover or hot reload it.
