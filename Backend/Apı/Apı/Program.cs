using Api.Data.Sql;
using Api.Model.Device;
using Api.Controllers.DeviceRegistration;

var builder = WebApplication.CreateBuilder(args);

// 1. Servisleri Tanımla (Build Öncesi)
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// CORS Ayarını Tam Esnek ve Güvenli Hale Getiriyoruz
builder.Services.AddCors(options =>
{
    options.AddPolicy("HomeAsistan", policy =>
    {
        policy.AllowAnyOrigin()   // Her kök dizinden (localhost:5500 vb.) gelen isteğe izin ver
              .AllowAnyMethod()   // POST, GET, OPTIONS vb. tüm metotlara izin ver
              .AllowAnyHeader();  // Content-Type dahil tüm header'lara izin ver
    });
});

// 2. Uygulamayı İnşa Et
var app = builder.Build();

// 3. Middleware Sıralaması (Build Sonrası - SIRA ÇOK ÖNEMLİ)
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Önce Yönlendirmeler ve Güvenlik
app.UseHttpsRedirection();

// 🚀 CRITICAL: CORS mutlaka Routing'den sonra, Authorization ve Endpoints'ten ÖNCE gelmeli!
app.UseCors("HomeAsistan");

app.UseAuthorization();
app.MapControllers();

app.Run();