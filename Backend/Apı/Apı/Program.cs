using Api.Data.Sql;
using Api.Model.Device;
using Api.Controllers.DeviceRegistration;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("HomeAsistan", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
var connectionString=
    builder.Configuration.GetConnectionString("DefaultConnection");
app.UseHttpsRedirection();

app.UseCors("HomeAsistan");

app.UseAuthorization();

app.MapControllers();

app.Run();