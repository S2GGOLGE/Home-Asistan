using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using Api.Dto.Notification;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly string _connectionString = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False";

        // GET /api/Notifications
        [HttpGet]
        public IActionResult GetNotifications([FromQuery] string? priority, [FromQuery] string? category, [FromQuery] bool? isRead, [FromQuery] int limit = 200)
        {
            var notifications = new List<object>();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string where = "WHERE 1=1";
                if (!string.IsNullOrEmpty(priority)) where += " AND Priority = @Priority";
                if (!string.IsNullOrEmpty(category)) where += " AND Category = @Category";
                if (isRead.HasValue) where += " AND IsRead = @IsRead";

                string query = $@"
                    SELECT TOP (@Limit) Id, Title, Message, Priority, Category, IsRead, UserId, CreatedAt
                    FROM Notifications
                    {where}
                    ORDER BY CreatedAt DESC";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Limit", limit);
                if (!string.IsNullOrEmpty(priority)) cmd.Parameters.AddWithValue("@Priority", priority);
                if (!string.IsNullOrEmpty(category)) cmd.Parameters.AddWithValue("@Category", category);
                if (isRead.HasValue) cmd.Parameters.AddWithValue("@IsRead", isRead.Value ? 1 : 0);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    notifications.Add(new
                    {
                        Id = Convert.ToInt32(reader["Id"]),
                        Title = reader["Title"]?.ToString() ?? "",
                        Message = reader["Message"]?.ToString() ?? "",
                        Priority = reader["Priority"]?.ToString() ?? "info",
                        Category = reader["Category"]?.ToString() ?? "system",
                        IsRead = reader["IsRead"] != DBNull.Value && Convert.ToBoolean(reader["IsRead"]),
                        UserId = reader["UserId"] != DBNull.Value ? (int?)Convert.ToInt32(reader["UserId"]) : null,
                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("yyyy-MM-dd HH:mm:ss") : ""
                    });
                }
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET /api/Notifications/stats
        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    SELECT
                        COUNT(*) AS Total,
                        SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) AS Unread,
                        SUM(CASE WHEN Priority = 'critical' THEN 1 ELSE 0 END) AS Critical,
                        SUM(CASE WHEN Priority = 'warning' THEN 1 ELSE 0 END) AS Warning,
                        SUM(CASE WHEN Category = 'automation' THEN 1 ELSE 0 END) AS Automation
                    FROM Notifications";
                using var cmd = new SqlCommand(query, conn);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return Ok(new
                    {
                        Total = Convert.ToInt32(reader["Total"]),
                        Unread = Convert.ToInt32(reader["Unread"]),
                        Critical = Convert.ToInt32(reader["Critical"]),
                        Warning = Convert.ToInt32(reader["Warning"]),
                        Automation = Convert.ToInt32(reader["Automation"])
                    });
                }
                return Ok(new { Total = 0, Unread = 0, Critical = 0, Warning = 0, Automation = 0 });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST /api/Notifications
        [HttpPost]
        public IActionResult CreateNotification([FromBody] NotificationDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { success = false, message = "Başlık zorunludur." });
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    INSERT INTO Notifications (Title, Message, Priority, Category, IsRead, UserId)
                    OUTPUT INSERTED.Id
                    VALUES (@Title, @Message, @Priority, @Category, 0, @UserId)";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Title", dto.Title);
                cmd.Parameters.AddWithValue("@Message", dto.Message ?? "");
                cmd.Parameters.AddWithValue("@Priority", dto.Priority ?? "info");
                cmd.Parameters.AddWithValue("@Category", dto.Category ?? "system");
                cmd.Parameters.AddWithValue("@UserId", (object?)dto.UserId ?? DBNull.Value);
                int newId = (int)cmd.ExecuteScalar();
                return Ok(new { success = true, id = newId, message = "Bildirim oluşturuldu." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT /api/Notifications/{id}/read
        [HttpPut("{id}/read")]
        public IActionResult MarkRead(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                using var cmd = new SqlCommand("UPDATE Notifications SET IsRead = 1 WHERE Id = @Id", conn);
                cmd.Parameters.AddWithValue("@Id", id);
                cmd.ExecuteNonQuery();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT /api/Notifications/readall
        [HttpPut("readall")]
        public IActionResult MarkAllRead()
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                using var cmd = new SqlCommand("UPDATE Notifications SET IsRead = 1", conn);
                cmd.ExecuteNonQuery();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE /api/Notifications/{id}
        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                using var cmd = new SqlCommand("DELETE FROM Notifications WHERE Id = @Id", conn);
                cmd.Parameters.AddWithValue("@Id", id);
                cmd.ExecuteNonQuery();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE /api/Notifications/clearall
        [HttpDelete("clearall")]
        public IActionResult ClearAll()
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                using var cmd = new SqlCommand("DELETE FROM Notifications", conn);
                cmd.ExecuteNonQuery();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    
}
