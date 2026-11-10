# NIRF Analytics Dashboard — Backend Launcher Script
Write-Host "Starting NIRF Analytics Dashboard Backend..." -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "backend"
$VenvPython = Join-Path $BackendDir "venv\Scripts\python.exe"

Set-Location $BackendDir

if (Test-Path $VenvPython) {
    Write-Host "Using virtual environment: $VenvPython" -ForegroundColor Green
    & $VenvPython -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
} else {
    Write-Host "Virtual environment not detected. Running system uvicorn..." -ForegroundColor Yellow
    uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
}

