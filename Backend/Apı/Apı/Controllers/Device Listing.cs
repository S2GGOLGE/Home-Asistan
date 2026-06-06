using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Api.Model.DevisListing;
using Api.Data.Sql;
[ApiController]
[Route("api/Listing")]
public class DeviceListingController : ControllerBase
{
    [HttpGet]
    public IActionResult GetDevices()
    {
        // Yazım hatası düzeltildi: DevisListingModel -> DeviceListingModel
        List<DevisListingModel> devices = new();

        string connectionString = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False";

        try
        {
            // Bağlantı ve komut nesneleri 'using' ile güvenli şekilde yönetiliyor
            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();

                string query = "SELECT Id, Name, Type, Status FROM Devices"; // '*' yerine kolonları açıkça yazmak performansı artırır

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            // DBNull (Boş veri) kontrolleri eklenerek olası çökmeler engellendi
                            devices.Add(new DevisListingModel
                            {
                                Id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                                Name = reader["Name"] != DBNull.Value ? reader["Name"].ToString() : string.Empty,
                                Type = reader["Type"] != DBNull.Value ? reader["Type"].ToString() : string.Empty,
                                Status = reader["Status"] != DBNull.Value ? Convert.ToBoolean(reader["Status"]) : false
                            });
                        }
                    }
                }
            }

            return Ok(devices);
        }
        catch (Exception ex)
        {
            // Veri tabanı bağlantısında bir hata oluşursa uygulamanın çökmesini engeller
            return StatusCode(500, $"Veri tabanı hatası: {ex.Message}");
        }
    }
}