namespace API.DTOs
{
    public class JarvisResponseDto
    {
        public bool Success { get; set; }
        public string Intent { get; set; } = string.Empty;
        public string Response { get; set; } = string.Empty;
    }
}