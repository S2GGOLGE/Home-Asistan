using Apı.Helpers.Empty_Space_Control;
using Microsoft.AspNetCore.Mvc;
using Apı.Model.Singup;
using Api.Services.LogServices;
using Microsoft.Data.SqlClient;
using SeneOdev;

namespace Apı.Controllers.Singup
{
    [ApiController]
    [Route("api/signup")]
    public class SingupControllers : ControllerBase
    {
        [HttpPost]
        public IActionResult Register([FromBody] SingupModels model)
        {
            if (model == null)
                return BadRequest("Model Boş");

            var validationError = Empty_Space_Control.BoşKontrol(model);
            if (validationError != null)
                return BadRequest(validationError);

            if (model.Password != model.PasswordRepeat)
                return BadRequest("Şifreler eşleşmiyor.");

            var connectionString = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False;";
            var logservices = new LogService(connectionString);
            string controllerName = "SignupController";

            try
            {
                // 1. Aynı kullanıcı adından veri tabanında zaten var mı kontrol ediyoruz
                bool userExists = false;
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    string checkQuery = "SELECT COUNT(1) FROM Users WHERE Username = @Username OR Email = @Email";
                    using (SqlCommand command = new SqlCommand(checkQuery, connection))
                    {
                        command.Parameters.AddWithValue("@Username", model.Username);
                        command.Parameters.AddWithValue("@Email", model.Email);
                        connection.Open();
                        userExists = (int)command.ExecuteScalar() > 0;
                    }
                }

                if (userExists)
                {
                    logservices.AddLog("Warning", $"Kayıt Başarısız: {model.Username} veya {model.Email} zaten alınmış.", controllerName);
                    return BadRequest("Bu kullanıcı adı veya e-posta zaten kullanılmaktadır.");
                }

                // 2. HashServices sınıfınla yeni şifre için Salt ve Hash üretiyoruz
                string newSalt = HashServices.GenereateSalt();
                string newHash = HashServices.Hash(model.Password, newSalt);

                // 3. Yeni kullanıcıyı şifrelenmiş verileriyle veri tabanına kaydediyoruz
                using (SqlConnection connection = new SqlConnection(connectionString))
                {
                    // Eğer veritabanınızda Email kolonu yoksa, SQL veritabanına Email kolonu eklemeniz gerekir.
                    // ALTER TABLE Users ADD Email NVARCHAR(255);
                    string insertQuery = "INSERT INTO Users (Username, Email, PasswordHash, Salt, RoleId) VALUES (@Username, @Email, @PasswordHash, @Salt, (SELECT Id FROM Roles WHERE Name = 'Uye'))";
                    using (SqlCommand command = new SqlCommand(insertQuery, connection))
                    {
                        command.Parameters.AddWithValue("@Username", model.Username);
                        command.Parameters.AddWithValue("@Email", model.Email);
                        command.Parameters.AddWithValue("@PasswordHash", newHash);
                        command.Parameters.AddWithValue("@Salt", newSalt);

                        connection.Open();
                        command.ExecuteNonQuery();
                    }
                }

                // 4. Başarılı kayıt işlemini logla
                logservices.AddLog("Info", $"Yeni Kayıt: {model.Username} başarıyla üye oldu.", controllerName);
                return Ok(new { Message = "Kayıt işlemi başarıyla tamamlandı." });
            }
            catch (Exception ex)
            {
                // Veri tabanı veya sistem hatalarını Error olarak logluyoruz
                logservices.AddLog("Error", $"Kayıt Sistemi Hatası: {ex.Message}", controllerName);
                return StatusCode(500, "Sunucu hatası oluştu.");
            }
        }
    }
}
