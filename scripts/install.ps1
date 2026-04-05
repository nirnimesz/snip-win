# ───────────────────────────────────────────────────────────
# SnipWin Installer — PowerShell
# Usage: irm https://raw.githubusercontent.com/nirnimesz/snip-win/main/scripts/install.ps1 | iex
# ───────────────────────────────────────────────────────────

$ErrorActionPreference = "Continue"

function Write-Step($msg) {
    Write-Host "[→] $msg" -ForegroundColor Cyan
}
function Write-Ok($msg) {
    Write-Host "[✓] $msg" -ForegroundColor Green
}
function Write-Warn($msg) {
    Write-Host "[!] $msg" -ForegroundColor Yellow
}
function Write-Err($msg) {
    Write-Host "[✗] $msg" -ForegroundColor Red
}

# ── Banner ──
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║        SnipWin v4.0 — Installer         ║" -ForegroundColor Cyan
Write-Host "  ║  Visual Review + 16 Developer Tools     ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Check Node.js ──
Write-Step "Checking Node.js..."
$nodeVersion = $null
try { $nodeVersion = (node --version).Trim() } catch {}

if (-not $nodeVersion) {
    Write-Err "Node.js is required but not installed."
    Write-Host ""
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    $open = Read-Host "Open download page? (y/n)"
    if ($open -eq "y") { Start-Process "https://nodejs.org/" }
    exit 1
}
Write-Ok "Node.js $nodeVersion detected"

# ── Check Git ──
$hasGit = $false
try { $hasGit = [bool](Get-Command git -ErrorAction SilentlyContinue) } catch {}

# ── Install Directory ──
$installDir = "$env:USERPROFILE\Documents\snip-win"
$exists = Test-Path "$installDir\package.json"

if ($exists) {
    # Read current version
    $currentVersion = "unknown"
    try {
        $pkg = Get-Content "$installDir\package.json" -Raw | ConvertFrom-Json
        $currentVersion = $pkg.version
    } catch {}

    Write-Warn "SnipWin v$currentVersion already installed at:"
    Write-Host "    $installDir" -ForegroundColor Gray
    Write-Host ""
    $update = Read-Host "Update to latest version? (y/n)"

    if ($update -ne "y") {
        Write-Ok "Keeping v$currentVersion"
        Write-Host ""
        Write-Host "  To launch: cd $installDir" -ForegroundColor White
        Write-Host "             npm start" -ForegroundColor White
        Write-Host ""
        exit 0
    }

    # Update
    Write-Host ""
    Write-Step "Updating SnipWin..."
    Set-Location $installDir

    if ($hasGit) {
        git fetch origin main 2>&1 | Out-Null
        git reset --hard origin/main 2>&1 | Out-Null
        Write-Ok "Updated to latest version"
    } else {
        Write-Warn "Git not found. Re-downloading..."
        Remove-Item "$installDir\*" -Recurse -Force -ErrorAction SilentlyContinue
        $zipPath = "$env:TEMP\snip-win.zip"
        Invoke-WebRequest -Uri "https://github.com/nirnimesz/snip-win/archive/refs/heads/main.zip" -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP" -Force
        Copy-Item "$env:TEMP\snip-win-main\*" "$installDir" -Recurse -Force
        Remove-Item $zipPath -Force
        Remove-Item "$env:TEMP\snip-win-main" -Recurse -Force
        Write-Ok "Re-downloaded latest version"
    }
} else {
    # Fresh install
    Write-Step "Downloading SnipWin..."

    if ($hasGit) {
        git clone --depth 1 https://github.com/nirnimesz/snip-win.git "$installDir" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Downloaded successfully"
        } else {
            Write-Err "Git clone failed. Trying zip download..."
            $hasGit = $false
        }
    }

    if (-not $hasGit) {
        Write-Step "Downloading via zip..."
        $zipPath = "$env:TEMP\snip-win.zip"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://github.com/nirnimesz/snip-win/archive/refs/heads/main.zip" -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP" -Force
        Move-Item "$env:TEMP\snip-win-main" "$installDir" -Force
        Remove-Item $zipPath -Force
        Write-Ok "Downloaded successfully"
    }

    Set-Location $installDir
}

# ── Install Dependencies ──
Write-Host ""
Write-Step "Installing dependencies (this may take a minute)..."

# Show progress: run npm and capture output, display dots as spinner
$job = Start-Job -ScriptBlock {
    Set-Location $args[0]
    $env:FORCE_COLOR = "0"
    $result = & npm install --no-audit --no-fund 2>&1
    $exitCode = $LASTEXITCODE
    return @{ Output = ($result -join "`n"); ExitCode = $exitCode }
} -ArgumentList $installDir

# Show spinner while waiting
$spinner = @('⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏')
$i = 0
while ($job.State -eq 'Running') {
    Write-Host "`r  $($spinner[$i % $spinner.Length]) Installing packages..." -NoNewline -ForegroundColor Cyan
    Start-Sleep -Milliseconds 150
    $i++
}

# Get result
$result = Receive-Job -Job $job
Remove-Job -Job $job

Write-Host "`r  ✓ Dependencies installed                    " -ForegroundColor Green

# Check for errors
if ($result -match "error") {
    Write-Warn "npm reported some warnings (these are usually safe to ignore)"
}

# ── Read installed version ──
$installedVersion = "unknown"
try {
    $pkg = Get-Content "$installDir\package.json" -Raw | ConvertFrom-Json
    $installedVersion = $pkg.version
} catch {}

# ── Success ──
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║         Installation Complete!            ║" -ForegroundColor Green
Write-Host "  ║         SnipWin v$installedVersion               ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Installed to: $installDir" -ForegroundColor Gray
Write-Host ""
Write-Host "  Quick Start:" -ForegroundColor Cyan
Write-Host "  ───────────" -ForegroundColor Cyan
Write-Host "  1. Launch:" -ForegroundColor White
Write-Host "     cd $installDir" -ForegroundColor Gray
Write-Host "     npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. CLI:" -ForegroundColor White
Write-Host "     node src\cli\snip-win.js --help" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Setup AI integration:" -ForegroundColor White
Write-Host "     node scripts\setup.js" -ForegroundColor Gray
Write-Host ""

# ── Optional: Run Setup ──
$setup = Read-Host "Configure AI CLI integrations now? (y/n)"
if ($setup -eq "y") {
    Write-Host ""
    node scripts\setup.js
}
