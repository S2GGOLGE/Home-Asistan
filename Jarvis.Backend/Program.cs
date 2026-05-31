using System.Collections.Concurrent;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddSingleton<DeviceStore>();
builder.Services.AddSingleton<NotificationStore>();
builder.Services.Configure<DeviceMonitorOptions>(
    builder.Configuration.GetSection("DeviceMonitor"));
builder.Services.AddHostedService<DeviceMonitorService>();

var app = builder.Build();

SeedDevices(app.Services.GetRequiredService<DeviceStore>());

app.MapGet("/", () => Results.Ok(new
{
    service = "Jarvis.Backend",
    status = "running",
    endpoints = new[]
    {
        "GET /health",
        "GET /api/devices",
        "POST /api/devices/heartbeat",
        "POST /api/commands/execute",
        "GET /api/notifications",
        "GET /panel",
        "POST /api/devices/{deviceId:guid}/force-offline",
        "GET /hubs/device-status"
    }
}));

app.MapGet("/health", (DeviceStore devices, NotificationStore notifications) => Results.Ok(new
{
    status = "Healthy",
    service = "Jarvis.Backend",
    timeUtc = DateTimeOffset.UtcNow,
    deviceCount = devices.GetAll().Count,
    notificationCount = notifications.Count,
    processId = Environment.ProcessId
}));

app.MapGet("/panel", () => Results.Content(RenderPanelHtml(), "text/html"));

app.MapGet("/api/devices", (DeviceStore store) =>
{
    return Results.Ok(store.GetAll());
});

app.MapGet("/api/notifications", (NotificationStore store) =>
{
    return Results.Ok(store.GetAll());
});

app.MapPost("/api/commands/execute", (
    ExecuteCommandRequest request,
    DeviceStore devices) =>
{
    var device = devices.GetAll().FirstOrDefault(candidate =>
        string.Equals(candidate.DeviceType, request.DeviceType, StringComparison.OrdinalIgnoreCase) &&
        string.Equals(candidate.Room, request.Room, StringComparison.OrdinalIgnoreCase));

    if (device is null)
    {
        return Results.NotFound(new ExecuteCommandResponse(
            false,
            Guid.NewGuid().ToString("N"),
            null,
            "Matching device not found",
            request.Parameters ?? new Dictionary<string, object?>()));
    }

    return Results.Ok(new ExecuteCommandResponse(
        true,
        Guid.NewGuid().ToString("N"),
        device.Id,
        $"{device.Room} {device.Name} command accepted",
        request.Parameters ?? new Dictionary<string, object?>()));
});

app.MapPost("/api/devices/heartbeat", async (
    HeartbeatRequest request,
    HttpContext httpContext,
    DeviceStore devices,
    NotificationStore notifications,
    IHubContext<DeviceStatusHub> hubContext,
    CancellationToken cancellationToken) =>
{
    var now = DateTimeOffset.UtcNow;
    var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();

    if (!devices.TryGet(request.DeviceId, out var device))
    {
        devices.AddRejectedHeartbeat(request.DeviceId, ipAddress, "UnknownDevice", now);
        return Results.NotFound(new HeartbeatResponse(false, "Rejected", now, "Unknown device"));
    }

    if (!IsHeartbeatSignatureAccepted(request))
    {
        devices.AddRejectedHeartbeat(request.DeviceId, ipAddress, "InvalidSignature", now);
        return Results.Unauthorized();
    }

    var oldStatus = device.Status;
    device.LastSeenTime = now;
    device.IPAddress = ipAddress;
    device.FirmwareVersion = request.FirmwareVersion;
    device.BootId = request.BootId;
    device.UpdatedAt = now;

    devices.AddHeartbeat(request.DeviceId, ipAddress, request.FirmwareVersion, request.BootId, now, true, null);

    if (oldStatus is DeviceStatus.Offline or DeviceStatus.Unknown)
    {
        device.Status = DeviceStatus.PendingOnline;
        devices.AddStatusHistory(device, oldStatus, DeviceStatus.PendingOnline, "HeartbeatReceived", now);
    }

    if (device.Status == DeviceStatus.PendingOnline && devices.HasStableReconnect(device.Id, now))
    {
        var previousStatus = device.Status;
        device.Status = DeviceStatus.Online;
        device.FailureCount = 0;
        device.UpdatedAt = now;

        var statusEvent = DeviceStatusChangedEvent.From(device, previousStatus, DeviceStatus.Online, "ReconnectDebounced");
        devices.AddStatusHistory(device, previousStatus, DeviceStatus.Online, "ReconnectDebounced", now);
        notifications.Add(Notification.FromStatusEvent(statusEvent));

        await hubContext.Clients.Group($"home:{device.HomeId}")
            .SendAsync("DeviceConnected", statusEvent, cancellationToken);
    }

    return Results.Ok(new HeartbeatResponse(true, device.Status.ToString(), now, null));
});

app.MapPost("/api/devices/{deviceId:guid}/force-offline", async (
    Guid deviceId,
    DeviceStore devices,
    NotificationStore notifications,
    IHubContext<DeviceStatusHub> hubContext,
    CancellationToken cancellationToken) =>
{
    if (!devices.TryGet(deviceId, out var device))
    {
        return Results.NotFound();
    }

    var oldStatus = device.Status;
    device.Status = DeviceStatus.Offline;
    device.UpdatedAt = DateTimeOffset.UtcNow;
    device.FailureCount += 1;

    var statusEvent = DeviceStatusChangedEvent.From(device, oldStatus, DeviceStatus.Offline, "ManualTest");
    devices.AddStatusHistory(device, oldStatus, DeviceStatus.Offline, "ManualTest", DateTimeOffset.UtcNow);
    notifications.Add(Notification.FromStatusEvent(statusEvent));

    await hubContext.Clients.Group($"home:{device.HomeId}")
        .SendAsync("DeviceDisconnected", statusEvent, cancellationToken);

    return Results.Ok(statusEvent);
});

app.MapHub<DeviceStatusHub>("/hubs/device-status");

app.Run();

static bool IsHeartbeatSignatureAccepted(HeartbeatRequest request)
{
    return string.IsNullOrWhiteSpace(request.Signature) || request.Signature == "demo";
}

static void SeedDevices(DeviceStore store)
{
    var homeId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    store.Upsert(new Device
    {
        Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
        HomeId = homeId,
        Name = "Lamba",
        DeviceType = "light",
        Room = "Salon",
        Status = DeviceStatus.Unknown,
        HeartbeatIntervalSeconds = 15,
        OfflineTimeoutSeconds = 60,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    });

    store.Upsert(new Device
    {
        Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
        HomeId = homeId,
        Name = "Priz",
        DeviceType = "plug",
        Room = "Mutfak",
        Status = DeviceStatus.Unknown,
        HeartbeatIntervalSeconds = 15,
        OfflineTimeoutSeconds = 60,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    });
}

static string RenderPanelHtml()
{
    return """
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Jarvis Device Monitor</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7fb;
      --panel: #ffffff;
      --line: #d9e2ef;
      --text: #172033;
      --muted: #5e6d82;
      --ok: #10845b;
      --warn: #b54708;
      --bad: #c62828;
      --blue: #205bb8;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Segoe UI, Arial, sans-serif;
    }

    header {
      border-bottom: 1px solid var(--line);
      background: var(--panel);
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    h1 {
      font-size: 20px;
      line-height: 1.2;
      margin: 0;
      letter-spacing: 0;
    }

    main {
      width: min(1180px, calc(100% - 32px));
      margin: 24px auto;
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 20px;
    }

    section {
      min-width: 0;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 34px;
      padding: 0 12px;
      border: 1px solid var(--line);
      background: #f8fafc;
      border-radius: 6px;
      color: var(--muted);
      font-size: 14px;
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--warn);
    }

    .dot.connected { background: var(--ok); }

    button, label.toggle {
      min-height: 36px;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      border-radius: 6px;
      padding: 0 12px;
      font: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    button.primary {
      border-color: var(--blue);
      background: var(--blue);
      color: #fff;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }

    .card, .feed {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 14px;
    }

    .card h2, .feed h2 {
      font-size: 16px;
      margin: 0 0 10px;
      letter-spacing: 0;
    }

    .meta {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 0 9px;
      border-radius: 999px;
      font-size: 13px;
      border: 1px solid var(--line);
      margin: 8px 0;
    }

    .Online { color: var(--ok); border-color: #a8d8c6; background: #eefaf5; }
    .Offline { color: var(--bad); border-color: #f0b4b4; background: #fff1f1; }
    .PendingOnline { color: var(--warn); border-color: #f2cf9b; background: #fff7e8; }
    .Unknown { color: var(--muted); background: #f8fafc; }

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .event {
      border-bottom: 1px solid var(--line);
      padding: 10px 0;
    }

    .event:last-child { border-bottom: 0; }

    .event strong {
      display: block;
      font-size: 14px;
      margin-bottom: 3px;
    }

    @media (max-width: 780px) {
      main { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Jarvis Device Monitor</h1>
    <div class="toolbar">
      <span class="status"><span id="socket-dot" class="dot"></span><span id="socket-status">Baglaniyor</span></span>
      <button id="permission-button" class="primary">Bildirim izni ver</button>
      <label class="toggle"><input id="voice-toggle" type="checkbox" checked> Sesli oku</label>
    </div>
  </header>

  <main>
    <section>
      <div id="devices" class="grid"></div>
    </section>
    <section class="feed">
      <h2>Anlik bildirimler</h2>
      <div id="events"></div>
    </section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.7/dist/browser/signalr.min.js"></script>
  <script>
    const homeId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const devicesEl = document.getElementById("devices");
    const eventsEl = document.getElementById("events");
    const socketDot = document.getElementById("socket-dot");
    const socketStatus = document.getElementById("socket-status");
    const voiceToggle = document.getElementById("voice-toggle");
    const permissionButton = document.getElementById("permission-button");

    permissionButton.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        addEvent("Browser notification", "Bu tarayici bildirim desteklemiyor.");
        return;
      }

      const permission = await Notification.requestPermission();
      addEvent("Browser notification", "Bildirim izni: " + permission);
    });

    function messageFromEvent(event, connected) {
      const name = [event.room, event.deviceName].filter(Boolean).join(" ");
      return connected ? name + " tekrar baglandi" : name + " baglantisi kesildi";
    }

    function speak(message) {
      if (!voiceToggle.checked || !("speechSynthesis" in window)) return;

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "tr-TR";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }

    function browserNotify(title, message) {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      new Notification(title, { body: message });
    }

    function addEvent(title, message) {
      const row = document.createElement("div");
      row.className = "event";
      row.innerHTML = "<strong>" + title + "</strong><span class='meta'>" + message + "<br>" + new Date().toLocaleTimeString() + "</span>";
      eventsEl.prepend(row);
    }

    function handleStatusEvent(title, event, connected) {
      const message = messageFromEvent(event, connected);
      addEvent(title, message);
      browserNotify(title, message);
      speak(message);
      loadDevices();
    }

    async function loadDevices() {
      const response = await fetch("/api/devices");
      const devices = await response.json();
      devicesEl.innerHTML = "";

      for (const device of devices) {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <h2>${device.room ?? ""} ${device.name}</h2>
          <span class="badge ${device.status}">${device.status}</span>
          <div class="meta">
            Type: ${device.deviceType}<br>
            Last seen: ${device.lastSeenTime ?? "-"}<br>
            Failure count: ${device.failureCount}
          </div>
          <div class="actions">
            <button data-action="heartbeat" data-id="${device.id}">Heartbeat x2</button>
            <button data-action="offline" data-id="${device.id}">Offline yap</button>
          </div>
        `;
        devicesEl.appendChild(card);
      }
    }

    devicesEl.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const deviceId = button.dataset.id;
      if (button.dataset.action === "offline") {
        await fetch(`/api/devices/${deviceId}/force-offline`, { method: "POST" });
        await loadDevices();
        return;
      }

      const body = {
        deviceId,
        firmwareVersion: "1.0.0",
        bootId: "panel-demo",
        payload: {},
        nonce: "demo",
        signature: "demo"
      };

      await fetch("/api/devices/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetch("/api/devices/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      await loadDevices();
    });

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("/hubs/device-status")
      .withAutomaticReconnect()
      .build();

    connection.on("DeviceConnected", event => handleStatusEvent("DeviceConnected", event, true));
    connection.on("DeviceDisconnected", event => handleStatusEvent("DeviceDisconnected", event, false));

    connection.onreconnecting(() => {
      socketDot.classList.remove("connected");
      socketStatus.textContent = "Yeniden baglaniyor";
    });

    connection.onreconnected(async () => {
      await connection.invoke("SubscribeToHome", homeId);
      socketDot.classList.add("connected");
      socketStatus.textContent = "Baglandi";
      await loadDevices();
    });

    async function start() {
      await loadDevices();
      await connection.start();
      await connection.invoke("SubscribeToHome", homeId);
      socketDot.classList.add("connected");
      socketStatus.textContent = "Baglandi";
      addEvent("Panel hazir", "SignalR eventleri dinleniyor.");
    }

    start().catch(error => {
      socketStatus.textContent = "Baglanti hatasi";
      addEvent("SignalR error", String(error));
    });
  </script>
</body>
</html>
""";
}

public sealed class DeviceStatusHub : Hub
{
    public Task SubscribeToHome(Guid homeId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, $"home:{homeId}");
    }
}

public sealed class DeviceMonitorOptions
{
    public int CheckIntervalSeconds { get; init; } = 10;
}

public sealed class DeviceMonitorService : BackgroundService
{
    private readonly DeviceStore _devices;
    private readonly NotificationStore _notifications;
    private readonly IHubContext<DeviceStatusHub> _hubContext;
    private readonly ILogger<DeviceMonitorService> _logger;
    private readonly DeviceMonitorOptions _options;

    public DeviceMonitorService(
        DeviceStore devices,
        NotificationStore notifications,
        IHubContext<DeviceStatusHub> hubContext,
        IConfiguration configuration,
        ILogger<DeviceMonitorService> logger)
    {
        _devices = devices;
        _notifications = notifications;
        _hubContext = hubContext;
        _logger = logger;
        _options = configuration.GetSection("DeviceMonitor").Get<DeviceMonitorOptions>() ?? new DeviceMonitorOptions();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DetectOfflineDevices(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Device monitor iteration failed");
            }

            await Task.Delay(TimeSpan.FromSeconds(_options.CheckIntervalSeconds), stoppingToken);
        }
    }

    private async Task DetectOfflineDevices(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var device in _devices.GetTimedOutOnlineDevices(now))
        {
            var oldStatus = device.Status;
            device.Status = DeviceStatus.Offline;
            device.FailureCount += 1;
            device.UpdatedAt = now;

            var statusEvent = DeviceStatusChangedEvent.From(device, oldStatus, DeviceStatus.Offline, "HeartbeatTimeout");
            _devices.AddStatusHistory(device, oldStatus, DeviceStatus.Offline, "HeartbeatTimeout", now);
            _notifications.Add(Notification.FromStatusEvent(statusEvent));

            await _hubContext.Clients.Group($"home:{device.HomeId}")
                .SendAsync("DeviceDisconnected", statusEvent, cancellationToken);
        }
    }
}

public sealed class DeviceStore
{
    private readonly ConcurrentDictionary<Guid, Device> _devices = new();
    private readonly ConcurrentQueue<DeviceHeartbeat> _heartbeats = new();
    private readonly ConcurrentQueue<DeviceStatusHistory> _history = new();

    public IReadOnlyCollection<Device> GetAll()
    {
        return _devices.Values.OrderBy(device => device.Room).ThenBy(device => device.Name).ToArray();
    }

    public bool TryGet(Guid id, out Device device)
    {
        return _devices.TryGetValue(id, out device!);
    }

    public void Upsert(Device device)
    {
        _devices[device.Id] = device;
    }

    public void AddHeartbeat(
        Guid deviceId,
        string? ipAddress,
        string? firmwareVersion,
        string? bootId,
        DateTimeOffset receivedAt,
        bool accepted,
        string? rejectReason)
    {
        _heartbeats.Enqueue(new DeviceHeartbeat(
            deviceId,
            deviceId,
            receivedAt,
            ipAddress,
            firmwareVersion,
            bootId,
            accepted,
            rejectReason));
    }

    public void AddRejectedHeartbeat(Guid claimedDeviceId, string? ipAddress, string rejectReason, DateTimeOffset receivedAt)
    {
        _heartbeats.Enqueue(new DeviceHeartbeat(
            null,
            claimedDeviceId,
            receivedAt,
            ipAddress,
            null,
            null,
            false,
            rejectReason));
    }

    public bool HasStableReconnect(Guid deviceId, DateTimeOffset now)
    {
        return _heartbeats
            .Where(heartbeat => heartbeat.DeviceId == deviceId && heartbeat.IsAccepted)
            .Where(heartbeat => now - heartbeat.ReceivedAt <= TimeSpan.FromSeconds(20))
            .Take(2)
            .Count() >= 2;
    }

    public IEnumerable<Device> GetTimedOutOnlineDevices(DateTimeOffset now)
    {
        return _devices.Values.Where(device =>
            device.Status == DeviceStatus.Online &&
            device.LastSeenTime is not null &&
            now - device.LastSeenTime > TimeSpan.FromSeconds(device.OfflineTimeoutSeconds));
    }

    public void AddStatusHistory(Device device, DeviceStatus oldStatus, DeviceStatus newStatus, string reason, DateTimeOffset createdAt)
    {
        _history.Enqueue(new DeviceStatusHistory(
            device.Id,
            oldStatus.ToString(),
            newStatus.ToString(),
            reason,
            device.LastSeenTime,
            createdAt,
            Guid.NewGuid().ToString("N")));
    }
}

public sealed class NotificationStore
{
    private readonly ConcurrentQueue<Notification> _notifications = new();

    public int Count => _notifications.Count;

    public void Add(Notification notification)
    {
        _notifications.Enqueue(notification);
    }

    public IReadOnlyCollection<Notification> GetAll()
    {
        return _notifications.Reverse().ToArray();
    }
}

public enum DeviceStatus
{
    Unknown,
    PendingOnline,
    Online,
    Offline
}

public sealed record HeartbeatRequest(
    Guid DeviceId,
    string? FirmwareVersion,
    string? BootId,
    Dictionary<string, object?>? Payload,
    string? Nonce,
    string? Signature);

public sealed record ExecuteCommandRequest(
    string Intent,
    string DeviceType,
    string Room,
    Dictionary<string, object?>? Parameters,
    string? CorrelationId,
    string? UserId);

public sealed record ExecuteCommandResponse(
    bool Success,
    string CommandId,
    Guid? DeviceId,
    string Message,
    Dictionary<string, object?> State);

public sealed record HeartbeatResponse(
    bool Accepted,
    string Status,
    DateTimeOffset ServerTimeUtc,
    string? Message);

public sealed record DeviceStatusChangedEvent(
    Guid DeviceId,
    string DeviceName,
    string? Room,
    string OldStatus,
    string NewStatus,
    DateTimeOffset LastSeenTimeUtc,
    string Reason,
    string CorrelationId)
{
    public static DeviceStatusChangedEvent From(Device device, DeviceStatus oldStatus, DeviceStatus newStatus, string reason)
    {
        return new DeviceStatusChangedEvent(
            device.Id,
            device.Name,
            device.Room,
            oldStatus.ToString(),
            newStatus.ToString(),
            device.LastSeenTime ?? DateTimeOffset.UtcNow,
            reason,
            Guid.NewGuid().ToString("N"));
    }
}

public sealed class Device
{
    public Guid Id { get; set; }
    public Guid HomeId { get; set; }
    public string Name { get; set; } = "";
    public string DeviceType { get; set; } = "";
    public string? Room { get; set; }
    public DeviceStatus Status { get; set; }
    public DateTimeOffset? LastSeenTime { get; set; }
    public string? IPAddress { get; set; }
    public string? FirmwareVersion { get; set; }
    public string? BootId { get; set; }
    public int FailureCount { get; set; }
    public int HeartbeatIntervalSeconds { get; set; }
    public int OfflineTimeoutSeconds { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed record DeviceHeartbeat(
    Guid? DeviceId,
    Guid ClaimedDeviceId,
    DateTimeOffset ReceivedAt,
    string? IPAddress,
    string? FirmwareVersion,
    string? BootId,
    bool IsAccepted,
    string? RejectReason);

public sealed record DeviceStatusHistory(
    Guid DeviceId,
    string OldStatus,
    string NewStatus,
    string Reason,
    DateTimeOffset? LastSeenTime,
    DateTimeOffset CreatedAt,
    string CorrelationId);

public sealed record Notification(
    Guid Id,
    Guid? DeviceId,
    string NotificationType,
    string Title,
    string Message,
    string Severity,
    DateTimeOffset CreatedAt)
{
    public static Notification FromStatusEvent(DeviceStatusChangedEvent statusEvent)
    {
        var isOffline = statusEvent.NewStatus == DeviceStatus.Offline.ToString();
        var title = isOffline ? "Device disconnected" : "Device connected";
        var message = isOffline
            ? $"{statusEvent.Room} {statusEvent.DeviceName} baglantisi kesildi"
            : $"{statusEvent.Room} {statusEvent.DeviceName} tekrar baglandi";

        return new Notification(
            Guid.NewGuid(),
            statusEvent.DeviceId,
            statusEvent.NewStatus,
            title,
            message.Trim(),
            isOffline ? "Warning" : "Info",
            DateTimeOffset.UtcNow);
    }
}
