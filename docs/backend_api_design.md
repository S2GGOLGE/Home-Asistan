# C# Backend API Design

The C# backend is the system controller. Python plugins do not control devices directly. They call backend endpoints.

## Endpoints

```http
POST /api/commands/execute
GET  /api/devices
GET  /api/devices/{id}
GET  /api/devices/by-room/{room}
GET  /api/device-states/{deviceId}
POST /api/device-states/{deviceId}
GET  /api/events
GET  /api/plugins/logs
```

## Command Request

```json
{
  "intent": "light.turn_on",
  "deviceType": "light",
  "room": "salon",
  "parameters": {
    "brightness": 80,
    "color": "warm_white"
  },
  "correlationId": "cmd-20260530-001",
  "userId": "user-123"
}
```

## Command Response

```json
{
  "success": true,
  "commandId": "cmd-789",
  "deviceId": "device-456",
  "state": {
    "power": "on",
    "brightness": 80,
    "color": "warm_white"
  },
  "message": "Salon isigi acildi."
}
```

## ASP.NET Core Controller

```csharp
[ApiController]
[Route("api/commands")]
public class CommandsController : ControllerBase
{
    private readonly ICommandService _commandService;

    public CommandsController(ICommandService commandService)
    {
        _commandService = commandService;
    }

    [HttpPost("execute")]
    public async Task<IActionResult> Execute([FromBody] ExecuteCommandRequest request)
    {
        var result = await _commandService.ExecuteAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
```

## SignalR Hub

```csharp
public class DeviceHub : Hub
{
}
```

Example broadcast:

```csharp
await _hubContext.Clients.All.SendAsync("DeviceStateChanged", new
{
    deviceId = device.Id,
    state = newState,
    correlationId = request.CorrelationId
});
```

