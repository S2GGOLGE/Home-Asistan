namespace Api.Helpers
{
    public static class ApiResponse
    {
        public static object Ok(object? data = null) => new
        {
            success = true,
            data,
            error = (string?)null
        };

        public static object Fail(string error, object? data = null) => new
        {
            success = false,
            data,
            error
        };
    }
}
