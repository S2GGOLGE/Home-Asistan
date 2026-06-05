namespace Api.Data.Sql
{
    public class Connection
    {
        public string Connect { get; set; }

        public Connection(string connectionString)
        {
            Connect = connectionString;
        }
    }
}