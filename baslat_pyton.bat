@echo off
cd /d "%~dp0"
call "%~dp0.venv\Scripts\activate.bat"
cd /d "%~dp0Pyton"
python main.py
