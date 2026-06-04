namespace API.Models.AIModels
{
    public class AIModel
    {
        public int Id { get; set; }

        public string IncomingMessage { get; set; }

        // API tarafından doldurulur (client'tan gelmez)
        public string OutgoingMessage { get; set; }
    }
}