using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly string _connectionString = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False";

        [HttpGet]
        public IActionResult GetUsers()
        {
            var users = new List<object>();
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();
                string query = "SELECT Id, Username, Email, Role, CreatedAt FROM Users ORDER BY Id DESC";
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
    }
}
