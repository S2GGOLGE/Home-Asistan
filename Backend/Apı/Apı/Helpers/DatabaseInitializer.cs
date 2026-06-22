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
