namespace Api.Model.Logging
{
    /// <summary>
    /// Olay türleri için sabitler — type-safe kullanım sağlar.
    /// </summary>
    public static class EventTypes
    {
        public const string Startup        = "Startup";
        public const string Shutdown       = "Shutdown";
        public const string Restart        = "Restart";
        public const string Crash          = "Crash";
        public const string Exception      = "Exception";
        public const string Security       = "Security";
        public const string Authentication = "Authentication";
        public const string Authorization  = "Authorization";
        public const string Device         = "Device";
        public const string Automation     = "Automation";
        public const string Watchdog       = "Watchdog";
        public const string System         = "System";
        public const string API            = "API";    // API hataları
        public const string AI             = "AI";     // Gelecekte AI olayları
    }

    /// <summary>
    /// Log seviyeleri için sabitler.
    /// </summary>
    public static class LogLevels
    {
        public const string Information = "Information";
        public const string Warning     = "Warning";
        public const string Error       = "Error";
        public const string Critical    = "Critical";
        public const string Security    = "Security";   // Güvenlik olayları (yetkisiz erişim vb.)
    }

    /// <summary>
    /// Frontend filtresiyle birebir eşleşen log tipleri.
    /// </summary>
    public static class LogTypes
    {
        public const string System     = "System";
        public const string Auth       = "Auth";
        public const string Device     = "Device";
        public const string Automation = "Automation";
        public const string AI         = "AI";
        public const string API        = "API";
    }
}
