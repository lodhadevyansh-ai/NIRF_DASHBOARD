# NIRF Analytics Dashboard — Frontend Launcher Script
Write-Host "Starting NIRF Analytics Dashboard Frontend..." -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $ProjectRoot "frontend"

Set-Location $FrontendDir
npm run dev

