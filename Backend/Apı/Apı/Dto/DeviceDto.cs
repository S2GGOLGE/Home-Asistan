namespace Api.Dto.Device
{
    public class DeviceDto
    {
        public record DeviceRequest
         (
            int id,
            string DeviceName,
            string DeviceVersion,
            string Device_Status
         );
    }
}
