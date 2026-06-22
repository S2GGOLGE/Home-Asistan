@echo off
title Home Asistan - Baslatici
color 0A

echo.
echo  ================================================
echo   HOME ASISTAN - SISTEM BASLATICI
echo  ================================================
echo.

:: Sanal ortam kontrolu
if not exist "%~dp0.venv\Scripts\activate.bat" (
    echo [0] Sanal ortam bulunamadi. Olusturuluyor...
    python -m venv "%~dp0.venv"
    if errorlevel 1 (
        echo [HATA] Sanal ortam olusturulamadi! Python yuklu mu?
        pause
        exit /b 1
    )
    echo [OK] Sanal ortam olusturuldu.
)

call "%~dp0.venv\Scripts\activate.bat"

:: ------------------------------------------------
:: 1. ASP.NET BACKEND (C# API - Port 7201)
:: ------------------------------------------------
echo [1/5] ASP.NET Backend baslatiliyor - Port 7201...

where dotnet >nul 2>&1
if errorlevel 1 (
    echo [HATA] dotnet SDK bulunamadi! .NET SDK yukleyin.
    pause
    exit /b 1
)

:: Ozel karakterli klasor adi icin .csproj dosyasini dinamik bul
set "API_CSPROJ="
for /r "%~dp0Backend" %%F in (*.csproj) do set "API_CSPROJ=%%F"

if not defined API_CSPROJ (
    echo [HATA] ASP.NET Backend projesi bulunamadi!
    echo        Kontrol edin: "%~dp0Backend"
    pause
    exit /b 1
)

echo [OK] Proje bulundu: %API_CSPROJ%
start "ASP.NET Backend - Port 7201" cmd /k ""%~dp0baslat_aspnet.bat""

timeout /t 3 /nobreak > nul

:: ------------------------------------------------
:: 2. PYTON BACKEND (FastAPI - Port 8082)
:: ------------------------------------------------
echo [2/5] Pyton backend bagimliliklar yukleniyor...
pip install -r "%~dp0Pyton\requirements.txt" --quiet
if errorlevel 1 (
    echo [HATA] Pyton backend bagimliliklar yuklenemedi!
    pause
    exit /b 1
)

echo [3/5] Pyton backend baslatiliyor - Port 8082...
start "Pyton Backend - Port 8082" cmd /k ""%~dp0baslat_pyton.bat""

timeout /t 2 /nobreak > nul

:: ------------------------------------------------
:: 3. JAVIS V.02 - Sesli AI
:: ------------------------------------------------
echo [4/5] JAViS V.02 bagimliliklar yukleniyor...

:: Klasor adini dinamik olarak bul (ozel karakter sorunu icin)
for /d %%D in ("%~dp0*V.02*") do set JAVIS_DIR=%%D

if not defined JAVIS_DIR (
    echo [HATA] JAViS V.02 klasoru bulunamadi!
    pause
    exit /b 1
)

pip install -r "%JAVIS_DIR%\requirements.txt" --quiet
if errorlevel 1 (
    echo [HATA] JAViS V.02 bagimliliklar yuklenemedi!
    pause
    exit /b 1
)

echo [5/5] JAViS V.02 Sesli AI baslatiliyor...
start "JAViS V.02 - Sesli AI" cmd /k ""%~dp0baslat_javis.bat""

:: ------------------------------------------------
echo.
echo  ================================================
echo   TUM SERVISLER BASLATILDI!
echo.
echo   Backend (ASP.NET) : https://localhost:7201
echo   Backend (Pyton)   : http://127.0.0.1:8082
echo   JAViS V.02        : Sesli AI penceresi acildi
echo.
echo   Kapatmak icin her pencerede CTRL+C
echo  ================================================
echo.
pause
