@echo off
chcp 65001 >nul
title Simples Calculator - Modo Producao

echo.
echo ==========================================
echo   SIMPLES CALCULATOR - Modo Producao
echo ==========================================
echo.

REM Verifica se Docker esta instalado
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Docker nao encontrado.
    echo Por favor, instale o Docker Desktop: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

REM Verifica se Docker esta rodando
docker version >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Docker nao esta rodando.
    echo Tentando iniciar o Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
    start "" "C:\Program Files (x86)\Docker\Docker\Docker Desktop.exe" 2>nul
    
    echo Aguardando Docker iniciar (ate 90 segundos)...
    set STARTED=0
    for /l %%i in (1,1,18) do (
        timeout /t 5 /nobreak >nul
        docker version >nul 2>nul
        if !errorlevel! equ 0 (
            set STARTED=1
            goto docker_ok
        )
        echo   ... aguardando (%%i/18)
    )
    :docker_ok
    if "%STARTED%" neq "1" (
        echo [ERRO] Docker nao iniciou a tempo.
        echo Abra o Docker Desktop manualmente e tente novamente.
        echo.
        pause
        exit /b 1
    )
)

echo [OK] Docker esta rodando.
echo.

REM Navega para a pasta do script
cd /d "%~dp0"

echo [INFO] Iniciando containers (MODO PRODUCAO - porta 80)...
echo [INFO] Frontend: http://localhost
echo [INFO] Backend:  http://localhost:3001
echo.

docker compose -f docker-compose.prod.yml up --build

echo.
echo ==========================================
echo   Aplicacao finalizada.
echo ==========================================
pause