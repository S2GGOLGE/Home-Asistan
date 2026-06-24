using System;

namespace Api.Model.Logging
{
    /// <summary>
    /// Genel uygulama/kullanıcı log kaydını temsil eder (dbo.Logs tablosu).
    /// </summary>
    public class AppLogEntry
    {
        public int Id { get; set; }
        public string Level { get; set; } = "INFO";
        public string Message { get; set; } = string.Empty;
        public string? Source { get; set; }
        public string? Type { get; set; } = "System";
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
