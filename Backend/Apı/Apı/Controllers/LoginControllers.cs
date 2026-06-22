using Apı.Helpers.Empty_Space_Control;
using Microsoft.AspNetCore.Mvc;
using Apı.Model.Login;
using Api.Services.LogServices;
using Microsoft.Data.SqlClient;
using SeneOdev;

namespace Apı.Controllers.Login
{
    [ApiController]
    [Route("api/login")]
    public class LoginControllers : ControllerBase
    {
        [HttpPost]
        public IActionResult Login([FromBody] LoginModels model)
        {
            if (model == null)
                return BadRequest("Model Boş");

            var validationError = Empty_Space_Control.BoşKontrol(model);
            if (validationError != null)
                return BadRequest(validationError);

            var connectionString = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False;";

            // Senin LogService sınıfın
            var logservices = new LogService(connectionString);
            string controllerName = "LoginController"; // Log kaynağı olarak göndereceğiz

            try
            {
                string storedHash = null;
                string storedSalt = null;

                // 1. Veri tabanından Hash ve Salt değerlerini çekiyoruz
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    string query = "SELECT PasswordHash, Salt FROM Users WHERE Username = @Username";
                    using (SqlCommand command = new SqlCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("@Username", model.Username);
                        connection.Open();

                        using (SqlDataReader reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                storedHash = reader["PasswordHash"]?.ToString();
                                storedSalt = reader["Salt"]?.ToString();
                            }
                        }
                    }
                }

                // 2. Kullanıcı yoksa logla ve hata dön
                if (storedHash == null || storedSalt == null)
                {
                    logservices.AddLog("Warning", $"Hatalı Giriş: {model.Username} adında bir kullanıcı bulunamadı.", controllerName);
                    return Unauthorized("Kullanıcı adı veya şifre hatalı.");
                }

                // 3. Kendi yazdığın HashServices sınıfınla şifreyi kontrol et
                string computedHash = HashServices.Hash(model.PasswordHash, storedSalt);

                if (computedHash != storedHash)
                {
                    logservices.AddLog("Warning", $"Hatalı Şifre: {model.Username} kullanıcısı için yanlış şifre girildi.", controllerName);
                    return Unauthorized("Kullanıcı adı veya şifre hatalı.");
                }

                // 4. Giriş Başarılı
                logservices.AddLog("Info", $"Başarılı Giriş: {model.Username} sisteme giriş yaptı.", controllerName);
                return Ok(new { Message = "Giriş başarılı", User = model.Username });
            }
            catch (Exception ex)
            {
                // Sistem çökmesi veya SQL hatası durumunda Error seviyesinde logluyoruz
                logservices.AddLog("Error", $"Sistem Hatası: {ex.Message}", controllerName);
                return StatusCode(500, "Sunucu hatası oluştu.");
            }
        }
    }
}
