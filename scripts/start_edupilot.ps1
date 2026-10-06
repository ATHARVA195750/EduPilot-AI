# EduPilot Development Server Launcher
param(
    [switch]$NoBrowser,   # do not open the default browser (scripted QA runs)
    [switch]$NoMonitor    # exit after startup instead of blocking in the monitor loop
)
$ErrorActionPreference = "Stop"
$Automation = ($NoBrowser -or $NoMonitor)

# 1. Locate project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = (Resolve-Path "$scriptDir\..").Path
Set-Location $projectRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "            EDUPILOT DEV SERVER LAUNCHER                " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "[*] Project Root: $projectRoot" -ForegroundColor Gray

# Ensure logs directory exists
$logDir = Join-Path $projectRoot "logs"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$backendLog = Join-Path $logDir "backend.log"
$backendErrLog = Join-Path $logDir "backend_error.log"
$frontendLog = Join-Path $logDir "frontend.log"
$frontendErrLog = Join-Path $logDir "frontend_error.log"

# 2. Locate Python Virtual Environment
$venvPath = $null
$possibleVenvs = @(
    (Join-Path $projectRoot ".venv"),
    (Join-Path $projectRoot "venv"),
    (Join-Path $projectRoot "env")
)

foreach ($path in $possibleVenvs) {
    $pythonExe = Join-Path $path "Scripts\python.exe"
    if (Test-Path $pythonExe) {
        $venvPath = $path
        break
    }
}

if (-not $venvPath) {
    Write-Host "[ERROR] Python virtual environment not found!" -ForegroundColor Red
    Write-Host "Checked locations: .venv, venv, env" -ForegroundColor Yellow
    Write-Host "Please create a virtual environment first, e.g.:" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv" -ForegroundColor White
    Write-Host "  .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt" -ForegroundColor White
    Write-Host ""
    if (-not $Automation) { Read-Host "Press Enter to exit..." }
    exit 1
}

$venvPython = Join-Path $venvPath "Scripts\python.exe"
Write-Host "[+] Found Python environment: $venvPython" -ForegroundColor Green

# 3. Verify Backend Dependencies
Write-Host "[*] Verifying backend dependencies..." -ForegroundColor Gray
$pythonCheckCmd = "import uvicorn, fastapi, sqlalchemy, pydantic; print('OK')"
$depCheck = & $venvPython -c $pythonCheckCmd 2>&1
$depCheckOutput = ($depCheck | Out-String).Trim()

if ($depCheckOutput -ne "OK") {
    Write-Host "[ERROR] Missing required backend dependencies in virtual environment." -ForegroundColor Red
    Write-Host "Error details: $depCheckOutput" -ForegroundColor Red
    Write-Host "Please run the following command to install dependencies safely:" -ForegroundColor Yellow
    Write-Host "  $venvPython -m pip install -r backend\requirements.txt" -ForegroundColor White
    Write-Host ""
    if (-not $Automation) { Read-Host "Press Enter to exit..." }
    exit 1
}
Write-Host "[+] Backend dependencies verified." -ForegroundColor Green

# Helper function to check if HTTP endpoint responds
function Test-Endpoint {
    param([string]$url)
    try {
        $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        return ($res.StatusCode -eq 200)
    } catch {
        return $false
    }
}

# Frontend sanity check: the endpoint on 5173 must be OUR Vite app
# (serves the React mount point), not an unrelated process squatting the port.
function Test-Frontend {
    try {
        $res = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        return (($res.StatusCode -eq 200) -and ($res.Content -match 'id="root"'))
    } catch {
        return $false
    }
}

# Kill ONLY the process LISTENing on the given port. Never touches the other
# service: a frontend-port cleanup must not take the backend down (and vice
# versa) — that exact bug produced browser "Failed to fetch" on /login.
function Stop-PortOwner {
    param([int]$Port)
    $owners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
              Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $owners) {
        if ($procId -and $procId -ne 0) {
            try {
                Stop-Process -Id $procId -Force -ErrorAction Stop
                Write-Host "    Stopped PID $procId (was listening on port $Port)." -ForegroundColor DarkGray
            } catch {
                Write-Host "    Could not stop PID $procId on port $Port : $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
}

# If the required port cannot be freed, fail loudly. The port is NEVER
# silently changed (backend CORS only trusts port 5173).
function Assert-PortFree {
    param([int]$Port, [string]$What)
    $still = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($still) {
        $pids = (($still | Select-Object -ExpandProperty OwningProcess -Unique) -join ', ')
        Write-Host "[ERROR] Port $Port is still occupied by PID(s): $pids." -ForegroundColor Red
        Write-Host "        $What requires exactly port $Port. It will NOT be moved to another port." -ForegroundColor Yellow
        Write-Host "        Free port $Port manually, then re-run this launcher." -ForegroundColor Yellow
        if (-not $Automation) { Read-Host "Press Enter to exit..." }
        exit 1
    }
}

# 4. Check & Start Backend (Port 8000)
$backendPort = 8000
$backendUrl = "http://127.0.0.1:$backendPort"
$backendHealthUrl = "$backendUrl/health"

$backendAlreadyRunning = (Test-Endpoint $backendHealthUrl) -or (Test-Endpoint "$backendUrl/api/v1/health")

if ($backendAlreadyRunning) {
    Write-Host "[+] Backend is ALREADY running on $backendUrl" -ForegroundColor Yellow
} else {
    # Check if port 8000 is occupied by a non-responsive process.
    # Stop ONLY the listener on port 8000 — never call the global stop script
    # here (it also kills 5173, i.e. the frontend we are about to start).
    $existingPort8000 = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue
    if ($existingPort8000) {
        Write-Host "[*] Port $backendPort is occupied by a non-responsive process. Stopping ONLY the port $backendPort listener..." -ForegroundColor Yellow
        Stop-PortOwner -Port $backendPort
        Start-Sleep -Seconds 1
        Assert-PortFree -Port $backendPort -What "FastAPI backend"
    }

    Write-Host "[*] Starting FastAPI Backend on port $backendPort..." -ForegroundColor Cyan
    $backendDir = Join-Path $projectRoot "backend"
    
    # Empty old logs
    "" | Out-File -FilePath $backendLog -Encoding utf8
    "" | Out-File -FilePath $backendErrLog -Encoding utf8

    # Launch Uvicorn process in background with unbuffered python (-u).
    # NOTE: no --reload. The reloader spawns a second worker that competes
    # for port 8000 and produces WinError 10048 ("only one usage of each
    # socket address"), leaving the backend DEAD while the launcher reports
    # success — the browser then shows "Failed to fetch" on /login.
    # Single deterministic worker: fail loudly instead of double-binding.
    Start-Process -FilePath $venvPython `
        -ArgumentList "-u -m uvicorn app.main:app --host 127.0.0.1 --port $backendPort" `
        -WorkingDirectory $backendDir `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError $backendErrLog `
        -WindowStyle Hidden

    # Wait for backend health check
    Write-Host "[*] Waiting for backend to respond at $backendHealthUrl..." -NoNewline -ForegroundColor Gray
    $startTime = Get-Date
    $timeoutSec = 30
    $backendSuccess = $false

    while (((Get-Date) - $startTime).TotalSeconds -lt $timeoutSec) {
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline -ForegroundColor Gray
        if ((Test-Endpoint $backendHealthUrl) -or (Test-Endpoint "$backendUrl/api/v1/health")) {
            $backendSuccess = $true
            break
        }
    }
    Write-Host ""

    if (-not $backendSuccess) {
        Write-Host "[ERROR] Backend failed to respond within $timeoutSec seconds!" -ForegroundColor Red
        if (Test-Path $backendErrLog) {
            Write-Host "--- Backend Error Log ($backendErrLog) ---" -ForegroundColor Yellow
            Get-Content $backendErrLog -Tail 25
            Write-Host "----------------------------------------" -ForegroundColor Yellow
        }
        if (Test-Path $backendLog) {
            Write-Host "--- Backend Stdout Log ($backendLog) ---" -ForegroundColor Yellow
            Get-Content $backendLog -Tail 25
            Write-Host "----------------------------------------" -ForegroundColor Yellow
        }
        if (-not $Automation) { Read-Host "Press Enter to exit..." }
        exit 1
    }
    Write-Host "[+] Backend started successfully on $backendUrl" -ForegroundColor Green
}

# 5. Check & Start Frontend (Port 5173)
$frontendPort = 5173
$frontendUrl = "http://localhost:$frontendPort"
$loginUrl = "$frontendUrl/login"

$frontendAlreadyRunning = Test-Frontend

if ($frontendAlreadyRunning) {
    Write-Host "[+] Frontend is ALREADY running on $frontendUrl" -ForegroundColor Yellow
} else {
    # Check node_modules
    if (!(Test-Path (Join-Path $projectRoot "node_modules"))) {
        Write-Host "[ERROR] node_modules directory not found in project root!" -ForegroundColor Red
        Write-Host "Please run 'npm install' in project root." -ForegroundColor Yellow
        if (-not $Automation) { Read-Host "Press Enter to exit..." }
        exit 1
    }

    # Check if port 5173 is occupied by a non-responsive / foreign process.
    # Stop ONLY the listener on port 5173. Calling the global stop script here
    # would also kill port 8000 — the backend we just started — leaving the
    # login page loading with every API call failing ("Failed to fetch").
    $existingPort5173 = Get-NetTCPConnection -LocalPort $frontendPort -State Listen -ErrorAction SilentlyContinue
    if ($existingPort5173) {
        Write-Host "[*] Port $frontendPort is occupied by a non-responsive process. Stopping ONLY the port $frontendPort listener..." -ForegroundColor Yellow
        Stop-PortOwner -Port $frontendPort
        Start-Sleep -Seconds 1
        Assert-PortFree -Port $frontendPort -What "Vite frontend (backend CORS only allows port $frontendPort)"
    }

    Write-Host "[*] Starting Vite Frontend on port $frontendPort..." -ForegroundColor Cyan
    
    # Empty old logs
    "" | Out-File -FilePath $frontendLog -Encoding utf8
    "" | Out-File -FilePath $frontendErrLog -Encoding utf8

    # Launch Vite dev server
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c npm run dev -- --port $frontendPort" `
        -WorkingDirectory $projectRoot `
        -RedirectStandardOutput $frontendLog `
        -RedirectStandardError $frontendErrLog `
        -WindowStyle Hidden

    # Wait for frontend endpoint
    Write-Host "[*] Waiting for frontend to respond at $frontendUrl..." -NoNewline -ForegroundColor Gray
    $startTime = Get-Date
    $timeoutSec = 30
    $frontendSuccess = $false

    while (((Get-Date) - $startTime).TotalSeconds -lt $timeoutSec) {
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline -ForegroundColor Gray
        if (Test-Endpoint $frontendUrl) {
            $frontendSuccess = $true
            break
        }
    }
    Write-Host ""

    if (-not $frontendSuccess) {
        Write-Host "[ERROR] Frontend failed to respond within $timeoutSec seconds!" -ForegroundColor Red
        if (Test-Path $frontendErrLog) {
            Write-Host "--- Frontend Error Log ($frontendErrLog) ---" -ForegroundColor Yellow
            Get-Content $frontendErrLog -Tail 25
            Write-Host "-----------------------------------------" -ForegroundColor Yellow
        }
        if (Test-Path $frontendLog) {
            Write-Host "--- Frontend Stdout Log ($frontendLog) ---" -ForegroundColor Yellow
            Get-Content $frontendLog -Tail 25
            Write-Host "-----------------------------------------" -ForegroundColor Yellow
        }
        if (-not $Automation) { Read-Host "Press Enter to exit..." }
        exit 1
    }
    Write-Host "[+] Frontend started successfully on $frontendUrl" -ForegroundColor Green
}

# 5b. Final integrity check — exactly ONE backend AND ONE frontend must be up.
# (A frontend-start cleanup must never be allowed to leave the backend dead:
#  that is what produced "Failed to fetch" on the browser login page.)
$backendHealthy = (Test-Endpoint $backendHealthUrl) -or (Test-Endpoint "$backendUrl/api/v1/health")
if (-not $backendHealthy) {
    Write-Host "[ERROR] Backend on port $backendPort is NOT responding after startup." -ForegroundColor Red
    Write-Host "        Browser login would fail with 'Failed to fetch'. Check:" -ForegroundColor Yellow
    Write-Host "        $backendErrLog" -ForegroundColor Yellow
    Write-Host "        $backendLog" -ForegroundColor Yellow
    if (-not $Automation) { Read-Host "Press Enter to exit..." }
    exit 1
}
if (-not (Test-Frontend)) {
    Write-Host "[ERROR] Frontend on port $frontendPort is NOT responding after startup." -ForegroundColor Red
    if (-not $Automation) { Read-Host "Press Enter to exit..." }
    exit 1
}
Write-Host "[+] Integrity check passed: 1 backend ($backendPort) + 1 frontend ($frontendPort)." -ForegroundColor Green

# 6. Open Login Page in Default Browser
if (-not $NoBrowser) {
    Write-Host "[*] Opening EduPilot login page in default browser: $loginUrl" -ForegroundColor Cyan
    Start-Process $loginUrl
}

# 7. Display Status Dashboard
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "         EDUPILOT IS RUNNING SUCCESSFULLY!             " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Backend API:   $backendUrl" -ForegroundColor White
Write-Host "  Health Check:  $backendUrl/health" -ForegroundColor White
Write-Host "  API Health:    $backendUrl/api/v1/health" -ForegroundColor White
Write-Host "  API Docs:      $backendUrl/docs" -ForegroundColor White
Write-Host "  Frontend:      $loginUrl" -ForegroundColor White
Write-Host "  Backend Log:   $backendLog" -ForegroundColor Gray
Write-Host "  Frontend Log:  $frontendLog" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  To stop EduPilot, run STOP_EDUPILOT.bat or press 'q'" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

if ($NoMonitor) {
    Write-Host "[*] -NoMonitor supplied: startup complete, skipping monitor loop." -ForegroundColor Gray
    exit 0
}

# 8. Monitor loop — watches BOTH services so a dead backend is reported
# immediately (instead of surfacing later as "Failed to fetch" on /login).
Write-Host "[*] Monitoring backend ($backendPort) and frontend ($frontendPort). Press 'q' to stop both." -ForegroundColor Cyan
$backendUp = $true
$frontendUp = $true
$backendDownSince = $null
$frontendDownSince = $null

while ($true) {
    $stopTriggered = $false
    try {
        if ([console]::KeyAvailable) {
            $key = [console]::ReadKey($true)
            if ($key.KeyChar -eq 'q' -or $key.KeyChar -eq 'Q') {
                $stopTriggered = $true
            }
        }
    } catch {
        # Non-interactive console, continue monitoring silently
    }

    if ($stopTriggered) {
        Write-Host "[*] Stopping EduPilot servers..." -ForegroundColor Yellow
        & "$scriptDir\stop_edupilot.ps1"
        break
    }

    $bOk = (Test-Endpoint $backendHealthUrl) -or (Test-Endpoint "$backendUrl/api/v1/health")
    $fOk = Test-Frontend

    if (-not $bOk) {
        if ($backendUp) {
            $backendUp = $false
            $backendDownSince = Get-Date
            Write-Host "[ERROR] $(Get-Date -Format 'HH:mm:ss') Backend on port $backendPort stopped responding! Browser logins will show 'Failed to fetch'." -ForegroundColor Red
            Write-Host "        Logs: $backendErrLog | $backendLog" -ForegroundColor Yellow
        } elseif (((Get-Date) - $backendDownSince).TotalSeconds -ge 60) {
            $backendDownSince = Get-Date
            Write-Host "[ERROR] $(Get-Date -Format 'HH:mm:ss') Backend on port $backendPort still down. Logs: $backendErrLog" -ForegroundColor Red
        }
    } elseif (-not $backendUp) {
        $backendUp = $true
        Write-Host "[+] $(Get-Date -Format 'HH:mm:ss') Backend recovered on port $backendPort." -ForegroundColor Green
    }

    if (-not $fOk) {
        if ($frontendUp) {
            $frontendUp = $false
            $frontendDownSince = Get-Date
            Write-Host "[ERROR] $(Get-Date -Format 'HH:mm:ss') Frontend on port $frontendPort stopped responding!" -ForegroundColor Red
            Write-Host "        Logs: $frontendLog | $frontendErrLog" -ForegroundColor Yellow
        } elseif (((Get-Date) - $frontendDownSince).TotalSeconds -ge 60) {
            $frontendDownSince = Get-Date
            Write-Host "[ERROR] $(Get-Date -Format 'HH:mm:ss') Frontend on port $frontendPort still down. Logs: $frontendLog" -ForegroundColor Red
        }
    } elseif (-not $frontendUp) {
        $frontendUp = $true
        Write-Host "[+] $(Get-Date -Format 'HH:mm:ss') Frontend recovered on port $frontendPort." -ForegroundColor Green
    }

    Start-Sleep -Seconds 5
}
