using System;
using Microsoft.Data.SqlClient;
using Api.Data.Sql;
using Api.Model.Device;
using Api.Services.LogServices;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/devicestatusupdate")]
    public class DeviceStatusUpdateController : ControllerBase
    {
        private readonly LogService _logService;

        public DeviceStatusUpdateController(LogService logService)
        {
            _logService = logService;
        }

        [HttpPost]
        public IActionResult UpdateDeviceStatus([FromBody] DeviceModels model)
        {
            if (model == null || string.IsNullOrEmpty(model.DeviceName))
            {
                _logService.AddLog("WARN", "Geçersiz veya eksik cihaz verisi geldi.", "DeviceStatusUpdate");
                return BadRequest(new { success = false, message = "Geçersiz veya eksik cihaz verisi." });
            }

            var connection = new Connection(
                "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False;"
            );

            string query = "UPDATE Devices SET Status = @Status WHERE Id = @Id";

            _logService.AddLog("INFO", $"Cihaz güncelleme isteği alındı. Id={model.Id}, DeviceName={model.DeviceName}", "DeviceStatusUpdate");

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
                    _logService.AddLog("INFO", $"'{model.DeviceName}' (Id={model.Id}) durumu başarıyla güncellendi. Yeni durum: {model.Device_Status}", "DeviceStatusUpdate");
                    return Ok(new { success = true, message = $"'{model.DeviceName}' durumu başarıyla güncellendi." });
                }
                else
                {
                    _logService.AddLog("WARN", $"Id={model.Id} ile eşleşen cihaz bulunamadı.", "DeviceStatusUpdate");
                    return NotFound(new { success = false, message = $"Id={model.Id} ile eşleşen cihaz bulunamadı." });
                }
            }
            catch (Exception ex)
            {
                _logService.AddLog("ERROR", $"Veritabanı hatası. Id={model.Id} | Hata: {ex.Message}", "DeviceStatusUpdate");
                return StatusCode(500, new { success = false, message = $"Veritabanı hatası: {ex.Message}" });
            }
        }
    }
}