CREATE TABLE Devices (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    HomeId UNIQUEIDENTIFIER NULL,
    Name NVARCHAR(150) NOT NULL,
    DeviceType NVARCHAR(50) NOT NULL,
    Room NVARCHAR(100) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Offline',
    LastSeenTime DATETIME2 NULL,
    IPAddress NVARCHAR(45) NULL,
    FailureCount INT NOT NULL DEFAULT 0,
    HeartbeatIntervalSeconds INT NOT NULL DEFAULT 15,
    OfflineTimeoutSeconds INT NOT NULL DEFAULT 60,
    IsEnabled BIT NOT NULL DEFAULT 1,
    Metadata NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Devices_Status CHECK (Status IN ('Online', 'Offline', 'PendingOnline', 'Unknown')),
    CONSTRAINT CK_Devices_Metadata_IsJson CHECK (Metadata IS NULL OR ISJSON(Metadata) = 1)
);

CREATE INDEX IX_Devices_Status_LastSeenTime
ON Devices(Status, LastSeenTime)
WHERE IsEnabled = 1;

CREATE TABLE DeviceHeartbeats (
    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    DeviceId UNIQUEIDENTIFIER NULL,
    ClaimedDeviceId UNIQUEIDENTIFIER NOT NULL,
    ReceivedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IPAddress NVARCHAR(45) NULL,
    FirmwareVersion NVARCHAR(50) NULL,
    BootId NVARCHAR(100) NULL,
    PayloadJson NVARCHAR(MAX) NULL,
    IsAccepted BIT NOT NULL DEFAULT 1,
    RejectReason NVARCHAR(250) NULL,
    CONSTRAINT FK_DeviceHeartbeats_Devices FOREIGN KEY (DeviceId) REFERENCES Devices(Id),
    CONSTRAINT CK_DeviceHeartbeats_PayloadJson_IsJson CHECK (PayloadJson IS NULL OR ISJSON(PayloadJson) = 1)
);

CREATE INDEX IX_DeviceHeartbeats_DeviceId_ReceivedAt
ON DeviceHeartbeats(DeviceId, ReceivedAt DESC);

CREATE INDEX IX_DeviceHeartbeats_ClaimedDeviceId_ReceivedAt
ON DeviceHeartbeats(ClaimedDeviceId, ReceivedAt DESC);

CREATE TABLE DeviceStatusHistory (
    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    DeviceId UNIQUEIDENTIFIER NOT NULL,
    OldStatus NVARCHAR(20) NULL,
    NewStatus NVARCHAR(20) NOT NULL,
    Reason NVARCHAR(100) NOT NULL,
    LastSeenTime DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CorrelationId NVARCHAR(100) NULL,
    CONSTRAINT FK_DeviceStatusHistory_Devices FOREIGN KEY (DeviceId) REFERENCES Devices(Id),
    CONSTRAINT CK_DeviceStatusHistory_NewStatus CHECK (NewStatus IN ('Online', 'Offline', 'PendingOnline', 'Unknown'))
);

CREATE INDEX IX_DeviceStatusHistory_DeviceId_CreatedAt
ON DeviceStatusHistory(DeviceId, CreatedAt DESC);

CREATE TABLE Notifications (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NULL,
    DeviceId UNIQUEIDENTIFIER NULL,
    NotificationType NVARCHAR(50) NOT NULL,
    Title NVARCHAR(150) NOT NULL,
    Message NVARCHAR(500) NOT NULL,
    Severity NVARCHAR(20) NOT NULL DEFAULT 'Info',
    IsRead BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Notifications_Devices FOREIGN KEY (DeviceId) REFERENCES Devices(Id),
    CONSTRAINT CK_Notifications_Severity CHECK (Severity IN ('Info', 'Warning', 'Critical'))
);

CREATE INDEX IX_Notifications_UserId_IsRead_CreatedAt
ON Notifications(UserId, IsRead, CreatedAt DESC);

CREATE TABLE NotificationLogs (
    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    NotificationId UNIQUEIDENTIFIER NOT NULL,
    Channel NVARCHAR(30) NOT NULL,
    Status NVARCHAR(30) NOT NULL,
    ErrorMessage NVARCHAR(500) NULL,
    SentAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_NotificationLogs_Notifications FOREIGN KEY (NotificationId) REFERENCES Notifications(Id),
    CONSTRAINT CK_NotificationLogs_Channel CHECK (Channel IN ('Web', 'Push', 'JarvisVoice')),
    CONSTRAINT CK_NotificationLogs_Status CHECK (Status IN ('Pending', 'Sent', 'Failed', 'Skipped'))
);
