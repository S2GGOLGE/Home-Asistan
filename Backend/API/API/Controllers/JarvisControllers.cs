using API.DTOs;
using API.Services;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class JarvisController : ControllerBase
    {
        private readonly IJarvisClient _jarvisClient;
        private readonly ILogger<JarvisController> _logger;

        public JarvisController(IJarvisClient jarvisClient, ILogger<JarvisController> logger)
        {
            _jarvisClient = jarvisClient;
            _logger = logger;
        }

        [HttpPost("command")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(JarvisResponseDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status504GatewayTimeout)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ProcessCommand([FromBody] JarvisRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(new { error = "Mesaj alanı boş bırakılamaz." });
            }

            try
            {
                var result = await _jarvisClient.SendCommandAsync(request);
                return Ok(result);
            }
            catch (TimeoutException ex)
            {
                _logger.LogWarning(ex, "İşlem zaman aşımı nedeniyle tamamlanamadı.");
                return StatusCode(StatusCodes.Status504GatewayTimeout, new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Controller seviyesinde hata yakalandı.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
            }
        }
    }
}