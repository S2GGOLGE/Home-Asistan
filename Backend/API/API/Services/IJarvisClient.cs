using System.Text;
using System.Text.Json;
using API.DTOs;
namespace API.Services
{
    public interface IJarvisClient
    {
        Task<JarvisResponseDto?> SendCommandAsync(JarvisRequestDto request);
    }
    public class JarvisClient : IJarvisClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<JarvisClient> _logger;
        private readonly JsonSerializerOptions _jsonOptions;

        public JarvisClient(HttpClient httpClient, ILogger<JarvisClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        public async Task<JarvisResponseDto?> SendCommandAsync(JarvisRequestDto request)
        {
            _logger.LogInformation("Jarvis servisine komut gönderiliyor: {Message}", request.Message);

            try
            {
                var jsonContent = JsonSerializer.Serialize(request, _jsonOptions);
                using var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                using var response = await _httpClient.PostAsync("/api/jarvis/process", content);

                // HTTP 4xx veya 5xx hata kodlarında exception fırlatır
                response.EnsureSuccessStatusCode();

                var responseStream = await response.Content.ReadAsStreamAsync();
                var result = await JsonSerializer.DeserializeAsync<JarvisResponseDto>(responseStream, _jsonOptions);

                _logger.LogInformation("Jarvis servisinden başarılı yanıt alındı. Intent: {Intent}", result?.Intent);
                return result;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Jarvis servisi ile iletişim kurulurken HTTP hatası oluştu. Durum Kodu: {StatusCode}", ex.StatusCode);
                throw new Exception("Yapay zeka servisine ulaşılamıyor, lütfen daha sonra tekrar deneyin.", ex);
            }
            catch (TaskCanceledException ex) when (!ex.CancellationToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Jarvis servisi yanıt vermedi. Timeout süresi doldu.");
                throw new TimeoutException("Jarvis servisi zaman aşımına uğradı.", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "JarvisClient içinde beklenmeyen bir hata oluştu.");
                throw;
            }
        }
    }
}