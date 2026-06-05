using Microsoft.AspNetCore.Mvc;
using Api.Data.Sql;
using Apı.Helpers.Empty_Space_Control;
using Api.Model.Device;
using Microsoft.Data.SqlClient;

namespace Api.Controllers.DeviceRegistration
{
    [ApiController]
    [Route("api/[controller]")]
    public class DeviceRegistrationControllers : ControllerBase
    {
        [HttpPost]
        public IActionResult AddDevice(DeviceModels model)
        {
            var hata = Empty_Space_Control.BoşKontrol(model);

            if (hata != null)
            {
                return BadRequest(hata);
            }

            var defultconnection = new Connection(
                "Server=localhost;Database=HomeAsistanDB;" +
                "Trusted_Connection=True;TrustServerCertificate=True;");

            using var baglanti = new SqlConnection(defultconnection.Connect);
            baglanti.Open();

            string kontrol = "SELECT COUNT(*) FROM Devices WHERE Name=@N";

            using var cmdkontrol = new SqlCommand(kontrol, baglanti);
            cmdkontrol.Parameters.AddWithValue("@N", model.DeviceName);

            int varMi = (int)cmdkontrol.ExecuteScalar();

            if (varMi > 0)
            {
                return BadRequest("Bu cihaz zaten kayıtlı");
            }
            string query = "@ INSERT INTO Devices (Name,Type,Status)VALUES (@Name,@Type,@Status)";
            using var cmdEkle = new SqlCommand(query, baglanti);
            cmdEkle.Parameters.AddWithValue("@Name", model.DeviceName);
            cmdEkle.Parameters.AddWithValue("@Type", (object?)model.DeviceVersion ?? DBNull.Value);
            cmdEkle.Parameters.AddWithValue("@Status", model.Device_Status);
            cmdEkle.ExecuteNonQuery();

            return Ok("Cihaz başarıyla eklendi");
        }
    }
}