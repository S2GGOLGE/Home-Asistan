using Api.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LogsController : ControllerBase
    {
        private readonly string _connectionString;

        public LogsController(string connectionString)
        {
            _connectionString = connectionString;
        }

        [HttpGet]
        public IActionResult GetLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 100)
        {
            page = Math.Max(1, page);
            pageSize = pageSize < 1 || pageSize > 500 ? 100 : pageSize;

            var logs = new List<object>();

            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();

                const string query = @"
                    SELECT Id, Level, Message, Source, CreatedAt
                    FROM dbo.Logs
                    ORDER BY Id DESC
                    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY";

                using var cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@Offset", (page - 1) * pageSize);
                cmd.Parameters.AddWithValue("@PageSize", pageSize);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    logs.Add(new
                    {
                        id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                        level = reader["Level"]?.ToString() ?? "INFO",
                        message = reader["Message"]?.ToString() ?? "",
                        source = reader["Source"]?.ToString() ?? "",
                        createdAt = reader["CreatedAt"] != DBNull.Value
                            ? Convert.ToDateTime(reader["CreatedAt"]).ToString("yyyy-MM-dd HH:mm:ss")
                            : ""
                    });
                }

                return Ok(ApiResponse.Ok(logs));
            }
            catch (Exception ex)
            {
                _ = AppState.SystemLog?.LogExceptionAsync("LogsController", ex);
                return StatusCode(500, ApiResponse.Fail(ex.Message));
            }
        }
    }
}
