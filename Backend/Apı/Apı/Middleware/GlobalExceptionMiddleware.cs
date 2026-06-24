using Api.Helpers;

namespace Api.Middleware
{
    /// <summary>
    /// Global exception yakalayıcı middleware.
    /// - Tüm unhandled exception'ları yakalar
    /// - SystemLog'a yazar (fire-and-forget, response'u bloklamaz)
    /// - Stack trace client'a GÖNDERİLMEZ (güvenlik)
    /// - Standart ApiResponse.Fail formatında hata döner
    /// </summary>
    public sealed class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate              _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(
            RequestDelegate next,
            ILogger<GlobalExceptionMiddleware> logger)
        {
            _next   = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[GlobalExceptionMiddleware] {Path} → {Message}",
                    context.Request.Path, ex.Message);

                // Fire-and-forget: log yazımı response'u geciktirmesin
                if (AppState.SystemLog is not null)
                {
                    _ = Task.Run(() => AppState.SystemLog.LogApiErrorAsync(
                        context.Request.Path,
                        StatusCodes.Status500InternalServerError,
                        ex.Message));
                }

                // Response başlamışsa body yazamayız
                if (context.Response.HasStarted)
                    return;

                context.Response.StatusCode  = StatusCodes.Status500InternalServerError;
                context.Response.ContentType = "application/json";

                // Stack trace client'a GİTMEZ — sadece loglanır
                await context.Response.WriteAsJsonAsync(
                    ApiResponse.Fail("Sunucu hatası oluştu. Lütfen yönetici ile iletişime geçin."));
            }
        }
    }
}
