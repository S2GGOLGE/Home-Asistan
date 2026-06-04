using Microsoft.EntityFrameworkCore;
using API.Data;

var builder = WebApplication.CreateBuilder(args);

// SERVICES
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// DB CONTEXT
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

// HTTP CLIENT (PYTHON)
builder.Services.AddHttpClient("PythonService", client =>
{
    client.BaseAddress = new Uri("http://127.0.0.1:8000/");
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// PIPELINE
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();

app.MapControllers();

// TEST ENDPOINT
app.MapGet("/api/test", () =>
    Results.Ok(new { message = "API Ayakta!", status = true })
);

// PYTHON TEST
app.MapGet("/api/python/test", async (IHttpClientFactory factory) =>
{
    var client = factory.CreateClient("PythonService");

    try
    {
        var response = await client.GetAsync("/api/status");

        return Results.Ok(new
        {
            python = response.IsSuccessStatusCode,
            statusCode = response.StatusCode
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.Run();