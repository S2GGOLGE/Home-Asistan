using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SensorsController : ControllerBase
    {
        private readonly string _connectionString = "Data Source=(localdb)\\mssqllocaldb;Initial Catalog=HOMEOS;Integrated Security=True;Multiple Active Result Sets=True";

        // GET /api/Sensors
        [HttpGet]
        public IActionResult GetSensors()
        {
            var sensors = new List<object>();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    SELECT Id, Name, Type, Room, Location, Value, Unit, Status, BatteryLevel, LastUpdated, CreatedAt
                    FROM Sensors
                    ORDER BY Id DESC";
                using var cmd = new SqlCommand(query, conn);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    sensors.Add(new
                    {
                        Id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                        Name = reader["Name"]?.ToString() ?? "",
                        Type = reader["Type"]?.ToString() ?? "",
                        Room = reader["Room"]?.ToString() ?? "",
                        Location = reader["Location"]?.ToString() ?? "",
                        Value = reader["Value"] != DBNull.Value ? Convert.ToDouble(reader["Value"]) : 0,
                        Unit = reader["Unit"]?.ToString() ?? "",
                        Status = reader["Status"]?.ToString() ?? "online",
                        BatteryLevel = reader["BatteryLevel"] != DBNull.Value ? (int?)Convert.ToInt32(reader["BatteryLevel"]) : null,
                        LastUpdated = reader["LastUpdated"] != DBNull.Value ? Convert.ToDateTime(reader["LastUpdated"]).ToString("yyyy-MM-dd HH:mm:ss") : "",
                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("yyyy-MM-dd HH:mm:ss") : ""
                    });
                }
                return Ok(sensors);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET /api/Sensors/{id}
        [HttpGet("{id}")]
        public IActionResult GetSensor(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = "SELECT Id, Name, Type, Room, Location, Value, Unit, Status, BatteryLevel, LastUpdated, CreatedAt FROM Sensors WHERE Id = @Id";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Id", id);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return Ok(new
                    {
                        Id = Convert.ToInt32(reader["Id"]),
                        Name = reader["Name"]?.ToString() ?? "",
                        Type = reader["Type"]?.ToString() ?? "",
                        Room = reader["Room"]?.ToString() ?? "",
                        Location = reader["Location"]?.ToString() ?? "",
                        Value = reader["Value"] != DBNull.Value ? Convert.ToDouble(reader["Value"]) : 0,
                        Unit = reader["Unit"]?.ToString() ?? "",
                        Status = reader["Status"]?.ToString() ?? "online",
                        BatteryLevel = reader["BatteryLevel"] != DBNull.Value ? (int?)Convert.ToInt32(reader["BatteryLevel"]) : null,
                        LastUpdated = reader["LastUpdated"] != DBNull.Value ? Convert.ToDateTime(reader["LastUpdated"]).ToString("yyyy-MM-dd HH:mm:ss") : "",
                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("yyyy-MM-dd HH:mm:ss") : ""
                    });
                }
                return NotFound(new { success = false, message = "Sensör bulunamadı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST /api/Sensors
        [HttpPost]
        public IActionResult CreateSensor([FromBody] SensorDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { success = false, message = "Sensör adı zorunludur." });
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    INSERT INTO Sensors (Name, Type, Room, Location, Value, Unit, Status, BatteryLevel)
                    OUTPUT INSERTED.Id
                    VALUES (@Name, @Type, @Room, @Location, @Value, @Unit, @Status, @BatteryLevel)";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Name", dto.Name);
                cmd.Parameters.AddWithValue("@Type", dto.Type ?? "temperature");
                cmd.Parameters.AddWithValue("@Room", (object?)dto.Room ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Location", (object?)dto.Location ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Value", dto.Value);
                cmd.Parameters.AddWithValue("@Unit", (object?)dto.Unit ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Status", dto.Status ?? "online");
                cmd.Parameters.AddWithValue("@BatteryLevel", (object?)dto.BatteryLevel ?? DBNull.Value);
                int newId = (int)cmd.ExecuteScalar();
                return Ok(new { success = true, id = newId, message = "Sensör başarıyla eklendi." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT /api/Sensors/{id}
        [HttpPut("{id}")]
        public IActionResult UpdateSensor(int id, [FromBody] SensorDto dto)
        {
            if (dto == null) return BadRequest(new { success = false, message = "Veri gereklidir." });
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    UPDATE Sensors SET
                        Name = @Name, Type = @Type, Room = @Room, Location = @Location,
                        Value = @Value, Unit = @Unit, Status = @Status, BatteryLevel = @BatteryLevel,
                        LastUpdated = GETDATE()
                    WHERE Id = @Id";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Id", id);
                cmd.Parameters.AddWithValue("@Name", dto.Name ?? "");
                cmd.Parameters.AddWithValue("@Type", dto.Type ?? "temperature");
                cmd.Parameters.AddWithValue("@Room", (object?)dto.Room ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Location", (object?)dto.Location ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Value", dto.Value);
                cmd.Parameters.AddWithValue("@Unit", (object?)dto.Unit ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Status", dto.Status ?? "online");
                cmd.Parameters.AddWithValue("@BatteryLevel", (object?)dto.BatteryLevel ?? DBNull.Value);
                int rows = cmd.ExecuteNonQuery();
                if (rows > 0) return Ok(new { success = true, message = "Sensör güncellendi." });
                return NotFound(new { success = false, message = "Sensör bulunamadı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE /api/Sensors/{id}
        [HttpDelete("{id}")]
        public IActionResult DeleteSensor(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                using var cmd = new SqlCommand("DELETE FROM Sensors WHERE Id = @Id", conn);
                cmd.Parameters.AddWithValue("@Id", id);
                int rows = cmd.ExecuteNonQuery();
                if (rows > 0) return Ok(new { success = true, message = "Sensör silindi." });
                return NotFound(new { success = false, message = "Sensör bulunamadı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class SensorDto
    {
        public string Name { get; set; }
        public string Type { get; set; }
        public string Room { get; set; }
        public string Location { get; set; }
        public double Value { get; set; }
        public string Unit { get; set; }
        public string Status { get; set; }
        public int? BatteryLevel { get; set; }
    }
}
