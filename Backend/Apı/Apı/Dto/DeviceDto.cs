namespace Api.Dto.Device
{
    public class DeviceDto
    {
        public record DeviceRequest(
            string Name,
            string Type,
            bool Status,
            int UserId,
            string Feature
        );
    }
}