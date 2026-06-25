using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Api.Dto.UpdateRole;
namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly string _connectionString = "DataData Source=(localdb)\\mssqllocaldb;Initial Catalog=HOMEOS;Integrated Security=True;Multiple Active Result Sets=True";

        [HttpGet]
        public IActionResult GetUsers()
        {
            var users = new List<object>();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = @"
                    SELECT u.Id, u.Username, u.Email, r.Name AS Role, u.CreatedAt 
                    FROM Users u 
                    LEFT JOIN Roles r ON u.RoleId = r.Id 
                    ORDER BY u.Id DESC";
                using var cmd = new SqlCommand(query, conn);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    users.Add(new
                    {
                        Id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                        Username = reader["Username"] != DBNull.Value ? reader["Username"].ToString() : "",
                        Email = reader["Email"] != DBNull.Value ? reader["Email"].ToString() : "",
                        Role = reader["Role"] != DBNull.Value ? reader["Role"].ToString() : "",
                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("yyyy-MM-dd HH:mm:ss") : ""
                    });
                }
                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}/role")]
        public IActionResult UpdateUserRole(int id, [FromBody] UpdateRoleDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.Role))
                return BadRequest(new { success = false, message = "Rol belirtilmedi." });

            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = "UPDATE Users SET RoleId = (SELECT Id FROM Roles WHERE Name = @Role) WHERE Id = @Id";
                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Role", dto.Role);
                cmd.Parameters.AddWithValue("@Id", id);
                int rows = cmd.ExecuteNonQuery();
                if (rows > 0)
                {
                    return Ok(new { success = true, message = "Kullanıcı rolü başarıyla güncellendi." });
                }
                return NotFound(new { success = false, message = "Kullanıcı bulunamadı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
