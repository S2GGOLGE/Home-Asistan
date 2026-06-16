using Api.Data.Sql;
using Api.Model.Device;
using Api.Services.LogServices;

var builder = WebApplication.CreateBuilder(args);

// ── LogService kaydı (connection string buradan alınıyor) ──────────────────
var logConnStr = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False";
builder.Services.AddSingleton<LogService>(new LogService(logConnStr));

// ── Port kontrolü ──────────────────────────────────────────────────────────
var configuredPort = builder.Configuration["App:Port"];
if (string.IsNullOrWhiteSpace(configuredPort) || !int.TryParse(configuredPort, out var port))
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.Error.WriteLine("[FATAL] 'App:Port' yapılandırması eksik veya geçersiz.");
    Console.Error.WriteLine("        appsettings.json içine ekle: { \"App\": { \"Port\": 5000 } }");
    Console.Error.WriteLine("        Ya da ortam değişkeni ile: App__Port=5000");
    Console.ResetColor();

    // LogService henüz DI'dan çekilemiyor, doğrudan new'leyip logla
    new LogService(logConnStr).AddLog("FATAL", "App:Port yapılandırması eksik veya geçersiz. Uygulama başlatılamadı.", "Program");
    return;
}

builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ── Servisler ──────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("HomeAsistan", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ── Build ──────────────────────────────────────────────────────────────────
var app = builder.Build();

// Build sonrası LogService'i resolve et — startup logları için
var logger = app.Services.GetRequiredService<LogService>();
logger.AddLog("INFO", $"Uygulama başlatılıyor. Port: {port}", "Program");

// ── Middleware ─────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    logger.AddLog("INFO", "Development ortamı algılandı. OpenAPI aktif.", "Program");
}

app.UseCors("HomeAsistan");
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine($"[INFO] Uygulama port {port} üzerinde başlatılıyor...");
logger.AddLog("INFO", $"Uygulama başarıyla ayağa kalktı. http://0.0.0.0:{port}", "Program");

app.Run();