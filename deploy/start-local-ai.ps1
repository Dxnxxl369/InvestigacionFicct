$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $projectRoot '.tools'
$ollamaExe = Join-Path $toolsDir 'ollama\ollama.exe'
$cloudflaredExe = Join-Path $toolsDir 'cloudflared.exe'
$tokenPath = Join-Path $toolsDir 'ficct-ai-token'
$tunnelConfig = Join-Path $env:USERPROFILE '.cloudflared\ficct-local-ai.yml'

foreach ($path in @($ollamaExe, $cloudflaredExe, $tokenPath, $tunnelConfig)) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing local AI dependency: $path" }
}

if (-not (Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue)) {
    $env:OLLAMA_HOST = '127.0.0.1:11434'
    $env:OLLAMA_NUM_PARALLEL = '1'
    $env:OLLAMA_MAX_LOADED_MODELS = '1'
    Start-Process -FilePath $ollamaExe -ArgumentList 'serve' -WorkingDirectory (Split-Path $ollamaExe) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $toolsDir 'ollama.stdout.log') -RedirectStandardError (Join-Path $toolsDir 'ollama.stderr.log')
}

if (-not (Get-NetTCPConnection -LocalPort 11435 -State Listen -ErrorAction SilentlyContinue)) {
    $env:FICCT_AI_TOKEN_FILE = $tokenPath
    $proxyScript = Join-Path $PSScriptRoot 'ai-proxy.mjs'
    Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList ('"' + $proxyScript + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $toolsDir 'ai-proxy.stdout.log') -RedirectStandardError (Join-Path $toolsDir 'ai-proxy.stderr.log')
}

$tunnelRunning = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'cloudflared.exe' -and $_.CommandLine -like '*ficct-local-ai.yml*'
}
if (-not $tunnelRunning) {
    Start-Process -FilePath $cloudflaredExe -ArgumentList @('tunnel', '--config', $tunnelConfig, 'run') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $toolsDir 'cloudflared-ai.stdout.log') -RedirectStandardError (Join-Path $toolsDir 'cloudflared-ai.stderr.log')
}

Write-Output 'FICCT local AI services started'
