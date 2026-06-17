@echo off
cd /d "%~dp0"

set "API_CSPROJ="
for /r "%~dp0Backend" %%F in (*.csproj) do set "API_CSPROJ=%%F"

if not defined API_CSPROJ (
    echo [HATA] ASP.NET Backend projesi bulunamadi!
    echo        Klasor: %~dp0Backend
    pause
    exit /b 1
)

echo [OK] Proje: %API_CSPROJ%
dotnet run --project "%API_CSPROJ%"
