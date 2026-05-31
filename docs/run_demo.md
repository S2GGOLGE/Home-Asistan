# Run the Jarvis Demo

## 1. Start the C# Backend

Recommended full-system start:

```powershell
cd "Y:\Home Asistan"
.\scripts\run_jarvis_system.ps1
```

Shortcut:

```bat
run.bat
```

Stop everything:

```powershell
.\scripts\stop_jarvis_system.ps1
```

Manual backend-only start:

```powershell
cd "Y:\Home Asistan\Jarvis.Backend"
dotnet run --urls http://localhost:5235
```

Backend health check:

```powershell
Invoke-RestMethod -Uri "http://localhost:5235/" -Method Get
```

List seeded demo devices:

```powershell
Invoke-RestMethod -Uri "http://localhost:5235/api/devices" -Method Get
```

Open the live notification panel:

```text
http://localhost:5235/panel
```

The panel listens to SignalR events, shows `DeviceConnected` and `DeviceDisconnected` notifications, and can read them aloud with browser speech synthesis.

Seeded devices:

| Device | Id | Room |
| --- | --- | --- |
| Lamba | `11111111-1111-1111-1111-111111111111` | Salon |
| Priz | `22222222-2222-2222-2222-222222222222` | Mutfak |

## 2. Send Device Heartbeats

The first heartbeat moves a device to `PendingOnline`. The second heartbeat confirms reconnect debounce and moves it to `Online`.

```powershell
$body = @{
  deviceId = "11111111-1111-1111-1111-111111111111"
  firmwareVersion = "1.0.0"
  bootId = "boot-demo"
  payload = @{}
  nonce = "demo"
  signature = "demo"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:5235/api/devices/heartbeat" `
  -ContentType "application/json" `
  -Body $body
```

Run the same command twice to see `Online`.

## 3. Run Python Jarvis Core Plugin Routing

From the workspace root:

```powershell
cd "Y:\Home Asistan"
py -3 -m jarvis_core.app.main --backend http://localhost:5235 --intent light.turn_on --room Salon
```

Expected result:

```json
{
  "success": true,
  "plugin": "LightPlugin",
  "intent": "light.turn_on"
}
```

## 4. Test Offline Notification Flow

Manual offline test:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:5235/api/devices/11111111-1111-1111-1111-111111111111/force-offline"
```

Check generated notifications:

```powershell
Invoke-RestMethod -Uri "http://localhost:5235/api/notifications" -Method Get
```

You can also use the buttons on:

```text
http://localhost:5235/panel
```

## 5. Automatic Offline Detection

The backend `DeviceMonitorService` checks devices every 10 seconds. A seeded device has `OfflineTimeoutSeconds = 60`.

Flow:

```text
Heartbeat stops -> LastSeenTime becomes stale -> DeviceMonitorService marks Offline -> SignalR DeviceDisconnected -> Notification
```
