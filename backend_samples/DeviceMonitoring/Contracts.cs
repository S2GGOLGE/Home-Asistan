namespace Jarvis.Backend.DeviceMonitoring;

public sealed record HeartbeatRequest(
    Guid DeviceId,
    string? FirmwareVersion,
    string? BootId,
    Dictionary<string, object?>? Payload,
    string? Nonce,
    string? Signature
);

public sealed record HeartbeatResponse(
    bool Accepted,
    string Status,
    DateTime ServerTimeUtc,
    string? Message
);

public sealed record DeviceStatusChangedEvent(
    Guid DeviceId,
    string DeviceName,
    string? Room,
    string OldStatus,
    string NewStatus,
    DateTime LastSeenTimeUtc,
    string Reason,
    string CorrelationId
);

