using Microsoft.AspNetCore.Mvc;

namespace Jarvis.Backend.DeviceMonitoring;

[ApiController]
[Route("api/devices")]
public sealed class DevicesController : ControllerBase
{
    private readonly IDeviceHeartbeatService _heartbeatService;

    public DevicesController(IDeviceHeartbeatService heartbeatService)
    {
        _heartbeatService = heartbeatService;
    }

    [HttpPost("heartbeat")]
    public async Task<ActionResult<HeartbeatResponse>> Heartbeat(
        [FromBody] HeartbeatRequest request,
        CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var response = await _heartbeatService.AcceptHeartbeatAsync(
            request,
            ipAddress,
            cancellationToken);

        return response.Accepted ? Ok(response) : Unauthorized(response);
    }
}

