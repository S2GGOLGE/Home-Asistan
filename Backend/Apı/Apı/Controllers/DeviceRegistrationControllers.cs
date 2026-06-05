using Microsoft.AspNetCore.Mvc;
using Api.Data.Sql;
using Apı.Helpers.Empty_Space_Control;
using Api.Model.Device;
using Microsoft.Data.SqlClient;

namespace Api.Controllers.DeviceRegistration
{
    [ApiController]
    [Route("api/DeviceRegistration")]
    public class DeviceRegistrationController : ControllerBase
    {
        [HttpPost]
        public IActionResult AddDevice([FromBody] DeviceModels model)
        {
            if (model == null)
                return BadRequest("Model boş");

            var hata = Empty_Space_Control.BoşKontrol(model);

            if (hata != null)
                return BadRequest(hata);

            var connection = new Connection(
                "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False\r\n;"
            );

            using var baglanti = new SqlConnection(connection.Connect);
            baglanti.Open();

            // kontrol
            string kontrol = "SELECT COUNT(*) FROM Devices WHERE Name=@Name";

            using var cmdKontrol = new SqlCommand(kontrol, baglanti);
            cmdKontrol.Parameters.AddWithValue("@Name", model.DeviceName);

            int varMi = (int)cmdKontrol.ExecuteScalar();

            if (varMi > 0)
                return Conflict("Bu cihaz zaten kayıtlı");

            // insert
            string query = @"
                INSERT INTO Devices (Name, Type, Status)
                VALUES (@Name, @Type, @Status)";

            using var cmd = new SqlCommand(query, baglanti);
            cmd.Parameters.AddWithValue("@Name", model.DeviceName);
            cmd.Parameters.AddWithValue("@Type", (object?)model.DeviceVersion ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Status", model.Device_Status);

            cmd.ExecuteNonQuery();

            return Ok(new { message = "Cihaz başarıyla eklendi" });
        }
    }
}