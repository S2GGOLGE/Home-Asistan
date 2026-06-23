using Api.Helpers;
using Api.Services.LogServices;
using Apı.Helpers.Empty_Space_Control;
using Apı.Model.Login;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using SeneOdev;

namespace Apı.Controllers.Authentication
{
    [ApiController]
    [Route("api/auth")]
    public class LoginControllers : ControllerBase
    {
        private readonly string _connectionString;
        private readonly LogService _logService;

        public LoginControllers(string connectionString, LogService logService)
        {
            _connectionString = connectionString;
            _logService = logService;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginModels model)
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

            try
            {
                int userId = 0;
                string? storedHash = null;
                string? storedSalt = null;
                string storedRole = "Uye";

                using (var connection = new SqlConnection(_connectionString))
                {
                    const string query = @"
                        SELECT TOP 1 u.Id, u.PasswordHash, u.Salt, COALESCE(r.Name, u.Role, 'Uye') AS Role
                        FROM dbo.Users u
                        LEFT JOIN dbo.Roles r ON u.RoleId = r.Id
                        WHERE u.Username = @Username";

                    using var command = new SqlCommand(query, connection);
                    command.Parameters.AddWithValue("@Username", model.Username);
                    connection.Open();

                    using var reader = command.ExecuteReader();
                    if (reader.Read())
                    {
                        userId = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0;
                        storedHash = reader["PasswordHash"]?.ToString();
                        storedSalt = reader["Salt"]?.ToString();
                        storedRole = reader["Role"]?.ToString() ?? "Uye";
                    }
                }

                if (storedHash == null || storedSalt == null)
                {
                    _logService.AddLog("Warning", $"Hatalı giriş: {model.Username} kullanıcısı bulunamadı.", "LoginController");
                    _ = AppState.SystemLog?.LogUnauthorizedAccessAsync("api/auth/login", HttpContext.Connection.RemoteIpAddress?.ToString());
                    return Unauthorized(ApiResponse.Fail("Kullanıcı adı veya şifre hatalı."));
                }

                var computedHash = HashServices.Hash(model.PasswordHash, storedSalt);
                if (computedHash != storedHash)
                {
                    _logService.AddLog("Warning", $"Hatalı şifre: {model.Username}.", "LoginController");
                    _ = AppState.SystemLog?.LogUnauthorizedAccessAsync("api/auth/login", HttpContext.Connection.RemoteIpAddress?.ToString(), userId);
                    return Unauthorized(ApiResponse.Fail("Kullanıcı adı veya şifre hatalı."));
                }

                _logService.AddLog("Info", $"Başarılı giriş: {model.Username}.", "LoginController");
                _ = AppState.SystemLog?.LogLoginAsync(model.Username, HttpContext.Connection.RemoteIpAddress?.ToString(), userId);

                return Ok(ApiResponse.Ok(new
                {
                    message = "Giriş başarılı",
                    user = model.Username,
                    role = storedRole
                }));
            }
            catch (Exception ex)
            {
                _logService.AddLog("Error", $"Login sistem hatası: {ex.Message}", "LoginController");
                _ = AppState.SystemLog?.LogExceptionAsync("LoginController", ex);
                return StatusCode(500, ApiResponse.Fail("Sunucu hatası oluştu."));
            }
        }
    }
}
