namespace Apı.Helpers.Empty_Space_Control
{
    using Api.Model.Device;

    public class Empty_Space_Control
    {
        // Metodu static yapıyoruz ki başka yerde "new" demeden direkt çağırabilelim.
        // Parametre olarak senin DeviceModel sınıfını alıyor.
        public static string BoşKontrol(DeviceModels model)
        {
            // Modelin kendisi boş (null) gönderildiyse
            if (model == null)
            {
                return "Gönderilen veriler boş";
            }

            // Modelin içindeki DeviceName alanı boş mu kontrolü
            if (string.IsNullOrWhiteSpace(model.DeviceName))
            {
                return "Lütfen cihaz adını girin.";
            }
            if (string.IsNullOrWhiteSpace(model.DeviceVersion))
            {
                return "Lütfen Cihaz Versiyon Giriniz";
            }
            if(string.IsNullOrWhiteSpace(model.Device_Status))
            {
                return "Lutfen Cihaz Durumunu girin";
            }
            return null; // Hiçbir alan boş değilse (hata yoksa) null döner.
        }
    }
}