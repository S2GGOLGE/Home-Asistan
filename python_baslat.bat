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
    echo [1] Sanal ortam bulunamadi. Olusturuluyor...
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
:: 1. PYTON BACKEND (FastAPI - Port 8082)
:: ------------------------------------------------
echo [1/4] Pyton backend bagimliliklar yukleniyor...
pip install -r "%~dp0Pyton\requirements.txt" --quiet
if errorlevel 1 (
    echo [HATA] Pyton backend bagimliliklar yuklenemedi!
    pause
    exit /b 1
)

echo [2/4] Pyton backend baslatiliyor - Port 8082...
start "Backend API" cmd /k "call "%~dp0.venv\Scripts\activate.bat" && cd /d "%~dp0Pyton" && python main.py"

timeout /t 2 /nobreak > nul

:: ------------------------------------------------
:: 2. JAVIS V.02 - Sesli AI
:: ------------------------------------------------
echo [3/4] JAViS V.02 bagimliliklar yukleniyor...

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

echo [4/4] JAViS V.02 Sesli AI baslatiliyor...
start "JAViS V.02 - Sesli AI" cmd /k "call "%~dp0.venv\Scripts\activate.bat" && cd /d "%JAVIS_DIR%" && python main.py"

:: ------------------------------------------------
echo.
echo  ================================================
echo   TUM SERVISLER BASLATILDI!
echo.
echo   Backend API : http://127.0.0.1:8082
echo   JAViS V.02  : Sesli AI penceresi acildi
echo.
echo   Kapatmak icin her pencerede CTRL+C
echo  ================================================
echo.
pause
