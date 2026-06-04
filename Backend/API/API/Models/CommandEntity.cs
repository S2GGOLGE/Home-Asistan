namespace API.Models
{
    public class CommandEntity
    {
        public int Id { get; set; }
        public string Command { get; set; }
        public string Device { get; set; }
        public bool IsProcessed { get; set; }
    }
}