using System;
using Microsoft.AspNetCore.Mvc;
using Api.Helpers;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SystemLogsController : ControllerBase
    {
        // ─────────────────────────────────────────────────────────────────────
        // LOG LİSTELEME (Filtreleme + Sayfalama)
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Logları filtreli şekilde listeler.
        /// GET /api/systemlogs?page=1&pageSize=100&logLevel=Error&eventType=Crash
        /// </summary>
        [HttpGet]
        public IActionResult GetLogs(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] string? logLevel = null,
            [FromQuery] string? eventType = null,
            [FromQuery] string? serviceName = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] bool includeArchived = false)
        {
            if (AppState.SystemLog == null)
                return StatusCode(503, new { error = "Log servisi henüz hazır değil." });

            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 500) pageSize = 100;

            var logs = AppState.SystemLog.GetLogs(page, pageSize, logLevel, eventType, serviceName, from, to, includeArchived);
            return Ok(logs);
        }

        /// <summary>
        /// Son N log — admin paneli için hızlı erişim.
        /// GET /api/systemlogs/recent?count=100
        /// </summary>
        [HttpGet("recent")]
        public IActionResult GetRecent([FromQuery] int count = 100)
        {
            if (AppState.SystemLog == null)
                return StatusCode(503, new { error = "Log servisi henüz hazır değil." });

            if (count < 1 || count > 500) count = 100;
            var logs = AppState.SystemLog.GetLogs(1, count);
            return Ok(logs);
        }

        // ─────────────────────────────────────────────────────────────────────
        // DASHBOARD
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Dashboard istatistikleri (Critical/Error sayısı, crash, watchdog vs.)
        /// GET /api/systemlogs/dashboard
        /// </summary>
        [HttpGet("dashboard")]
        public IActionResult GetDashboard()
        {
            if (AppState.SystemLog == null)
                return StatusCode(503, new { error = "Log servisi henüz hazır değil." });

            var data = AppState.SystemLog.GetDashboard();
            return Ok(data);
        }

        // ─────────────────────────────────────────────────────────────────────
        // ARŞİVLEME
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// 10.000+ log varsa eskileri arşivler.
        /// POST /api/systemlogs/archive
        /// </summary>
        [HttpPost("archive")]
        public async Task<IActionResult> Archive()
        {
            if (AppState.SystemLog == null)
                return StatusCode(503, new { error = "Log servisi henüz hazır değil." });

            await AppState.SystemLog.ArchiveOldLogsAsync();
            return Ok(new { success = true, message = "Arşivleme tamamlandı." });
        }

        // ─────────────────────────────────────────────────────────────────────
        // TEST
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Test amaçlı kritik log oluşturur.
        /// POST /api/systemlogs/test-critical
        /// </summary>
        [HttpPost("test-critical")]
        public async Task<IActionResult> TestCritical()
        {
            if (AppState.SystemLog == null)
                return StatusCode(503, new { error = "Log servisi henüz hazır değil." });

            await AppState.SystemLog.CriticalAsync(
                "[TEST] Admin tarafından kritik log testi yapıldı.",
                "SystemLogsController",
                stackTrace: null,
                eventType: "System"
            );
            return Ok(new { success = true, message = "Kritik log oluşturuldu." });
        }
    }
}
