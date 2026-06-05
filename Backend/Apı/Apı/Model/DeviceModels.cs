namespace Api.Model.Device
{
    public class DeviceModels
    {
        public int Id { get; set; }
        public string DeviceName { get; set; }
        public string DeviceVersion { get; set; }

        // 🚀 KESİN ÇÖZÜM: String yerine bool yapıyoruz. 
        // Böylece hem SQL'deki bit alanına tam oturur hem de JS'den gelen true/false değerini doğrudan kabul eder.
        public bool Device_Status { get; set; }
    }
}