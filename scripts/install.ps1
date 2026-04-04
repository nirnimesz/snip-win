# SnipWin Installer — PowerShell One-Liner
# Usage: irm https://raw.githubusercontent.com/nirnimesz/snip-win/main/scripts/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║     SnipWin — Visual Review v2.0    ║" -ForegroundColor Cyan
Write-Host "  ║     AI Agent Communication Layer     ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodeVersion = $null
try {
    $nodeVersion = node --version 2>$null
} catch {}

if (-not $nodeVersion) {
    Write-Host "[!] Node.js is required but not installed." -ForegroundColor Red
    Write-Host "    Download from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    $install = Read-Host "Open Node.js download page? (y/n)"
    if ($install -eq "y") { Start-Process "https://nodejs.org/" }
    exit 1
}

Write-Host "[✓] Node.js $nodeVersion detected" -ForegroundColor Green

# Install directory
$installDir = "$env:USERPROFILE\Documents\snip-win"
$exists = Test-Path "$installDir\package.json"

if ($exists) {
    Write-Host "[i] SnipWin already installed at: $installDir" -ForegroundColor Yellow
    $update = Read-Host "Update to latest version? (y/n)"
    if ($update -ne "y") {
        Write-Host "[✓] Skipping update. Run 'npm start' in $installDir to launch." -ForegroundColor Green
        exit 0
    }
} else {
    # Clone or download
    Write-Host "[→] Installing SnipWin..." -ForegroundColor Cyan

    if (Get-Command git -ErrorAction SilentlyContinue) {
        git clone https://github.com/nirnimesz/snip-win.git "$installDir" 2>&1 | Out-Null
    } else {
        # Fallback: download zip
        $zipPath = "$env:TEMP\snip-win.zip"
        Invoke-WebRequest -Uri "https://github.com/nirnimesz/snip-win/archive/refs/heads/main.zip" -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP" -Force
        Move-Item "$env:TEMP\snip-win-main" "$installDir" -Force
        Remove-Item $zipPath -Force
    }
}

# Install dependencies
Set-Location $installDir
Write-Host "[→] Installing dependencies..." -ForegroundColor Cyan
npm install --no-audit --no-fund 2>&1 | Out-Null

Write-Host "[✓] SnipWin installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  Quick Start:" -ForegroundColor Cyan
Write-Host "  ───────────" -ForegroundColor Cyan
Write-Host "  1. Launch:  cd $installDir" -ForegroundColor White
Write-Host "              npm start" -ForegroundColor White
Write-Host ""
Write-Host "  2. CLI:     node src/cli/snip-win.js --help" -ForegroundColor White
Write-Host ""
Write-Host "  3. Setup AI integration:" -ForegroundColor White
Write-Host "              node scripts/setup.js" -ForegroundColor White
Write-Host ""

# Run setup
$setup = Read-Host "Configure AI CLI integrations now? (y/n)"
if ($setup -eq "y") {
    node scripts/setup.js
}
