using Api.Helpers;
using Api.Hubs;
using Api.Services.LogServices;
using Api.Services.SystemLogging;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// ── Bağlantı dizesi ────────────────────────────────────────────────────────
var connStr = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False";

// ── Veritabanı başlatma (tablolar + seed) ─────────────────────────────────
DatabaseInitializer.Initialize(connStr);

// ── Eski LogService (geriye uyumluluk) ────────────────────────────────────
builder.Services.AddSingleton<LogService>(new LogService(connStr));

// ── SignalR ────────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── Temel servisler ────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("HomeAsistan", policy =>
    {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .SetIsOriginAllowed(_ => true)  // SignalR için gerekli
              .AllowCredentials();            // SignalR WebSocket için gerekli
    });
});

// ── Port kontrolü ──────────────────────────────────────────────────────────
var configuredPort = builder.Configuration["App:Port"];
if (string.IsNullOrWhiteSpace(configuredPort) || !int.TryParse(configuredPort, out var port))
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.Error.WriteLine("[FATAL] 'App:Port' yapılandırması eksik veya geçersiz.");
    Console.Error.WriteLine("        appsettings.json: { \"App\": { \"Port\": 7201 } }");
    Console.ResetColor();
    new LogService(connStr).AddLog("FATAL", "App:Port yapılandırması eksik.", "Program");
    return;
}

builder.WebHost.UseUrls($"https://localhost:{port}");

// ── Build ──────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── SystemLogService: HubContext build sonrası hazır, AppState'e atanıyor ──
var hubContext = app.Services.GetRequiredService<IHubContext<LogHub>>();
AppState.SystemLog = new SystemLogService(connStr, hubContext);

// ── Startup logları ────────────────────────────────────────────────────────
var oldLogger = app.Services.GetRequiredService<LogService>();
oldLogger.AddLog("INFO", $"Uygulama başlatılıyor. Port: {port}", "Program");
await AppState.SystemLog.LogStartupAsync("HomeOS API");

// ── Middleware ─────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    await AppState.SystemLog.InfoAsync("Development ortamı algılandı. OpenAPI aktif.", "Program");
}

app.UseCors("HomeAsistan");
app.UseAuthorization();
app.MapControllers();
app.MapHub<LogHub>("/hubs/logs");   // ← SignalR gerçek zamanlı log endpoint'i

Console.WriteLine($"[INFO] HomeOS API port {port} üzerinde başlatılıyor...");
await AppState.SystemLog.InfoAsync($"API başarıyla ayağa kalktı → https://localhost:{port}", "Program");

app.Run();
