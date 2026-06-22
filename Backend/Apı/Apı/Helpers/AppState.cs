using Api.Services.SystemLogging;

namespace Api.Helpers
{
    /// <summary>
    /// Uygulama genelinde erişilebilen durum tutucusu.
    /// IHubContext build sonrası geldiğinden SystemLogService burada tutulur.
    /// </summary>
    public static class AppState
    {
        public static SystemLogService? SystemLog { get; set; }
    }
}
