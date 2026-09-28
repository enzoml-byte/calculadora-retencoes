<# 
.SYNOPSIS
    Inicia o Simples Calculator automaticamente
.DESCRIPTION
    Verifica Docker, sobe containers e abre o navegador
#>

param(
    [switch]$Prod = $false
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   SIMPLES CALCULATOR - Inicializador" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica Docker
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    if (-not $dockerVersion) {
        throw "Docker não está rodando"
    }
    Write-Host "[OK] Docker $dockerVersion rodando" -ForegroundColor Green
}
catch {
    Write-Host "[AVISO] Docker não está rodando. Tentando iniciar..." -ForegroundColor Yellow
    
    $dockerPaths = @(
        "C:\Program Files\Docker\Docker\Docker Desktop.exe",
        "C:\Program Files (x86)\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )
    
    foreach ($path in $dockerPaths) {
        if (Test-Path $path) {
            Start-Process $path
            break
        }
    }
    
    Write-Host "Aguardando Docker iniciar (até 90 segundos)..." -ForegroundColor Yellow
    $started = $false
    for ($i = 0; $i -lt 18; $i++) {
        Start-Sleep -Seconds 5
        try {
            $v = docker version --format '{{.Server.Version}}' 2>$null
            if ($v) {
                Write-Host "[OK] Docker $v rodando" -ForegroundColor Green
                $started = $true
                break
            }
        } catch {}
        Write-Host "  ... aguardando ($($i+1)/18)"
    }
    
    if (-not $started) {
        Write-Host "[ERRO] Docker não iniciou a tempo." -ForegroundColor Red
        Write-Host "Abra o Docker Desktop manualmente e tente novamente." -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit 1
    }
}

# Navega para pasta do script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

# Determina comando
$composeFile = if ($Prod) { "docker-compose.prod.yml" } else { "docker-compose.yml" }
$cmd = "docker compose -f $composeFile up --build"

# URLs
$frontendUrl = if ($Prod) { "http://localhost" } else { "http://localhost:3000" }
$backendUrl = if ($Prod) { "http://localhost:3001" } else { "http://localhost:3001" }

Write-Host ""
Write-Host "[INFO] Iniciando containers..." -ForegroundColor Cyan
Write-Host "       Modo: $(if ($Prod) { 'PRODUÇÃO (porta 80)' } else { 'DESENVOLVIMENTO (porta 3000)' })" -ForegroundColor Gray
Write-Host "       Frontend: $frontendUrl" -ForegroundColor Gray
Write-Host "       Backend API: $backendUrl" -ForegroundColor Gray
Write-Host "       Primeira execução baixa imagens (pode demorar 3-5 min)" -ForegroundColor Gray
Write-Host "       Próximas execuções são rápidas (segundos)" -ForegroundColor Gray
Write-Host ""

# Tenta abrir navegador após alguns segundos (background)
$browserJob = Start-Job -ScriptBlock {
    param($url)
    Start-Sleep -Seconds 20
    try { Start-Process $url } catch {}
} -ArgumentList $frontendUrl

# Executa docker compose
try {
    Write-Host "[CMD] $cmd" -ForegroundColor DarkGray
    Invoke-Expression $cmd
}
catch {
    Write-Host "[ERRO] Falha ao subir containers: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Dicas:" -ForegroundColor Yellow
    Write-Host "  - Verifique se o Docker Desktop está rodando" -ForegroundColor Yellow
    Write-Host "  - Porta 3000/3001/80 pode estar em uso" -ForegroundColor Yellow
    Write-Host "  - Tente: docker compose down -v && docker compose up --build" -ForegroundColor Yellow
}
finally {
    Remove-Job $browserJob -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Aplicação encerrada." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Read-Host "Pressione Enter para sair"