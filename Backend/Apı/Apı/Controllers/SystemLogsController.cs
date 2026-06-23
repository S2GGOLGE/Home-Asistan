using Api.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SystemLogsController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] int? limit = null,
            [FromQuery] string? logLevel = null,
            [FromQuery] string? eventType = null,
            [FromQuery] string? serviceName = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] bool includeArchived = false)
        {
            if (AppState.SystemLog == null)
            {
                return StatusCode(503, ApiResponse.Fail("Log servisi henüz hazır değil."));
            }

            page = Math.Max(1, page);
            pageSize = limit.HasValue ? limit.Value : pageSize;
            pageSize = pageSize < 1 || pageSize > 500 ? 100 : pageSize;

            var data = AppState.SystemLog.GetLogsWithTotal(page, pageSize, logLevel, eventType, serviceName, from, to, includeArchived);
            return Ok(ApiResponse.Ok(data));
        }

        [HttpGet("recent")]
        public IActionResult GetRecent([FromQuery] int count = 100)
        {
            if (AppState.SystemLog == null)
            {
                return StatusCode(503, ApiResponse.Fail("Log servisi henüz hazır değil."));
            }

            count = count < 1 || count > 500 ? 100 : count;
            var logs = AppState.SystemLog.GetLogs(1, count);
            return Ok(ApiResponse.Ok(logs));
        }

        [HttpGet("dashboard")]
        public IActionResult GetDashboard()
        {
            if (AppState.SystemLog == null)
            {
                return StatusCode(503, ApiResponse.Fail("Log servisi henüz hazır değil."));
            }

            return Ok(ApiResponse.Ok(AppState.SystemLog.GetDashboard()));
        }

        [HttpPost("archive")]
        public async Task<IActionResult> Archive()
        {
            if (AppState.SystemLog == null)
            {
                return StatusCode(503, ApiResponse.Fail("Log servisi henüz hazır değil."));
            }

            await AppState.SystemLog.ArchiveOldLogsAsync();
            return Ok(ApiResponse.Ok(new { message = "Arşivleme tamamlandı." }));
        }

        [HttpPost("test-critical")]
        public async Task<IActionResult> TestCritical()
        {
            if (AppState.SystemLog == null)
            {
                return StatusCode(503, ApiResponse.Fail("Log servisi henüz hazır değil."));
            }

            await AppState.SystemLog.CriticalAsync(
                "[TEST] Admin tarafından kritik log testi yapıldı.",
                "SystemLogsController",
                stackTrace: null,
                eventType: "System");

            return Ok(ApiResponse.Ok(new { message = "Kritik log oluşturuldu." }));
        }
    }
}
