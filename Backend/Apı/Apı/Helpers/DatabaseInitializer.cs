using Microsoft.Data.SqlClient;

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

                Execute(connection, @"
IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL UNIQUE
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = 'Admin') INSERT INTO dbo.Roles (Name) VALUES ('Admin');
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = 'Uye') INSERT INTO dbo.Roles (Name) VALUES ('Uye');
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = 'Misafir') INSERT INTO dbo.Roles (Name) VALUES ('Misafir');");

                Execute(connection, @"
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) NOT NULL UNIQUE,
        Email NVARCHAR(100) NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Salt NVARCHAR(500) NULL,
        Role NVARCHAR(20) NULL,
        RoleId INT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(Id)
    );
END;");

                EnsureColumn(connection, "Users", "Email", "NVARCHAR(100) NULL");
                EnsureColumn(connection, "Users", "Salt", "NVARCHAR(500) NULL");
                EnsureColumn(connection, "Users", "Role", "NVARCHAR(20) NULL");
                EnsureColumn(connection, "Users", "RoleId", "INT NULL");
                EnsureForeignKey(connection, "FK_Users_Roles", "ALTER TABLE dbo.Users ADD CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(Id)");

                Execute(connection, @"
UPDATE dbo.Users
SET RoleId = CASE
    WHEN Role IN ('Admin', 'administrator', 'superadmin') THEN (SELECT Id FROM dbo.Roles WHERE Name = 'Admin')
    WHEN Role IN ('Misafir', 'Guest', 'guest') THEN (SELECT Id FROM dbo.Roles WHERE Name = 'Misafir')
    ELSE (SELECT Id FROM dbo.Roles WHERE Name = 'Uye')
END
WHERE RoleId IS NULL;");

                Execute(connection, @"
IF OBJECT_ID('dbo.Logs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Logs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Level NVARCHAR(20) NULL,
        Message NVARCHAR(MAX) NULL,
        Source NVARCHAR(100) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END;");

                Execute(connection, @"
IF OBJECT_ID('dbo.SystemLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SystemLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EventId NVARCHAR(50) NOT NULL DEFAULT CONVERT(NVARCHAR(50), NEWID()),
        ServiceName NVARCHAR(100) NOT NULL,
        EventType NVARCHAR(50) NOT NULL DEFAULT 'System',
        LogLevel NVARCHAR(20) NOT NULL DEFAULT 'Information',
        Message NVARCHAR(MAX) NOT NULL,
        StackTrace NVARCHAR(MAX) NULL,
        Source NVARCHAR(255) NULL,
        UserId INT NULL,
        IpAddress NVARCHAR(50) NULL,
        MachineName NVARCHAR(100) NOT NULL DEFAULT HOST_NAME(),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        IsArchived BIT NOT NULL DEFAULT 0
    );
END;");

                EnsureColumn(connection, "SystemLogs", "EventId", "NVARCHAR(50) NOT NULL DEFAULT CONVERT(NVARCHAR(50), NEWID())");
                EnsureColumn(connection, "SystemLogs", "ServiceName", "NVARCHAR(100) NOT NULL DEFAULT 'System'");
                EnsureColumn(connection, "SystemLogs", "EventType", "NVARCHAR(50) NOT NULL DEFAULT 'System'");
                EnsureColumn(connection, "SystemLogs", "LogLevel", "NVARCHAR(20) NOT NULL DEFAULT 'Information'");
                EnsureColumn(connection, "SystemLogs", "Message", "NVARCHAR(MAX) NOT NULL DEFAULT ''");
                EnsureColumn(connection, "SystemLogs", "StackTrace", "NVARCHAR(MAX) NULL");
                EnsureColumn(connection, "SystemLogs", "Source", "NVARCHAR(255) NULL");
                EnsureColumn(connection, "SystemLogs", "UserId", "INT NULL");
                EnsureColumn(connection, "SystemLogs", "IpAddress", "NVARCHAR(50) NULL");
                EnsureColumn(connection, "SystemLogs", "MachineName", "NVARCHAR(100) NOT NULL DEFAULT HOST_NAME()");
                EnsureColumn(connection, "SystemLogs", "CreatedAt", "DATETIME NOT NULL DEFAULT GETDATE()");
                EnsureColumn(connection, "SystemLogs", "IsArchived", "BIT NOT NULL DEFAULT 0");

                EnsureIndex(connection, "IX_SystemLogs_LogLevel", "CREATE INDEX IX_SystemLogs_LogLevel ON dbo.SystemLogs (LogLevel)");
                EnsureIndex(connection, "IX_SystemLogs_EventType", "CREATE INDEX IX_SystemLogs_EventType ON dbo.SystemLogs (EventType)");
                EnsureIndex(connection, "IX_SystemLogs_CreatedAt", "CREATE INDEX IX_SystemLogs_CreatedAt ON dbo.SystemLogs (CreatedAt DESC)");
                EnsureIndex(connection, "IX_SystemLogs_IsArchived", "CREATE INDEX IX_SystemLogs_IsArchived ON dbo.SystemLogs (IsArchived)");

                EnsureFeatureTables(connection);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Error.WriteLine($"[DB INIT ERROR] Veritabani baslatilamadi: {ex.Message}");
                Console.ResetColor();
            }
        }

        private static void EnsureFeatureTables(SqlConnection connection)
        {
            Execute(connection, @"
IF OBJECT_ID('dbo.Sensors', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sensors (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Type NVARCHAR(50) NOT NULL DEFAULT 'temperature',
        Room NVARCHAR(100) NULL,
        Location NVARCHAR(200) NULL,
        Value FLOAT NOT NULL DEFAULT 0,
        Unit NVARCHAR(20) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'online',
        BatteryLevel INT NULL,
        LastUpdated DATETIME NOT NULL DEFAULT GETDATE(),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Title NVARCHAR(200) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL,
        Priority NVARCHAR(20) NOT NULL DEFAULT 'info',
        Category NVARCHAR(50) NOT NULL DEFAULT 'system',
        IsRead BIT NOT NULL DEFAULT 0,
        UserId INT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('dbo.Rooms', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Rooms (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Icon NVARCHAR(50) NULL DEFAULT 'fa-door-open',
        Description NVARCHAR(500) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('dbo.Automations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Automations (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        TriggerCondition NVARCHAR(500) NULL,
        ActionDescription NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        LastRun DATETIME NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END;");

            if (TableExists(connection, "Devices"))
            {
                EnsureColumn(connection, "Devices", "Room", "NVARCHAR(100) NULL");
                EnsureColumn(connection, "Devices", "Feature", "NVARCHAR(255) NULL");
            }
        }

        private static bool TableExists(SqlConnection connection, string tableName)
        {
            using var cmd = new SqlCommand("SELECT COUNT(1) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName", connection);
            cmd.Parameters.AddWithValue("@TableName", tableName);
            return (int)cmd.ExecuteScalar() > 0;
        }

        private static void EnsureColumn(SqlConnection connection, string tableName, string columnName, string definition)
        {
            using var cmd = new SqlCommand(@"
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = @ColumnName
)
BEGIN
    DECLARE @sql NVARCHAR(MAX) = N'ALTER TABLE dbo.' + QUOTENAME(@TableName) + N' ADD ' + QUOTENAME(@ColumnName) + N' ' + @Definition;
    EXEC sp_executesql @sql;
END;", connection);

            cmd.Parameters.AddWithValue("@TableName", tableName);
            cmd.Parameters.AddWithValue("@ColumnName", columnName);
            cmd.Parameters.AddWithValue("@Definition", definition);
            cmd.ExecuteNonQuery();
        }

        private static void EnsureIndex(SqlConnection connection, string indexName, string createSql)
        {
            using var cmd = new SqlCommand($@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = @IndexName)
BEGIN
    {createSql}
END;", connection);

            cmd.Parameters.AddWithValue("@IndexName", indexName);
            cmd.ExecuteNonQuery();
        }

        private static void EnsureForeignKey(SqlConnection connection, string keyName, string createSql)
        {
            using var cmd = new SqlCommand($@"
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = @KeyName)
BEGIN
    {createSql}
END;", connection);

            cmd.Parameters.AddWithValue("@KeyName", keyName);
            cmd.ExecuteNonQuery();
        }

        private static void Execute(SqlConnection connection, string sql)
        {
            using var cmd = new SqlCommand(sql, connection);
            cmd.ExecuteNonQuery();
        }
    }
}
