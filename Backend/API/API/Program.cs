using API.Services;

var builder = WebApplication.CreateBuilder(args);

// --- 1. CORE SERVICES ---
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// --- 2. CORS POLICY ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// --- 3. PRODUCTION LEVEL HTTP CLIENT REGISTRATION (JARVIS) ---
builder.Services.AddHttpClient<IJarvisClient, JarvisClient>(client =>
{
    client.BaseAddress = new Uri("http://127.0.0.1:8000/");
    client.Timeout = TimeSpan.FromSeconds(10); // 10 Saniye Zaman Aşımı
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

var app = builder.Build();

// --- 4. HTTP PIPELINE (MIDDLEWARES) ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Sıralama Önemli: CORS her zaman Authorization'dan önce gelmelidir
app.UseCors("AllowAll");

app.UseAuthorization();
app.MapControllers();

// --- 5. MINIMAL API TEST ENDPOINT ---
app.MapGet("/api/test", () => Results.Ok(new { message = "Home Assistant API Ayakta!", status = true }));

app.Run();