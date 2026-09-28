@echo off
chcp 65001 >nul
title Verificar Docker - Simples Calculator

echo.
echo ==========================================
echo   VERIFICACAO DO AMBIENTE DOCKER
echo ==========================================
echo.

REM 1. Verifica Docker
echo [1/5] Verificando Docker...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [FALHA] Docker nao instalado
    goto :end
) else (
    echo [OK] Docker encontrado
)

REM 2. Verifica Docker Compose
echo [2/5] Verificando Docker Compose...
docker compose version >nul 2>nul
if %errorlevel% neq 0 (
    echo [FALHA] Docker Compose nao disponivel
    goto :end
) else (
    echo [OK] Docker Compose disponivel
)

REM 3. Verifica se daemon esta rodando
echo [3/5] Verificando daemon Docker...
docker version >nul 2>nul
if %errorlevel% neq 0 (
    echo [FALHA] Docker daemon nao esta rodando
    echo         Abra o Docker Desktop e aguarde ficar verde
    goto :end
) else (
    echo [OK] Docker daemon rodando
)

REM 4. Verifica arquivos do projeto
echo [4/5] Verificando arquivos do projeto...
if exist "docker-compose.yml" (
    echo [OK] docker-compose.yml encontrado
) else (
    echo [FALHA] docker-compose.yml nao encontrado
)

if exist "backend\Dockerfile" (
    echo [OK] backend/Dockerfile encontrado
) else (
    echo [FALHA] backend/Dockerfile nao encontrado
)

if exist "frontend\Dockerfile" (
    echo [OK] frontend/Dockerfile encontrado
) else (
    echo [FALHA] frontend/Dockerfile nao encontrado
)

if exist "frontend\nginx.conf" (
    echo [OK] frontend/nginx.conf encontrado
) else (
    echo [FALHA] frontend/nginx.conf nao encontrado
)

REM 5. Verifica portas (usa netstat nativo do Windows)
echo [5/5] Verificando portas...
for %%p in (3000 3001 80) do (
    netstat -ano | findstr :%%p >nul 2>nul
    if %errorlevel% equ 0 (
        echo [AVISO] Porta %%p ja em uso
    ) else (
        echo [OK] Porta %%p livre
    )
)

echo.
echo ==========================================
echo   RESUMO
echo ==========================================
echo.
echo Se todos mostraram [OK], pode rodar:
echo   Iniciar Simples Calculator.bat
echo.
echo Se houver [FALHA] ou [AVISO] nas portas:
echo   - Feche programas usando as portas
echo   - Ou reinicie o computador
echo.
echo Pressione Enter para sair...
pause >nul
:end
echo.
pause