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
