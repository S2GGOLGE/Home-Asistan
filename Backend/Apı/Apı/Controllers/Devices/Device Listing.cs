using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Api.Model.DevisListing;
using Api.Services.LogServices;

[ApiController]
[Route("api/Listing")]
public class DeviceListingController : ControllerBase
{
    private readonly LogService _logService;

    public DeviceListingController(LogService logService)
    {
        _logService = logService;
    }

    [HttpGet]
    public IActionResult GetDevices()
    {
        List<DevisListingModel> devices = new();

        string connectionString = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False";

        _logService.AddLog("INFO", "Cihaz listesi isteği alındı.", "DeviceListing");

        try
        {
            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();

                string query = "SELECT Id, Name, Type, Status FROM Devices";

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
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

            _logService.AddLog("INFO", $"Cihaz listesi başarıyla getirildi. Toplam {devices.Count} cihaz döndü.", "DeviceListing");
            return Ok(devices);
        }
        catch (Exception ex)
        {
            _logService.AddLog("ERROR", $"Cihaz listesi alınırken hata oluştu. Hata: {ex.Message}", "DeviceListing");
            return StatusCode(500, $"Veri tabanı hatası: {ex.Message}");
        }
    }
}