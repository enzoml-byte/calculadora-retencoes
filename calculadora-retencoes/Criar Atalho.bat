@echo off
REM Criar Atalho da Calculadora de Retencoes na Area de Trabalho
set "SCRIPT=%~f0"
set "LINK=%USERPROFILE%\Desktop\Calculadora de Retencoes.lnk"
set "TARGET=%~dp0Calculadora.html"
set "WORKDIR=%~dp0"

if not exist "%TARGET%" (
    echo.
    echo ERRO: Arquivo Calculadora.html nao encontrado na pasta corrente!
    echo Coloque o arquivo Calculadora.html na mesma pasta deste script.
    pause
    exit /b
)

if exist "%LINK%" (
    del "%LINK%"
)

echo Criando atalho...
powershell -Command "^
$WshShell = New-Object -ComObject WScript.Shell ^
$shortcut = $WshShell.CreateShortcut("$LINK") ^
$shortcut.TargetPath = "$TARGET" ^
$shortcut.WorkingDirectory = "$WORKDIR" ^
$shortcut.Description = 'Calculadora de Retencoes para Escritorio' ^
$shortcut.Save() ^
"

echo.
echo Atalho criado com sucesso em: %LINK%
pause