using Microsoft.Data.SqlClient;
using System;

namespace Api.Helpers
{
    public static class DatabaseInitializer
    {
        public static void Initialize(string connectionString)
        {
            try
            {
                using var connection = new SqlConnection(connectionString);
                connection.Open();

                // 1. Roles tablosu var mı kontrol et
                bool rolesTableExists = false;
                string checkRolesTableQuery = "SELECT COUNT(1) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Roles'";
                using (var cmd = new SqlCommand(checkRolesTableQuery, connection))
                {
                    rolesTableExists = (int)cmd.ExecuteScalar() > 0;
                }

                if (!rolesTableExists)
                {
                    Console.WriteLine("[DB INIT] Roles tablosu oluşturuluyor...");
                    string createRolesTableQuery = @"
                        CREATE TABLE Roles (
                            Id INT IDENTITY(1,1) PRIMARY KEY,
                            Name NVARCHAR(50) NOT NULL UNIQUE
                        );
                        INSERT INTO Roles (Name) VALUES ('Admin'), ('Uye'), ('Misafir');";
                    using (var cmd = new SqlCommand(createRolesTableQuery, connection))
                    {
                        cmd.ExecuteNonQuery();
                    }
                    Console.WriteLine("[DB INIT] Roles tablosu başarıyla oluşturuldu ve roller eklendi.");
                }

                // 1b. SystemLogs tablosu var mı kontrol et
                bool systemLogsTableExists = false;
                string checkSystemLogsTableQuery = "SELECT COUNT(1) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SystemLogs'";
                using (var cmd = new SqlCommand(checkSystemLogsTableQuery, connection))
                {
                    systemLogsTableExists = (int)cmd.ExecuteScalar() > 0;
                }

                if (!systemLogsTableExists)
                {
                    Console.WriteLine("[DB INIT] SystemLogs tablosu oluşturuluyor...");
                    string createSystemLogsQuery = @"
                        CREATE TABLE SystemLogs (
                            Id          INT IDENTITY(1,1) PRIMARY KEY,
                            EventId     NVARCHAR(50)  NOT NULL DEFAULT NEWID(),
                            ServiceName NVARCHAR(100) NOT NULL,
                            EventType   NVARCHAR(50)  NOT NULL DEFAULT 'System',
                            LogLevel    NVARCHAR(20)  NOT NULL DEFAULT 'Information',
                            Message     NVARCHAR(MAX) NOT NULL,
                            StackTrace  NVARCHAR(MAX) NULL,
                            Source      NVARCHAR(255) NULL,
                            UserId      INT           NULL,
                            IpAddress   NVARCHAR(50)  NULL,
                            MachineName NVARCHAR(100) NOT NULL DEFAULT HOST_NAME(),
                            CreatedAt   DATETIME      NOT NULL DEFAULT GETDATE(),
                            IsArchived  BIT           NOT NULL DEFAULT 0
                        );
                        CREATE INDEX IX_SystemLogs_LogLevel   ON SystemLogs (LogLevel);
                        CREATE INDEX IX_SystemLogs_EventType  ON SystemLogs (EventType);
                        CREATE INDEX IX_SystemLogs_CreatedAt  ON SystemLogs (CreatedAt DESC);
                        CREATE INDEX IX_SystemLogs_IsArchived ON SystemLogs (IsArchived);";
                    using (var cmd = new SqlCommand(createSystemLogsQuery, connection))
                    {
                        cmd.ExecuteNonQuery();
                    }
                    Console.WriteLine("[DB INIT] SystemLogs tablosu başarıyla oluşturuldu.");
                }

                // 1c. Sensors tablosu
                bool sensorsTableExists = false;
                string checkSensorsQuery = "SELECT COUNT(1) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sensors'";
                using (var cmd = new SqlCommand(checkSensorsQuery, connection))
                    sensorsTableExists = (int)cmd.ExecuteScalar() > 0;
                if (!sensorsTableExists)
                {
                    Console.WriteLine("[DB INIT] Sensors tablosu oluşturuluyor...");
                    string createSensors = @"
                        CREATE TABLE Sensors (
                            Id           INT IDENTITY(1,1) PRIMARY KEY,
                            Name         NVARCHAR(100) NOT NULL,
                            Type         NVARCHAR(50)  NOT NULL DEFAULT 'temperature',
                            Room         NVARCHAR(100) NULL,
                            Location     NVARCHAR(200) NULL,
                            Value        FLOAT         NOT NULL DEFAULT 0,
                            Unit         NVARCHAR(20)  NULL,
                            Status       NVARCHAR(20)  NOT NULL DEFAULT 'online',
                            BatteryLevel INT           NULL,
                            LastUpdated  DATETIME      NOT NULL DEFAULT GETDATE(),
                            CreatedAt    DATETIME      NOT NULL DEFAULT GETDATE()
                        );";
                    using (var cmd = new SqlCommand(createSensors, connection))
                        cmd.ExecuteNonQuery();
                    Console.WriteLine("[DB INIT] Sensors tablosu oluşturuldu.");
                }

                // 1d. Notifications tablosu
                bool notificationsTableExists = false;
                string checkNotificationsQuery = "SELECT COUNT(1) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Notifications'";
                using (var cmd = new SqlCommand(checkNotificationsQuery, connection))
                    notificationsTableExists = (int)cmd.ExecuteScalar() > 0;
                if (!notificationsTableExists)
                {
                    Console.WriteLine("[DB INIT] Notifications tablosu oluşturuluyor...");
                    string createNotifications = @"
                        CREATE TABLE Notifications (
                            Id        INT IDENTITY(1,1) PRIMARY KEY,
                            Title     NVARCHAR(200) NOT NULL,
                            Message   NVARCHAR(MAX) NOT NULL,
                            Priority  NVARCHAR(20)  NOT NULL DEFAULT 'info',
                            Category  NVARCHAR(50)  NOT NULL DEFAULT 'system',
                            IsRead    BIT           NOT NULL DEFAULT 0,
                            UserId    INT           NULL,
                            CreatedAt DATETIME      NOT NULL DEFAULT GETDATE()
                        );
                        CREATE INDEX IX_Notifications_IsRead   ON Notifications (IsRead);
                        CREATE INDEX IX_Notifications_Priority ON Notifications (Priority);
                        CREATE INDEX IX_Notifications_CreatedAt ON Notifications (CreatedAt DESC);";
                    using (var cmd = new SqlCommand(createNotifications, connection))
                        cmd.ExecuteNonQuery();
                    Console.WriteLine("[DB INIT] Notifications tablosu oluşturuldu.");
                }

                // 1e. Rooms tablosu
                bool roomsTableExists = false;
                string checkRoomsQuery = "SELECT COUNT(1) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Rooms'";
                using (var cmd = new SqlCommand(checkRoomsQuery, connection))
                    roomsTableExists = (int)cmd.ExecuteScalar() > 0;
                if (!roomsTableExists)
                {
                    Console.WriteLine("[DB INIT] Rooms tablosu oluşturuluyor...");
                    string createRooms = @"
                        CREATE TABLE Rooms (
                            Id          INT IDENTITY(1,1) PRIMARY KEY,
                            Name        NVARCHAR(100) NOT NULL,
                            Icon        NVARCHAR(50)  NULL DEFAULT 'fa-door-open',
                            Description NVARCHAR(500) NULL,
                            CreatedAt   DATETIME      NOT NULL DEFAULT GETDATE()
                        );";
                    using (var cmd = new SqlCommand(createRooms, connection))
                        cmd.ExecuteNonQuery();
                    Console.WriteLine("[DB INIT] Rooms tablosu oluşturuldu.");
                }

                // 1f. Automations tablosu
                bool automationsTableExists = false;
                string checkAutomationsQuery = "SELECT COUNT(1) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Automations'";
                using (var cmd = new SqlCommand(checkAutomationsQuery, connection))
                    automationsTableExists = (int)cmd.ExecuteScalar() > 0;
                if (!automationsTableExists)
                {
                    Console.WriteLine("[DB INIT] Automations tablosu oluşturuluyor...");
                    string createAutomations = @"
                        CREATE TABLE Automations (
                            Id                INT IDENTITY(1,1) PRIMARY KEY,
                            Name              NVARCHAR(100) NOT NULL,
                            Description       NVARCHAR(500) NULL,
                            TriggerCondition  NVARCHAR(500) NULL,
                            ActionDescription NVARCHAR(500) NULL,
                            IsActive          BIT           NOT NULL DEFAULT 1,
                            LastRun           DATETIME      NULL,
                            CreatedAt         DATETIME      NOT NULL DEFAULT GETDATE()
                        );";
                    using (var cmd = new SqlCommand(createAutomations, connection))
                        cmd.ExecuteNonQuery();
                    Console.WriteLine("[DB INIT] Automations tablosu oluşturuldu.");
                }

                // 1g. Devices tablosuna Room kolonu ekle (yoksa)
                bool roomColumnExists = false;
                string checkRoomColumn = "SELECT COUNT(1) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Devices' AND COLUMN_NAME = 'Room'";
                using (var cmd = new SqlCommand(checkRoomColumn, connection))
                    roomColumnExists = (int)cmd.ExecuteScalar() > 0;
                if (!roomColumnExists)
                {
                    Console.WriteLine("[DB INIT] Devices tablosuna Room kolonu ekleniyor...");
                    using (var cmd = new SqlCommand("ALTER TABLE Devices ADD Room NVARCHAR(100) NULL", connection))
                        cmd.ExecuteNonQuery();
                    Console.WriteLine("[DB INIT] Room kolonu eklendi.");
                }

                // 2. Users tablosunda RoleId kolonu var mı kontrol et
                bool roleIdColumnExists = false;
                string checkColumnQuery = "SELECT COUNT(1) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'RoleId'";
                using (var cmd = new SqlCommand(checkColumnQuery, connection))
                {
                    roleIdColumnExists = (int)cmd.ExecuteScalar() > 0;
                }

                if (!roleIdColumnExists)
                {
                    Console.WriteLine("[DB INIT] Users tablosuna RoleId kolonu ekleniyor...");
                    string addColumnQuery = @"
                        ALTER TABLE Users ADD RoleId INT NULL;
                        ALTER TABLE Users ADD CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id);";
                    using (var cmd = new SqlCommand(addColumnQuery, connection))
                    {
                        cmd.ExecuteNonQuery();
                    }

                    // Mevcut kullanıcıları eski Role veya varsayılan rol ile güncelle
                    string migrationQuery = @"
                        -- Eger Role kolonu varsa verileri aktar
                        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'Role')
                        BEGIN
                            EXEC('
                                UPDATE Users SET RoleId = (SELECT Id FROM Roles WHERE Name = ''Admin'') WHERE Role = ''Admin'';
                                UPDATE Users SET RoleId = (SELECT Id FROM Roles WHERE Name = ''Uye'') WHERE Role = ''Uye'' OR Role = ''User'' OR Role = ''Kullanıcı'';
                                UPDATE Users SET RoleId = (SELECT Id FROM Roles WHERE Name = ''Misafir'') WHERE Role = ''Misafir'' OR Role = ''Guest'';
                            ');
                        END
                        UPDATE Users SET RoleId = (SELECT Id FROM Roles WHERE Name = 'Uye') WHERE RoleId IS NULL;";
                    using (var cmd = new SqlCommand(migrationQuery, connection))
                    {
                        cmd.ExecuteNonQuery();
                    }
                    Console.WriteLine("[DB INIT] Users tablosu RoleId kolonu başarıyla eklendi ve mevcut kullanıcılar göç ettirildi.");
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Error.WriteLine($"[DB INIT HATA] Veritabanı başlatılamadı: {ex.Message}");
                Console.ResetColor();
            }
        }
    }
}
