namespace Api.Dto.Notification
{
    public class NotificationDto
    {
        public string Title { get; set; }
        public string Message { get; set; }
        public string Priority { get; set; }
        public string Category { get; set; }
        public int? UserId { get; set; }
    }
}
