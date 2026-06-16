using Microsoft.AspNetCore.Mvc;
using Api.Data.Sql;
using Apı.Helpers.Empty_Space_Control;
using Api.Model.Device;
using Microsoft.Data.SqlClient;
using Api.Services.LogServices;

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

            var validationError = Empty_Space_Control.BoşKontrol(model);
            if (validationError != null)
                return BadRequest(validationError);

            var connectionString =
                "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False;";

            var logService = new LogService(connectionString);

            try
            {
                using var conn = new SqlConnection(connectionString);
                conn.Open();

                // 1. Duplicate kontrol
                const string checkQuery = "SELECT COUNT(*) FROM Devices WHERE Name = @Name";

                using (var checkCmd = new SqlCommand(checkQuery, conn))
                {
                    checkCmd.Parameters.AddWithValue("@Name", model.DeviceName);

                    int exists = (int)checkCmd.ExecuteScalar();

                    if (exists > 0)
                    {
                        logService.AddLog(
                            "WARNING",
                            $"{model.DeviceName} zaten kayıtlı cihaz eklenmeye çalışıldı.",
                            "DeviceRegistration"
                        );

                        return Conflict("Bu cihaz zaten kayıtlı");
                    }
                }

                // 2. Insert
                const string insertQuery = @"
                    INSERT INTO Devices (Name, Type, Status)
                    VALUES (@Name, @Type, @Status)";

                using (var insertCmd = new SqlCommand(insertQuery, conn))
                {
                    insertCmd.Parameters.AddWithValue("@Name", model.DeviceName);
                    insertCmd.Parameters.AddWithValue("@Type",
                        (object?)model.DeviceVersion ?? DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@Status", model.Device_Status);

                    insertCmd.ExecuteNonQuery();
                }

                // 3. Success log
                logService.AddLog(
                    "INFO",
                    $"{model.DeviceName} başarıyla eklendi.",
                    "DeviceRegistration"
                );

                return Ok(new
                {
                    success = true,
                    message = "Cihaz başarıyla eklendi"
                });
            }
            catch (SqlException ex)
            {
                logService.AddLog(
                    "ERROR",
                    ex.Message,
                    "DeviceRegistration"
                );

                return StatusCode(500, new
                {
                    success = false,
                    message = "Veritabanı hatası"
                });
            }
            catch (Exception ex)
            {
                logService.AddLog(
                    "ERROR",
                    ex.Message,
                    "DeviceRegistration"
                );

                return StatusCode(500, new
                {
                    success = false,
                    message = "Sunucu hatası"
                });
            }
        }
    }
}