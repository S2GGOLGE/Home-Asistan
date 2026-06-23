using Api.Helpers;
using Api.Services.LogServices;
using Apı.Helpers.Empty_Space_Control;
using Apı.Model.Singup;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using SeneOdev;

namespace Apı.Controllers.Authentication
{
    [ApiController]
    [Route("api/signup")]
    public class SingupControllers : ControllerBase
    {
        private readonly string _connectionString;
        private readonly LogService _logService;

        public SingupControllers(string connectionString, LogService logService)
        {
            _connectionString = connectionString;
            _logService = logService;
        }

        [HttpPost]
        public IActionResult Register([FromBody] SingupModels model)
        {
            if (model == null)
            {
                return BadRequest(ApiResponse.Fail("Model boş."));
            }

            var validationError = Empty_Space_Control.BoşKontrol(model);
            if (validationError != null)
            {
                return BadRequest(ApiResponse.Fail(validationError));
            }

            if (model.Password != model.PasswordRepeat)
            {
                return BadRequest(ApiResponse.Fail("Şifreler eşleşmiyor."));
            }

            try
            {
                bool userExists;
                using (var connection = new SqlConnection(_connectionString))
                {
                    const string checkQuery = "SELECT COUNT(1) FROM dbo.Users WHERE Username = @Username OR Email = @Email";
                    using var command = new SqlCommand(checkQuery, connection);
                    command.Parameters.AddWithValue("@Username", model.Username);
                    command.Parameters.AddWithValue("@Email", model.Email);
                    connection.Open();
                    userExists = (int)command.ExecuteScalar() > 0;
                }

                if (userExists)
                {
                    _logService.AddLog("Warning", $"Kayıt başarısız: {model.Username} veya {model.Email} zaten alınmış.", "SignupController");
                    return BadRequest(ApiResponse.Fail("Bu kullanıcı adı veya e-posta zaten kullanılmaktadır."));
                }

                var newSalt = HashServices.GenereateSalt();
                var newHash = HashServices.Hash(model.Password, newSalt);

                using (var connection = new SqlConnection(_connectionString))
                {
                    const string insertQuery = @"
                        INSERT INTO dbo.Users (Username, Email, PasswordHash, Salt, RoleId)
                        VALUES (@Username, @Email, @PasswordHash, @Salt, (SELECT TOP 1 Id FROM dbo.Roles WHERE Name = 'Uye'))";

                    using var command = new SqlCommand(insertQuery, connection);
                    command.Parameters.AddWithValue("@Username", model.Username);
                    command.Parameters.AddWithValue("@Email", model.Email);
                    command.Parameters.AddWithValue("@PasswordHash", newHash);
                    command.Parameters.AddWithValue("@Salt", newSalt);

                    connection.Open();
                    command.ExecuteNonQuery();
                }

                _logService.AddLog("Info", $"Yeni kayıt: {model.Username} başarıyla üye oldu.", "SignupController");
                _ = AppState.SystemLog?.InfoAsync($"Yeni kullanıcı kaydı: {model.Username}", "SignupController", "Authentication");
                return Ok(ApiResponse.Ok(new { message = "Kayıt işlemi başarıyla tamamlandı." }));
            }
            catch (Exception ex)
            {
                _logService.AddLog("Error", $"Kayıt sistem hatası: {ex.Message}", "SignupController");
                _ = AppState.SystemLog?.LogExceptionAsync("SignupController", ex);
                return StatusCode(500, ApiResponse.Fail("Sunucu hatası oluştu."));
            }
        }
    }
}
