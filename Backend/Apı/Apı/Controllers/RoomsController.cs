using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RoomsController : ControllerBase
    {
        private readonly string _connectionString = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False";

        // GET /api/Rooms
        [HttpGet]
        public IActionResult GetRooms()
        {
            var rooms = new List<object>();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    SELECT r.Id, r.Name, r.Icon, r.Description, r.CreatedAt,
                           COUNT(d.Id) AS DeviceCount
                    FROM Rooms r
                    LEFT JOIN Devices d ON d.Room = r.Name
                    GROUP BY r.Id, r.Name, r.Icon, r.Description, r.CreatedAt
                    ORDER BY r.Name";
                using var cmd = new SqlCommand(query, conn);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    rooms.Add(new
                    {
                        Id = Convert.ToInt32(reader["Id"]),
                        Name = reader["Name"]?.ToString() ?? "",
                        Icon = reader["Icon"]?.ToString() ?? "fa-door-open",
                        Description = reader["Description"]?.ToString() ?? "",
                        DeviceCount = Convert.ToInt32(reader["DeviceCount"]),
                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("yyyy-MM-dd HH:mm:ss") : ""
                    });
                }
                return Ok(rooms);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET /api/Rooms/{id}
        [HttpGet("{id}")]
        public IActionResult GetRoom(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    SELECT r.Id, r.Name, r.Icon, r.Description, r.CreatedAt,
                           COUNT(d.Id) AS DeviceCount
                    FROM Rooms r
                    LEFT JOIN Devices d ON d.Room = r.Name
                    WHERE r.Id = @Id
                    GROUP BY r.Id, r.Name, r.Icon, r.Description, r.CreatedAt";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Id", id);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return Ok(new
                    {
                        Id = Convert.ToInt32(reader["Id"]),
                        Name = reader["Name"]?.ToString() ?? "",
                        Icon = reader["Icon"]?.ToString() ?? "fa-door-open",
                        Description = reader["Description"]?.ToString() ?? "",
                        DeviceCount = Convert.ToInt32(reader["DeviceCount"]),
                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("yyyy-MM-dd") : ""
                    });
                }
                return NotFound(new { success = false, message = "Oda bulunamadı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET /api/Rooms/{id}/devices
        [HttpGet("{id}/devices")]
        public IActionResult GetRoomDevices(int id)
        {
            var devices = new List<object>();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                // First get room name
                string roomName = "";
                using (var cmdRoom = new SqlCommand("SELECT Name FROM Rooms WHERE Id = @Id", conn))
                {
                    cmdRoom.Parameters.AddWithValue("@Id", id);
                    var result = cmdRoom.ExecuteScalar();
                    if (result == null) return NotFound(new { success = false, message = "Oda bulunamadı." });
                    roomName = result.ToString()!;
                }
                string query = "SELECT Id, Name, Type, Status FROM Devices WHERE Room = @Room ORDER BY Name";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Room", roomName);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    devices.Add(new
                    {
                        Id = Convert.ToInt32(reader["Id"]),
                        Name = reader["Name"]?.ToString() ?? "",
                        Type = reader["Type"]?.ToString() ?? "",
                        Status = reader["Status"] != DBNull.Value && Convert.ToBoolean(reader["Status"])
                    });
                }
                return Ok(devices);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST /api/Rooms
        [HttpPost]
        public IActionResult CreateRoom([FromBody] RoomDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { success = false, message = "Oda adı zorunludur." });
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    INSERT INTO Rooms (Name, Icon, Description)
                    OUTPUT INSERTED.Id
                    VALUES (@Name, @Icon, @Description)";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Name", dto.Name);
                cmd.Parameters.AddWithValue("@Icon", (object?)dto.Icon ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Description", (object?)dto.Description ?? DBNull.Value);
                int newId = (int)cmd.ExecuteScalar();
                return Ok(new { success = true, id = newId, message = "Oda oluşturuldu." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT /api/Rooms/{id}
        [HttpPut("{id}")]
        public IActionResult UpdateRoom(int id, [FromBody] RoomDto dto)
        {
            if (dto == null) return BadRequest();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = "UPDATE Rooms SET Name = @Name, Icon = @Icon, Description = @Description WHERE Id = @Id";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Id", id);
                cmd.Parameters.AddWithValue("@Name", dto.Name ?? "");
                cmd.Parameters.AddWithValue("@Icon", (object?)dto.Icon ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@Description", (object?)dto.Description ?? DBNull.Value);
                int rows = cmd.ExecuteNonQuery();
                if (rows > 0) return Ok(new { success = true });
                return NotFound(new { success = false, message = "Oda bulunamadı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE /api/Rooms/{id}
        [HttpDelete("{id}")]
        public IActionResult DeleteRoom(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                using var cmd = new SqlCommand("DELETE FROM Rooms WHERE Id = @Id", conn);
                cmd.Parameters.AddWithValue("@Id", id);
                cmd.ExecuteNonQuery();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class RoomDto
    {
        public string Name { get; set; }
        public string Icon { get; set; }
        public string Description { get; set; }
    }
}
