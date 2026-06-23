using Api.Helpers;
using Api.Hubs;
using Api.Services.LogServices;
using Api.Services.SystemLogging;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// ── Bağlantı dizesi ────────────────────────────────────────────────────────
var connStr = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Multiple Active Result Sets=True;Encrypt=False";

// ── Veritabanı başlatma (tablolar + seed) ─────────────────────────────────
DatabaseInitializer.Initialize(connStr);

// ── Eski LogService (geriye uyumluluk) ────────────────────────────────────
builder.Services.AddSingleton<LogService>(new LogService(connStr));

// ── SignalR ────────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── Temel servisler ────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSingleton(connStr);
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var error = context.ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? e.Exception?.Message : e.ErrorMessage)
            .FirstOrDefault(e => !string.IsNullOrWhiteSpace(e))
            ?? "Geçersiz istek.";

        return new BadRequestObjectResult(ApiResponse.Fail(error));
    };
});

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

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        if (AppState.SystemLog is not null)
        {
            await AppState.SystemLog.LogApiErrorAsync(context.Request.Path, context.Response.StatusCode, ex.Message);
        }

        await context.Response.WriteAsJsonAsync(ApiResponse.Fail("Sunucu hatası oluştu."));
    }
});

app.UseAuthorization();

// ── Static Files (Serve Y:\Home Asistan\Fronted) ──────────────────────────
var frontedPath = ResolveFrontedPath(app.Environment);
if (frontedPath is not null)
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontedPath),
        RequestPath = "/Fronted"
    });
}
else
{
    Console.WriteLine("[WARNING] Fronted path not found.");
}

app.MapControllers();
app.MapHub<LogHub>("/hubs/logs");   // ← SignalR gerçek zamanlı log endpoint'i

Console.WriteLine($"[INFO] HomeOS API port {port} üzerinde başlatılıyor...");
await AppState.SystemLog.InfoAsync($"API başarıyla ayağa kalktı → https://localhost:{port}", "Program");

app.Run();

static string? ResolveFrontedPath(IHostEnvironment environment)
{
    var roots = new[]
    {
        environment.ContentRootPath,
        AppContext.BaseDirectory,
        Directory.GetCurrentDirectory()
    };

    foreach (var root in roots.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct(StringComparer.OrdinalIgnoreCase))
    {
        var directory = new DirectoryInfo(root);
        while (directory is not null)
        {
            var candidate = Path.Combine(directory.FullName, "Fronted");
            if (Directory.Exists(candidate))
            {
                return Path.GetFullPath(candidate);
            }

            directory = directory.Parent;
        }
    }

    return null;
}
