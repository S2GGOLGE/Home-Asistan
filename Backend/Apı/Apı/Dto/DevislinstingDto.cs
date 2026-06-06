namespace Apı.Dto.DevisLinsting
{
    public class DevislinstingDTO
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
