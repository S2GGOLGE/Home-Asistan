namespace API.Data.Sql
{
    public class DataConnection
    {
        public string ConnectionString { get; set; }

        public DataConnection(string connectionString)
        {
            ConnectionString = connectionString;
        }
    }
}