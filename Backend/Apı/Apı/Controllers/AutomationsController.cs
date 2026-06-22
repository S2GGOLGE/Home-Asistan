using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AutomationsController : ControllerBase
    {
        private readonly string _connectionString = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False";

        // GET /api/Automations
        [HttpGet]
        public IActionResult GetAutomations()
        {
            var automations = new List<object>();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    SELECT Id, Name, Description, TriggerCondition, ActionDescription, IsActive, LastRun, CreatedAt
                    FROM Automations
                    ORDER BY CreatedAt DESC";
                using var cmd = new SqlCommand(query, conn);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    automations.Add(new
                    {
                        Id = Convert.ToInt32(reader["Id"]),
                        Name = reader["Name"]?.ToString() ?? "",
                        Description = reader["Description"]?.ToString() ?? "",
                        TriggerCondition = reader["TriggerCondition"]?.ToString() ?? "",
                        ActionDescription = reader["ActionDescription"]?.ToString() ?? "",
                        IsActive = reader["IsActive"] != DBNull.Value && Convert.ToBoolean(reader["IsActive"]),
                        LastRun = reader["LastRun"] != DBNull.Value ? Convert.ToDateTime(reader["LastRun"]).ToString("yyyy-MM-dd HH:mm:ss") : null,
                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("yyyy-MM-dd HH:mm:ss") : ""
                    });
                }
                return Ok(automations);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // GET /api/Automations/{id}
        [HttpGet("{id}")]
        public IActionResult GetAutomation(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = "SELECT Id, Name, Description, TriggerCondition, ActionDescription, IsActive, LastRun, CreatedAt FROM Automations WHERE Id = @Id";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Id", id);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return Ok(new
                    {
                        Id = Convert.ToInt32(reader["Id"]),
                        Name = reader["Name"]?.ToString() ?? "",
                        Description = reader["Description"]?.ToString() ?? "",
                        TriggerCondition = reader["TriggerCondition"]?.ToString() ?? "",
                        ActionDescription = reader["ActionDescription"]?.ToString() ?? "",
                        IsActive = reader["IsActive"] != DBNull.Value && Convert.ToBoolean(reader["IsActive"]),
                        LastRun = reader["LastRun"] != DBNull.Value ? Convert.ToDateTime(reader["LastRun"]).ToString("yyyy-MM-dd HH:mm:ss") : null,
                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("yyyy-MM-dd HH:mm:ss") : ""
                    });
                }
                return NotFound(new { success = false, message = "Otomasyon bulunamadı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST /api/Automations
        [HttpPost]
        public IActionResult CreateAutomation([FromBody] AutomationDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { success = false, message = "Otomasyon adı zorunludur." });
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    INSERT INTO Automations (Name, Description, TriggerCondition, ActionDescription, IsActive)
                    OUTPUT INSERTED.Id
                    VALUES (@Name, @Description, @TriggerCondition, @ActionDescription, @IsActive)";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Name", dto.Name);
                cmd.Parameters.AddWithValue("@Description", (object?)dto.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@TriggerCondition", (object?)dto.TriggerCondition ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@ActionDescription", (object?)dto.ActionDescription ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@IsActive", dto.IsActive);
                int newId = (int)cmd.ExecuteScalar();
                return Ok(new { success = true, id = newId, message = "Otomasyon oluşturuldu." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT /api/Automations/{id}
        [HttpPut("{id}")]
        public IActionResult UpdateAutomation(int id, [FromBody] AutomationDto dto)
        {
            if (dto == null) return BadRequest();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    UPDATE Automations SET
                        Name = @Name, Description = @Description,
                        TriggerCondition = @TriggerCondition, ActionDescription = @ActionDescription,
                        IsActive = @IsActive
                    WHERE Id = @Id";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Id", id);
                cmd.Parameters.AddWithValue("@Name", dto.Name ?? "");
                cmd.Parameters.AddWithValue("@Description", (object?)dto.Description ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@TriggerCondition", (object?)dto.TriggerCondition ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@ActionDescription", (object?)dto.ActionDescription ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@IsActive", dto.IsActive);
                int rows = cmd.ExecuteNonQuery();
                if (rows > 0) return Ok(new { success = true });
                return NotFound(new { success = false, message = "Otomasyon bulunamadı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT /api/Automations/{id}/toggle
        [HttpPut("{id}/toggle")]
        public IActionResult ToggleAutomation(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = "UPDATE Automations SET IsActive = ~IsActive WHERE Id = @Id; SELECT IsActive FROM Automations WHERE Id = @Id";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Id", id);
                var newState = cmd.ExecuteScalar();
                return Ok(new { success = true, isActive = newState != null && Convert.ToBoolean(newState) });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // PUT /api/Automations/{id}/run
        [HttpPut("{id}/run")]
        public IActionResult RunAutomation(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                using var cmd = new SqlCommand("UPDATE Automations SET LastRun = GETDATE() WHERE Id = @Id", conn);
                cmd.Parameters.AddWithValue("@Id", id);
                cmd.ExecuteNonQuery();
                return Ok(new { success = true, message = "Otomasyon çalıştırıldı.", lastRun = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // DELETE /api/Automations/{id}
        [HttpDelete("{id}")]
        public IActionResult DeleteAutomation(int id)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                using var cmd = new SqlCommand("DELETE FROM Automations WHERE Id = @Id", conn);
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

    public class AutomationDto
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string TriggerCondition { get; set; }
        public string ActionDescription { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
