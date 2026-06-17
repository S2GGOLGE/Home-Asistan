@echo off
cd /d "%~dp0"
call "%~dp0.venv\Scripts\activate.bat"

set "JAVIS_DIR="
for /d %%D in ("%~dp0*V.02*") do set "JAVIS_DIR=%%D"

if not defined JAVIS_DIR (
    echo [HATA] JAViS V.02 klasoru bulunamadi!
    pause
    exit /b 1
)

cd /d "%JAVIS_DIR%"
python main.py
