using Microsoft.AspNetCore.Mvc;
using API.Models.AIModels;

namespace API.Controllers.AIControllers
{
    [ApiController]
    [Route("api/ai")]
    public class AIController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { message = "AI Controller aktif" });
        }

        [HttpPost]
        public IActionResult Post([FromBody] AIModel model)
        {
            if (model == null)
                return BadRequest("Model boş");

            return Ok(new
            {
                received = model.IncomingMessage,
                outgoing = "AI response burada üretilecek"
            });
        }
    }
}