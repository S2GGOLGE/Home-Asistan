using Microsoft.Data.SqlClient;

namespace Api.Services.LogServices
{
    public class LogService
    {
        private readonly string _connectionString;

        public LogService(string connectionString)
        {
            _connectionString = connectionString;
        }

        public void AddLog(string level, string message, string source)
        {
            try
            {
                using var conn = new SqlConnection(_connectionString);
                conn.Open();

                string query = @"
                    INSERT INTO Logs (Level, Message, Source)
                    VALUES (@Level, @Message, @Source)";

                using var cmd = new SqlCommand(query, conn);

                cmd.Parameters.AddWithValue("@Level", level);
                cmd.Parameters.AddWithValue("@Message", message);
                cmd.Parameters.AddWithValue("@Source", source);

                cmd.ExecuteNonQuery();
            }
            catch
            {
                // log patlarsa sistemi düşürme
            }
        }
    }
}