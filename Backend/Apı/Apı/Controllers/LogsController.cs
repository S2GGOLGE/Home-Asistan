using Api.Helpers;
using Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    /// <summary>
    /// Production-ready log yönetim endpoint'leri.
    /// Tüm işlemler ILogService üzerinden yürür — controller'da SQL yok.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class LogsController : ControllerBase
    {
        private readonly ILogService _logService;

        public LogsController(ILogService logService)
        {
            _logService = logService;
        }

        /// <summary>
        /// GET /api/logs?page=1&amp;pageSize=50&amp;level=Error&amp;type=Auth&amp;search=admin&amp;dateRange=24h
        /// Pagination + filtreleme + arama destekli ana endpoint.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] int      page      = 1,
            [FromQuery] int      pageSize  = 50,
            [FromQuery] string?  level     = null,
            [FromQuery] string?  type      = null,
            [FromQuery] string?  search    = null,
            [FromQuery] DateTime? from     = null,
            [FromQuery] DateTime? to       = null,
            [FromQuery] string?  dateRange = null)   // "24h" | "7d" | "30d"
        {
            // dateRange shortcut — from parametresi yoksa uygula
            if (!string.IsNullOrWhiteSpace(dateRange) && from == null)
            {
                from = dateRange switch
                {
                    "24h" => DateTime.Now.AddHours(-24),
                    "7d"  => DateTime.Now.AddDays(-7),
                    "30d" => DateTime.Now.AddDays(-30),
                    _     => null
                };
            }

            page     = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);   // Max 100, bellek koruması

            var query = new LogQuery
            {
                Page   = page,
                PageSize = pageSize,
                Level  = string.IsNullOrWhiteSpace(level)  ? null : level,
                Type   = string.IsNullOrWhiteSpace(type)   ? null : type,
                Search = string.IsNullOrWhiteSpace(search) ? null : search,
                From   = from,
                To     = to
            };

            try
            {
                var result = await _logService.GetAppLogsAsync(query);
                return Ok(ApiResponse.Ok(result));
            }
            catch (Exception ex)
            {
                _ = AppState.SystemLog?.LogExceptionAsync("LogsController", ex);
                return StatusCode(500, ApiResponse.Fail("Loglar yüklenemedi."));
            }
        }

        /// <summary>GET /api/logs/{id} — Tek log kaydı</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var log = await _logService.GetAppLogByIdAsync(id);
                if (log == null)
                    return NotFound(ApiResponse.Fail("Log bulunamadı."));

                return Ok(ApiResponse.Ok(log));
            }
            catch (Exception ex)
            {
                _ = AppState.SystemLog?.LogExceptionAsync("LogsController", ex);
                return StatusCode(500, ApiResponse.Fail("Log getirilemedi."));
            }
        }

        /// <summary>GET /api/logs/recent?count=50 — En son N log</summary>
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent([FromQuery] int count = 50)
        {
            count = Math.Clamp(count, 1, 100);
            try
            {
                var result = await _logService.GetAppLogsAsync(new LogQuery { Page = 1, PageSize = count });
                return Ok(ApiResponse.Ok(result.Items));
            }
            catch (Exception ex)
            {
                _ = AppState.SystemLog?.LogExceptionAsync("LogsController", ex);
                return StatusCode(500, ApiResponse.Fail("Son loglar yüklenemedi."));
            }
        }

        /// <summary>GET /api/logs/type/{type}?page=1&amp;pageSize=50 — Tipe göre filtrelenmiş</summary>
        [HttpGet("type/{type}")]
        public async Task<IActionResult> GetByType(
            string type,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            page     = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            try
            {
                var result = await _logService.GetAppLogsAsync(
                    new LogQuery { Page = page, PageSize = pageSize, Type = type });
                return Ok(ApiResponse.Ok(result));
            }
            catch (Exception ex)
            {
                _ = AppState.SystemLog?.LogExceptionAsync("LogsController", ex);
                return StatusCode(500, ApiResponse.Fail("Loglar yüklenemedi."));
            }
        }

        /// <summary>GET /api/logs/level/{level}?page=1&amp;pageSize=50 — Seviyeye göre filtrelenmiş</summary>
        [HttpGet("level/{level}")]
        public async Task<IActionResult> GetByLevel(
            string level,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            page     = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            try
            {
                var result = await _logService.GetAppLogsAsync(
                    new LogQuery { Page = page, PageSize = pageSize, Level = level });
                return Ok(ApiResponse.Ok(result));
            }
            catch (Exception ex)
            {
                _ = AppState.SystemLog?.LogExceptionAsync("LogsController", ex);
                return StatusCode(500, ApiResponse.Fail("Loglar yüklenemedi."));
            }
        }

        /// <summary>DELETE /api/logs/{id} — Tek log sil</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _logService.DeleteAppLogAsync(id);
                if (!deleted)
                    return NotFound(ApiResponse.Fail("Log bulunamadı."));

                _ = AppState.SystemLog?.WarningAsync(
                    $"[LOG SİLİNDİ] Log #{id} silindi.", "LogsController");

                return Ok(ApiResponse.Ok(new { message = $"Log #{id} silindi." }));
            }
            catch (Exception ex)
            {
                _ = AppState.SystemLog?.LogExceptionAsync("LogsController", ex);
                return StatusCode(500, ApiResponse.Fail("Log silinemedi."));
            }
        }
    }
}
