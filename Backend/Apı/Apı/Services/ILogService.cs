using Api.Model.Logging;

namespace Api.Services
{
    /// <summary>
    /// Log servisi için DI interface'i.
    /// Controller katmanı bu interface üzerinden çalışır; implementasyondan bağımsızdır.
    /// </summary>
    public interface ILogService
    {
        // ── Read ───────────────────────────────────────────────────────────────
        Task<PagedResult<SystemLogEntry>> GetLogsAsync(LogQuery query);
        Task<SystemLogEntry?> GetLogByIdAsync(int id);
        Task<List<SystemLogEntry>> GetRecentLogsAsync(int count = 50);

        Task<PagedResult<AppLogEntry>> GetAppLogsAsync(LogQuery query);
        Task<AppLogEntry?> GetAppLogByIdAsync(int id);

        // ── Delete ─────────────────────────────────────────────────────────────
        Task<bool> DeleteLogAsync(int id);
        Task<bool> DeleteAppLogAsync(int id);
    }

    /// <summary>Sayfalı sorgu sonucu. Frontend ile birebir uyumlu response formatı.</summary>
    public sealed class PagedResult<T>
    {
        public int Page       { get; init; }
        public int PageSize   { get; init; }
        public int TotalRecords { get; init; }
        public int TotalPages { get; init; }
        public List<T> Items  { get; init; } = [];
    }

    /// <summary>Log filtreleme ve sayfalama parametreleri.</summary>
    public sealed class LogQuery
    {
        public int      Page            { get; set; } = 1;
        public int      PageSize        { get; set; } = 50;
        public string?  Level           { get; set; }
        public string?  Type            { get; set; }
        public string?  Search          { get; set; }   // Message / ServiceName / UserName
        public DateTime? From           { get; set; }
        public DateTime? To             { get; set; }
        public bool     IncludeArchived { get; set; }
    }
}
