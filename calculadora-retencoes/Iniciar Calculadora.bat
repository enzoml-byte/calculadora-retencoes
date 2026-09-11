@echo off
REM Iniciar Calculadora de Retencoes - duplo clique
title Calculadora de Retencoes
cd /d "%~dp0"
echo Abrindo Calculadora de Retencoes...
REM Tenta servidor local para leitura direta do empresas.json; se falhar abre arquivo direto
python -m http.server 8811 --bind 127.0.0.1 >nul 2>&1 &
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8811/Calculadora.html"
timeout /t 2 /nobreak >nul
start "" "%~dp0Calculadora.html"
echo Se o navegador nao abriu, acesse http://127.0.0.1:8811/Calculadora.html ou duplo-clique em Calculadora.html
pause
