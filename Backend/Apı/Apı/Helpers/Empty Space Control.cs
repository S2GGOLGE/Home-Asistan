namespace Apı.Helpers.Empty_Space_Control
{
    using Api.Model.Device;

    public class Empty_Space_Control
    {
        public static string BoşKontrol(DeviceModels model)
        {
            // 1. Modelin kendisinin null olup olmadığının kontrolü
            if (model == null)
            {
                return "Gönderilen veriler boş";
            }

            // 2. Cihaz Adı kontrolü
            if (string.IsNullOrWhiteSpace(model.DeviceName))
            {
                return "Lütfen cihaz adını girin.";
            }

            // 3. Cihaz Versiyon kontrolü
            if (string.IsNullOrWhiteSpace(model.DeviceVersion))
            {
                return "Lütfen Cihaz Versiyon Giriniz";
            }

            // 4. Durum Kontrolü (Sistem için Önemli Kısım)
            // bool tipi null olamaz ama sistem kuralı olarak yeni eklenen cihazların 
            // başlangıçta zorunlu olarak 'false' (offline) gelmesini isteyebilirsin.
            // Eğer kazara 'true' gelirse sisteme alınmasın diyorsan bu kontrolü aktif edebilirsin:
            if (model.Device_Status == true)
            {
                return "Yeni eklenen cihazların başlangıç durumu 'true' (Online) olamaz!";
            }

            return null; // Her şey nizami ise hata yok demektir.
        }
    }
}