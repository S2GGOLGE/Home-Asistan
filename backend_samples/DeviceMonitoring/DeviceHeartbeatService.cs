using Microsoft.AspNetCore.SignalR;

namespace Jarvis.Backend.DeviceMonitoring;

public interface IDeviceHeartbeatService
{
    Task<HeartbeatResponse> AcceptHeartbeatAsync(
        HeartbeatRequest request,
        string? ipAddress,
        CancellationToken cancellationToken);
}

public sealed class DeviceHeartbeatService : IDeviceHeartbeatService
{
    private readonly IDeviceHeartbeatRepository _repository;
    private readonly IDeviceAuthenticator _authenticator;
    private readonly IHubContext<DeviceStatusHub> _hubContext;
    private readonly INotificationService _notificationService;

    public DeviceHeartbeatService(
        IDeviceHeartbeatRepository repository,
        IDeviceAuthenticator authenticator,
        IHubContext<DeviceStatusHub> hubContext,
        INotificationService notificationService)
    {
        _repository = repository;
        _authenticator = authenticator;
        _hubContext = hubContext;
        _notificationService = notificationService;
    }

    public async Task<HeartbeatResponse> AcceptHeartbeatAsync(
        HeartbeatRequest request,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var isValid = await _authenticator.ValidateAsync(request, cancellationToken);

        if (!isValid)
        {
            await _repository.InsertRejectedHeartbeatAsync(request.DeviceId, ipAddress, "InvalidSignature", cancellationToken);
            return new HeartbeatResponse(false, "Rejected", now, "Invalid device heartbeat");
        }

        var device = await _repository.GetDeviceAsync(request.DeviceId, cancellationToken);
        if (device is null)
        {
            await _repository.InsertRejectedHeartbeatAsync(request.DeviceId, ipAddress, "UnknownDevice", cancellationToken);
            return new HeartbeatResponse(false, "Rejected", now, "Unknown device");
        }

        var oldStatus = device.Status;
        device.LastSeenTime = now;
        device.IPAddress = ipAddress;
        device.UpdatedAt = now;

        await _repository.InsertHeartbeatAsync(request, ipAddress, now, cancellationToken);

        if (oldStatus is "Offline" or "Unknown")
        {
            device.Status = "PendingOnline";
            await _repository.AddStatusHistoryAsync(device.Id, oldStatus, "PendingOnline", "HeartbeatReceived", now, cancellationToken);
        }

        if (oldStatus == "PendingOnline" || device.Status == "PendingOnline")
        {
            var hasStableReconnect = await _repository.HasStableReconnectAsync(device.Id, now, cancellationToken);
            if (hasStableReconnect)
            {
                var previousStatus = device.Status;
                device.Status = "Online";
                device.FailureCount = 0;
                await _repository.AddStatusHistoryAsync(device.Id, previousStatus, "Online", "ReconnectDebounced", now, cancellationToken);

                var statusEvent = new DeviceStatusChangedEvent(
                    device.Id,
                    device.Name,
                    device.Room,
                    previousStatus,
                    "Online",
                    now,
                    "ReconnectDebounced",
                    Guid.NewGuid().ToString("N"));

                await _hubContext.Clients
                    .Group($"home:{device.HomeId}")
                    .SendAsync("DeviceConnected", statusEvent, cancellationToken);

                await _notificationService.CreateDeviceStatusNotificationAsync(statusEvent, cancellationToken);
            }
        }

        await _repository.SaveChangesAsync(cancellationToken);
        return new HeartbeatResponse(true, device.Status, now, null);
    }
}

public interface IDeviceHeartbeatRepository
{
    Task<DeviceHeartbeatEntity?> GetDeviceAsync(Guid deviceId, CancellationToken cancellationToken);
    Task InsertHeartbeatAsync(HeartbeatRequest request, string? ipAddress, DateTime receivedAtUtc, CancellationToken cancellationToken);
    Task InsertRejectedHeartbeatAsync(Guid deviceId, string? ipAddress, string reason, CancellationToken cancellationToken);
    Task AddStatusHistoryAsync(Guid deviceId, string? oldStatus, string newStatus, string reason, DateTime? lastSeenTime, CancellationToken cancellationToken);
    Task<bool> HasStableReconnectAsync(Guid deviceId, DateTime nowUtc, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

public interface IDeviceAuthenticator
{
    Task<bool> ValidateAsync(HeartbeatRequest request, CancellationToken cancellationToken);
}

public sealed class DeviceHeartbeatEntity
{
    public Guid Id { get; set; }
    public Guid HomeId { get; set; }
    public string Name { get; set; } = "";
    public string? Room { get; set; }
    public string Status { get; set; } = "Unknown";
    public string? IPAddress { get; set; }
    public DateTime? LastSeenTime { get; set; }
    public int FailureCount { get; set; }
    public DateTime UpdatedAt { get; set; }
}

