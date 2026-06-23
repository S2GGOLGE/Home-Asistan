using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Api.Model.Logging;
using Api.Hubs;

namespace Api.Services.SystemLogging
{
    /// <summary>
    /// Gelişmiş sistem loglama servisi.
    /// Her kritik olayı SystemLogs tablosuna yazar ve SignalR üzerinden yayar.
    /// </summary>
    public class SystemLogService
    {
        private readonly string _connectionString;
        private readonly IHubContext<LogHub>? _hubContext;
        private const int MaxLogsToKeep = 10000;

        public SystemLogService(string connectionString, IHubContext<LogHub>? hubContext = null)
        {
            _connectionString = connectionString;
            _hubContext = hubContext;
        }

        // ─────────────────────────────────────────────────────────────────────
        // TEMEL LOG YAZMA
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Genel log kaydı oluşturur.
        /// </summary>
        public async Task LogAsync(
            string logLevel,
            string eventType,
            string message,
            string serviceName,
            string? source = null,
            string? stackTrace = null,
            int? userId = null,
            string? ipAddress = null)
        {
            var entry = new SystemLogEntry
            {
                EventId = Guid.NewGuid().ToString(),
                ServiceName = serviceName,
                EventType = eventType,
                LogLevel = logLevel,
                Message = message,
                Source = source,
                StackTrace = stackTrace,
                UserId = userId,
                IpAddress = ipAddress,
                MachineName = Environment.MachineName,
                CreatedAt = DateTime.Now
            };

            await WriteToDbAsync(entry);
            await PushToSignalRAsync(entry);
        }

        /// <summary>Sync wrapper — eski kod uyumluluğu için</summary>
        public void Log(string logLevel, string eventType, string message, string serviceName,
            string? source = null, string? stackTrace = null, int? userId = null, string? ipAddress = null)
        {
            LogAsync(logLevel, eventType, message, serviceName, source, stackTrace, userId, ipAddress).GetAwaiter().GetResult();
        }

        // ─────────────────────────────────────────────────────────────────────
        // KOLAYLAŞTIRICI METOTLAR
        // ─────────────────────────────────────────────────────────────────────

        public Task InfoAsync(string message, string serviceName, string eventType = EventTypes.System)
            => LogAsync(LogLevels.Information, eventType, message, serviceName);

        public Task WarningAsync(string message, string serviceName, string eventType = EventTypes.System)
            => LogAsync(LogLevels.Warning, eventType, message, serviceName);

        public Task ErrorAsync(string message, string serviceName, string? stackTrace = null,
            string eventType = EventTypes.Exception, int? userId = null)
            => LogAsync(LogLevels.Error, eventType, message, serviceName, stackTrace: stackTrace, userId: userId);

        public Task CriticalAsync(string message, string serviceName, string? stackTrace = null,
            string eventType = EventTypes.Crash)
            => LogAsync(LogLevels.Critical, eventType, message, serviceName, stackTrace: stackTrace);

        // ─────────────────────────────────────────────────────────────────────
        // ÖZEL OLAY METOTLARI
        // ─────────────────────────────────────────────────────────────────────

        public Task LogStartupAsync(string serviceName)
            => InfoAsync($"[BAŞLANGIC] {serviceName} servisi başarıyla başlatıldı.", serviceName, EventTypes.Startup);

        public Task LogShutdownAsync(string serviceName)
            => InfoAsync($"[KAPATMA] {serviceName} servisi durduruldu.", serviceName, EventTypes.Shutdown);

        public Task LogRestartAsync(string serviceName, string reason = "")
            => LogAsync(LogLevels.Warning, EventTypes.Restart,
                $"[YENİDEN BAŞLATMA] {serviceName} yeniden başlatıldı. Sebep: {reason}", serviceName);

        public Task LogCrashAsync(string serviceName, Exception ex)
            => CriticalAsync($"[CRASH] {serviceName} çöktü! Hata: {ex.Message}", serviceName,
                ex.StackTrace, EventTypes.Crash);

        public Task LogExceptionAsync(string serviceName, Exception ex, int? userId = null)
            => ErrorAsync($"[EXCEPTION] {ex.GetType().Name}: {ex.Message}", serviceName,
                ex.StackTrace, EventTypes.Exception, userId);

        public Task LogUnauthorizedAccessAsync(string resource, string? ipAddress = null, int? userId = null)
            => LogAsync(LogLevels.Warning, EventTypes.Authorization,
                $"[YETKİSİZ ERİŞİM] Kaynak: {resource} — Yetkisiz erişim denemesi.",
                "AuthMiddleware", ipAddress: ipAddress, userId: userId);

        public Task LogLoginAsync(string username, string? ipAddress = null, int? userId = null)
            => LogAsync(LogLevels.Information, EventTypes.Authentication,
                $"[GİRİŞ] Kullanıcı '{username}' sisteme giriş yaptı.",
                "LoginController", ipAddress: ipAddress, userId: userId);

        public Task LogLogoutAsync(string username, int? userId = null)
            => InfoAsync($"[ÇIKIŞ] Kullanıcı '{username}' sistemden çıkış yaptı.",
                "AuthController", EventTypes.Authentication);

        public Task LogRoleChangeAsync(string targetUsername, string oldRole, string newRole, int? changedByUserId = null)
            => LogAsync(LogLevels.Warning, EventTypes.Security,
                $"[ROL DEĞİŞİKLİĞİ] Kullanıcı '{targetUsername}' rolü '{oldRole}' → '{newRole}' olarak değiştirildi.",
                "UsersController", userId: changedByUserId);

        public Task LogDeviceAddedAsync(string deviceName, int? userId = null)
            => LogAsync(LogLevels.Information, EventTypes.Device,
                $"[CİHAZ EKLENDİ] '{deviceName}' adlı cihaz sisteme eklendi.",
                "DeviceController", userId: userId);

        public Task LogDeviceRemovedAsync(string deviceName, int? userId = null)
            => LogAsync(LogLevels.Warning, EventTypes.Device,
                $"[CİHAZ SİLİNDİ] '{deviceName}' adlı cihaz sistemden kaldırıldı.",
                "DeviceController", userId: userId);

        public Task LogAutomationTriggeredAsync(string automationName, string trigger)
            => InfoAsync($"[OTOMASYON] '{automationName}' otomasyonu tetiklendi. Tetikleyici: {trigger}",
                "AutomationService", EventTypes.Automation);

        public Task LogWatchdogInterventionAsync(string serviceName, string action)
            => LogAsync(LogLevels.Warning, EventTypes.Watchdog,
                $"[WATCHDOG] Watchdog müdahale etti. Servis: {serviceName} — İşlem: {action}",
                "WatchdogService");

        public Task LogApiErrorAsync(string endpoint, int statusCode, string errorMessage)
            => ErrorAsync($"[API HATA] {endpoint} → HTTP {statusCode}: {errorMessage}",
                "ApiMiddleware", eventType: EventTypes.Exception);

        // ─────────────────────────────────────────────────────────────────────
        // SORGULAMA VE ARŞİVLEME
        // ─────────────────────────────────────────────────────────────────────

        public List<SystemLogEntry> GetLogs(
            int page = 1,
            int pageSize = 100,
            string? logLevel = null,
            string? eventType = null,
            string? serviceName = null,
            DateTime? from = null,
            DateTime? to = null,
            bool includeArchived = false)
        {
            var logs = new List<SystemLogEntry>();

            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();

                var query = @"
                    SELECT Id, EventId, ServiceName, EventType, LogLevel, Message, StackTrace,
                           Source, UserId, IpAddress, MachineName, CreatedAt, IsArchived
                    FROM dbo.SystemLogs
                    WHERE 1=1
                    AND (@IncludeArchived = 1 OR IsArchived = 0)
                    AND (@LogLevel IS NULL OR LogLevel = @LogLevel)
                    AND (@EventType IS NULL OR EventType = @EventType)
                    AND (@ServiceName IS NULL OR ServiceName = @ServiceName)
                    AND (@From IS NULL OR CreatedAt >= @From)
                    AND (@To IS NULL OR CreatedAt <= @To)
                    ORDER BY Id DESC
                    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@IncludeArchived", includeArchived ? 1 : 0);
                cmd.Parameters.AddWithValue("@LogLevel", logLevel as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@EventType", eventType as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@ServiceName", serviceName as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@From", from as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@To", to as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Offset", (page - 1) * pageSize);
                cmd.Parameters.AddWithValue("@PageSize", pageSize);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    logs.Add(MapToEntry(reader));
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SystemLogService] GetLogs hata: {ex.Message}");
            }

            return logs;
        }

        public object GetLogsWithTotal(
            int page = 1,
            int pageSize = 100,
            string? logLevel = null,
            string? eventType = null,
            string? serviceName = null,
            DateTime? from = null,
            DateTime? to = null,
            bool includeArchived = false)
        {
            var logs = GetLogs(page, pageSize, logLevel, eventType, serviceName, from, to, includeArchived);
            var total = 0;

            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();

                const string query = @"
                    SELECT COUNT(1)
                    FROM dbo.SystemLogs
                    WHERE 1=1
                    AND (@IncludeArchived = 1 OR IsArchived = 0)
                    AND (@LogLevel IS NULL OR LogLevel = @LogLevel)
                    AND (@EventType IS NULL OR EventType = @EventType)
                    AND (@ServiceName IS NULL OR ServiceName = @ServiceName)
                    AND (@From IS NULL OR CreatedAt >= @From)
                    AND (@To IS NULL OR CreatedAt <= @To)";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@IncludeArchived", includeArchived ? 1 : 0);
                cmd.Parameters.AddWithValue("@LogLevel", logLevel as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@EventType", eventType as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@ServiceName", serviceName as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@From", from as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@To", to as object ?? DBNull.Value);

                total = Convert.ToInt32(cmd.ExecuteScalar());
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SystemLogService] Count hata: {ex.Message}");
            }

            return new
            {
                items = logs,
                page,
                pageSize,
                total,
                totalPages = pageSize > 0 ? (int)Math.Ceiling(total / (double)pageSize) : 0
            };
        }

        public object GetDashboard()
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();

                string query = @"
                    SELECT
                        (SELECT COUNT(1) FROM dbo.SystemLogs WHERE IsArchived = 0) AS TotalLogs,
                        (SELECT COUNT(1) FROM dbo.SystemLogs WHERE LogLevel = 'Critical' AND IsArchived = 0) AS CriticalCount,
                        (SELECT COUNT(1) FROM dbo.SystemLogs WHERE LogLevel = 'Error' AND IsArchived = 0) AS ErrorCount,
                        (SELECT COUNT(1) FROM dbo.SystemLogs WHERE LogLevel = 'Warning' AND IsArchived = 0) AS WarningCount,
                        (SELECT COUNT(1) FROM dbo.SystemLogs WHERE EventType = 'Restart' AND CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)) AS TodayRestarts,
                        (SELECT COUNT(1) FROM dbo.SystemLogs WHERE EventType = 'Crash' AND IsArchived = 0) AS CrashCount,
                        (SELECT TOP 1 Message FROM dbo.SystemLogs WHERE EventType = 'Watchdog' ORDER BY Id DESC) AS LastWatchdog,
                        (SELECT TOP 1 CreatedAt FROM dbo.SystemLogs WHERE EventType = 'Watchdog' ORDER BY Id DESC) AS LastWatchdogTime";

                using var cmd = new SqlCommand(query, conn);
                using var reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new
                    {
                        TotalLogs = reader["TotalLogs"] != DBNull.Value ? Convert.ToInt32(reader["TotalLogs"]) : 0,
                        CriticalCount = reader["CriticalCount"] != DBNull.Value ? Convert.ToInt32(reader["CriticalCount"]) : 0,
                        ErrorCount = reader["ErrorCount"] != DBNull.Value ? Convert.ToInt32(reader["ErrorCount"]) : 0,
                        WarningCount = reader["WarningCount"] != DBNull.Value ? Convert.ToInt32(reader["WarningCount"]) : 0,
                        TodayRestarts = reader["TodayRestarts"] != DBNull.Value ? Convert.ToInt32(reader["TodayRestarts"]) : 0,
                        CrashCount = reader["CrashCount"] != DBNull.Value ? Convert.ToInt32(reader["CrashCount"]) : 0,
                        LastWatchdog = reader["LastWatchdog"]?.ToString() ?? "",
                        LastWatchdogTime = reader["LastWatchdogTime"] != DBNull.Value
                            ? Convert.ToDateTime(reader["LastWatchdogTime"]).ToString("yyyy-MM-dd HH:mm:ss") : ""
                    };
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SystemLogService] GetDashboard hata: {ex.Message}");
            }

            return new { };
        }

        /// <summary>10.000'den fazla log varsa en eskileri arşivler.</summary>
        public async Task ArchiveOldLogsAsync()
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                string query = @"
                    UPDATE dbo.SystemLogs SET IsArchived = 1
                    WHERE Id NOT IN (
                        SELECT TOP (@MaxLogs) Id FROM dbo.SystemLogs ORDER BY Id DESC
                    ) AND IsArchived = 0";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@MaxLogs", MaxLogsToKeep);
                int archived = await cmd.ExecuteNonQueryAsync();

                if (archived > 0)
                    Console.WriteLine($"[SystemLogService] {archived} log arşivlendi.");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SystemLogService] ArchiveOldLogs hata: {ex.Message}");
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // YARDIMCI METOTLAR
        // ─────────────────────────────────────────────────────────────────────

        private async Task WriteToDbAsync(SystemLogEntry entry)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                string query = @"
                    INSERT INTO dbo.SystemLogs
                        (EventId, ServiceName, EventType, LogLevel, Message, StackTrace,
                         Source, UserId, IpAddress, MachineName, CreatedAt, IsArchived)
                    VALUES
                        (@EventId, @ServiceName, @EventType, @LogLevel, @Message, @StackTrace,
                         @Source, @UserId, @IpAddress, @MachineName, @CreatedAt, 0)";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@EventId", entry.EventId);
                cmd.Parameters.AddWithValue("@ServiceName", entry.ServiceName);
                cmd.Parameters.AddWithValue("@EventType", entry.EventType);
                cmd.Parameters.AddWithValue("@LogLevel", entry.LogLevel);
                cmd.Parameters.AddWithValue("@Message", entry.Message);
                cmd.Parameters.AddWithValue("@StackTrace", entry.StackTrace as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Source", entry.Source as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@UserId", entry.UserId as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@IpAddress", entry.IpAddress as object ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@MachineName", entry.MachineName);
                cmd.Parameters.AddWithValue("@CreatedAt", entry.CreatedAt);

                await cmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SystemLogService] DB yazma hatası: {ex.Message}");
            }
        }

        private async Task PushToSignalRAsync(SystemLogEntry entry)
        {
            if (_hubContext == null) return;
            try
            {
                var payload = new
                {
                    id = entry.Id,
                    eventId = entry.EventId,
                    serviceName = entry.ServiceName,
                    eventType = entry.EventType,
                    logLevel = entry.LogLevel,
                    message = entry.Message,
                    stackTrace = entry.StackTrace,
                    source = entry.Source,
                    userId = entry.UserId,
                    ipAddress = entry.IpAddress,
                    machineName = entry.MachineName,
                    createdAt = entry.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
                };

                await _hubContext.Clients.Group("LogViewers").SendAsync("SystemLogCreated", payload);
                await _hubContext.Clients.Group("LogViewers").SendAsync("NewLog", payload);
            }
            catch
            {
                // SignalR bağlantısı yoksa sessizce geç
            }
        }

        private static SystemLogEntry MapToEntry(SqlDataReader reader)
        {
            return new SystemLogEntry
            {
                Id = Convert.ToInt32(reader["Id"]),
                EventId = reader["EventId"]?.ToString() ?? "",
                ServiceName = reader["ServiceName"]?.ToString() ?? "",
                EventType = reader["EventType"]?.ToString() ?? "",
                LogLevel = reader["LogLevel"]?.ToString() ?? "",
                Message = reader["Message"]?.ToString() ?? "",
                StackTrace = reader["StackTrace"]?.ToString(),
                Source = reader["Source"]?.ToString(),
                UserId = reader["UserId"] != DBNull.Value ? Convert.ToInt32(reader["UserId"]) : null,
                IpAddress = reader["IpAddress"]?.ToString(),
                MachineName = reader["MachineName"]?.ToString() ?? "",
                CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]) : DateTime.Now,
                IsArchived = reader["IsArchived"] != DBNull.Value && Convert.ToBoolean(reader["IsArchived"])
            };
        }
    }
}
