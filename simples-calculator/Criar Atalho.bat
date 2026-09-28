@echo off
chcp 65001 >nul
title Criar Atalho - Simples Calculator

echo.
echo ==========================================
echo   CRIAR ATALHO NA AREA DE TRABALHO
echo ==========================================
echo.

cd /d "%~dp0"

set "TARGET=%~dp0Iniciar Simples Calculator.bat"
set "SHORTCUT=%USERPROFILE%\Desktop\Simples Calculator.lnk"

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $shortcut = $ws.CreateShortcut('%SHORTCUT%'); $shortcut.TargetPath = '%TARGET%'; $shortcut.WorkingDirectory = '%~dp0'; $shortcut.Description = 'Simples Calculator - Calculo de aliquota Simples Nacional'; $shortcut.IconLocation = '%SystemRoot%\System32\shell32.dll,13'; $shortcut.Save()"

if exist "%SHORTCUT%" (
    echo [OK] Atalho criado na Area de Trabalho!
    echo.
    echo Voce pode agora dar duplo-clique em "Simples Calculator" na Area de Trabalho.
) else (
    echo [ERRO] Nao foi possivel criar o atalho.
    echo Tente executar como Administrador.
)

echo.
pause