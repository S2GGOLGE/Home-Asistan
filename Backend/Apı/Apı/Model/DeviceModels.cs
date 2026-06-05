namespace Api.Model.Device
{
    public class DeviceModels
    {
        public int ıd { get; set; }
        public string DeviceName { get; set; }
        public string DeviceVersion { get; set; }
        public string Device_Status { get; set; }
        public DeviceModels (int ıd, string deviceName, string deviceVersion, string device_Status)
        {
            this.ıd = ıd;
            DeviceName = deviceName;
            DeviceVersion = deviceVersion;
            Device_Status = device_Status;
        }
    }
}
