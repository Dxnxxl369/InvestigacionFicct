@echo off
title Copiloto IA FICCT - Ollama + Tunel Cloudflare
echo ============================================================
echo   INICIANDO SERVIDOR IA LOCAL (qwen2.5:3b + Cloudflare)
echo ============================================================
echo.

REM 1. Verificar si Ollama ya esta corriendo; si no, iniciarlo en segundo plano
curl -s http://localhost:11434 >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/3] Iniciando Ollama en segundo plano...
    start "" /B ollama serve >nul 2>&1
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] Ollama ya esta activo en http://localhost:11434
)

REM 2. Verificar que el modelo qwen2.5:3b exista localmente (instantaneo)
echo [2/3] Verificando modelo qwen2.5:3b...
ollama list | findstr /I "qwen2.5:3b" >nul 2>&1
if %errorlevel% neq 0 (
    echo Descargando modelo qwen2.5:3b...
    ollama pull qwen2.5:3b
)

REM 3. Buscar cloudflared en PATH o rutas tipicas de instalacion
set "CF_CMD=cloudflared"
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
        set "CF_CMD=C:\Program Files (x86)\cloudflared\cloudflared.exe"
    ) else if exist "C:\Program Files\cloudflared\cloudflared.exe" (
        set "CF_CMD=C:\Program Files\cloudflared\cloudflared.exe"
    )
)

echo [3/3] Abriendo tunel Cloudflare hacia http://localhost:11434...
echo.
echo   IMPORTANTE: Copia la URL https://....trycloudflare.com que
echo   aparecera abajo y pegala en LOCAL_AI_URL en Render.
echo   No cierres esta ventana mientras uses tu modelo local.
echo ============================================================
echo.

"%CF_CMD%" tunnel --url http://localhost:11434

echo.
echo El tunel se ha detenido.
pause
