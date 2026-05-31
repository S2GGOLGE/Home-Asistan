using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Jarvis.Backend.DeviceMonitoring;

public sealed class DeviceMonitorOptions
{
    public int CheckIntervalSeconds { get; init; } = 10;
    public int DefaultOfflineTimeoutSeconds { get; init; } = 60;
}

public sealed class DeviceMonitorService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<DeviceStatusHub> _hubContext;
    private readonly IOptions<DeviceMonitorOptions> _options;
    private readonly ILogger<DeviceMonitorService> _logger;

    public DeviceMonitorService(
        IServiceScopeFactory scopeFactory,
        IHubContext<DeviceStatusHub> hubContext,
        IOptions<DeviceMonitorOptions> options,
        ILogger<DeviceMonitorService> logger)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(_options.Value.CheckIntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DetectOfflineDevicesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Device monitor iteration failed");
            }

            await Task.Delay(interval, stoppingToken);
        }
    }

    private async Task DetectOfflineDevicesAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var now = DateTime.UtcNow;

        var timedOutDevices = await repository.GetTimedOutOnlineDevicesAsync(now, cancellationToken);

        foreach (var device in timedOutDevices)
        {
            var oldStatus = device.Status;
            device.Status = "Offline";
            device.FailureCount += 1;
            device.UpdatedAt = now;

            var correlationId = Guid.NewGuid().ToString("N");

            await repository.AddStatusHistoryAsync(
                device.Id,
                oldStatus,
                "Offline",
                "HeartbeatTimeout",
                device.LastSeenTime,
                correlationId,
                cancellationToken);

            await repository.SaveChangesAsync(cancellationToken);

            var statusEvent = new DeviceStatusChangedEvent(
                device.Id,
                device.Name,
                device.Room,
                oldStatus,
                "Offline",
                device.LastSeenTime ?? now,
                "HeartbeatTimeout",
                correlationId);

            await _hubContext.Clients
                .Group($"home:{device.HomeId}")
                .SendAsync("DeviceDisconnected", statusEvent, cancellationToken);

            await notificationService.CreateDeviceStatusNotificationAsync(
                statusEvent,
                cancellationToken);
        }
    }
}

public interface IDeviceRepository
{
    Task<IReadOnlyList<DeviceEntity>> GetTimedOutOnlineDevicesAsync(DateTime nowUtc, CancellationToken cancellationToken);
    Task AddStatusHistoryAsync(Guid deviceId, string? oldStatus, string newStatus, string reason, DateTime? lastSeenTime, string correlationId, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

public interface INotificationService
{
    Task CreateDeviceStatusNotificationAsync(DeviceStatusChangedEvent statusEvent, CancellationToken cancellationToken);
}

public sealed class DeviceEntity
{
    public Guid Id { get; set; }
    public Guid HomeId { get; set; }
    public string Name { get; set; } = "";
    public string? Room { get; set; }
    public string Status { get; set; } = "Unknown";
    public DateTime? LastSeenTime { get; set; }
    public int FailureCount { get; set; }
    public DateTime UpdatedAt { get; set; }
}
