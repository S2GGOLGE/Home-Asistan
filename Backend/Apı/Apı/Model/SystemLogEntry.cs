using System;

namespace Api.Model.Logging
{
    /// <summary>
    /// Sistemde gerçekleşen tüm kritik olayları temsil eder.
    /// </summary>
    public class SystemLogEntry
    {
        public int Id { get; set; }

        /// <summary>Uygulama genelinde benzersiz olay kimliği (GUID)</summary>
        public string EventId { get; set; } = Guid.NewGuid().ToString();

        /// <summary>Olayı üreten servis / modül adı (ör: LoginController, Watchdog)</summary>
        public string ServiceName { get; set; } = string.Empty;

        /// <summary>Olay türü (Startup, Crash, Security, Device, Automation vs.)</summary>
        public string EventType { get; set; } = "System";

        /// <summary>Log seviyesi (Information, Warning, Error, Critical)</summary>
        public string LogLevel { get; set; } = "Information";

        /// <summary>İnsan okunabilir açıklama mesajı</summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>Hata stack trace bilgisi (sadece hatalarda doldurulur)</summary>
        public string? StackTrace { get; set; }

        /// <summary>Kaynağı belirten ek bilgi (sınıf adı, metot adı vs.)</summary>
        public string? Source { get; set; }

        /// <summary>Olayı tetikleyen kullanıcı ID (opsiyonel)</summary>
        public int? UserId { get; set; }

        /// <summary>Olayı tetikleyen kullanıcı adı (opsiyonel)</summary>
        public string? UserName { get; set; }

        /// <summary>İstek kaynağı IP adresi</summary>
        public string? IpAddress { get; set; }

        /// <summary>Sunucu adı (çoklu makine ortamları için)</summary>
        public string MachineName { get; set; } = Environment.MachineName;

        /// <summary>Log kaydı oluşturulma zamanı</summary>
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        /// <summary>Arşivlenip arşivlenmediği</summary>
        public bool IsArchived { get; set; } = false;
    }
}
