@echo off
title Calculadora de Retencoes
cd /d "%~dp0"
echo Abrindo Calculadora de Retencoes...
timeout /t 1 /nobreak >nul
start "" "Calculadora.html"
echo Se o navegador nao abriu, acesse arquivo ou duplo-clique em Calculadora.html
timeout /t 2 /nobreak >nul
start "" "%~dp0Calculadora.html"
echo.
Se o navegador nao abriu com servidor Python, o arquivo sera aberto diretamente.
pause