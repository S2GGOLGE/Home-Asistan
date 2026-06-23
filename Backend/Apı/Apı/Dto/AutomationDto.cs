namespace Api.Dto.Automation
{
    public class AutomationDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? TriggerCondition { get; set; }
        public string? ActionDescription { get; set; }
        public bool IsActive { get; set; } = true;
    }
}