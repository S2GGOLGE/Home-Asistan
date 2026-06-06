using System;
using Microsoft.Data.SqlClient;
using Api.Data.Sql;
using Api.Model.Device;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/devicestatusupdate")]
    public class DeviceStatusUpdateController : ControllerBase
    {
        [HttpPost]
        public IActionResult UpdateDeviceStatus([FromBody] DeviceModels model)
        {
            if (model == null || string.IsNullOrEmpty(model.DeviceName))
            {
                return BadRequest(new { success = false, message = "Geçersiz veya eksik cihaz verisi." });
            }

            var connection = new Connection(
                "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False;"
            );

            // FIX: Tablo kolonu "Name" — "DeviceName" değil
            // FIX: Id ile güncelleme yapıyoruz — Name çakışma riski taşır
            string query = "UPDATE Devices SET Status = @Status WHERE Id = @Id";

            try
            {
                using var baglanti = new SqlConnection(connection.Connect);
                baglanti.Open();

                using var command = new SqlCommand(query, baglanti);

                command.Parameters.AddWithValue("@Status", model.Device_Status);
                command.Parameters.AddWithValue("@Id", model.Id);

                int affectedRows = command.ExecuteNonQuery();

                if (affectedRows > 0)
                {
                    return Ok(new { success = true, message = $"'{model.DeviceName}' durumu başarıyla güncellendi." });
                }
                else
                {
                    return NotFound(new { success = false, message = $"Id={model.Id} ile eşleşen cihaz bulunamadı." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Veritabanı hatası: {ex.Message}" });
            }
        }
    }
}