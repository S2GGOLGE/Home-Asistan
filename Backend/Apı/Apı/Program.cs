using Api.Data.Sql;
using Api.Model.Device;
using Api.Controllers.DeviceRegistration;

var builder = WebApplication.CreateBuilder(args);

// Port zorunlu kontrolü — erken kes, geç acı çekme
var configuredPort = builder.Configuration["App:Port"];
if (string.IsNullOrWhiteSpace(configuredPort) || !int.TryParse(configuredPort, out var port))
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.Error.WriteLine("[FATAL] 'App:Port' yapılandırması eksik veya geçersiz.");
    Console.Error.WriteLine("        appsettings.json içine ekle: { \"App\": { \"Port\": 5000 } }");
    Console.Error.WriteLine("        Ya da ortam değişkeni ile: App__Port=5000");
    Console.ResetColor();
    return;
}

builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// 1. Servisleri Tanımla (Build Öncesi)
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// CORS Ayarını Tam Esnek ve Güvenli Hale Getiriyoruz
builder.Services.AddCors(options =>
{
    options.AddPolicy("HomeAsistan", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 2. Uygulamayı İnşa Et
var app = builder.Build();

// 3. Middleware Sıralaması (Build Sonrası - SIRA ÇOK ÖNEMLİ)
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("HomeAsistan");
app.UseAuthorization();
app.MapControllers();

Console.WriteLine($"[INFO] Uygulama port {port} üzerinde başlatılıyor...");
app.Run();