# EduPilot Stop Script
$ErrorActionPreference = "SilentlyContinue"

Write-Host "[*] Stopping EduPilot services on ports 8000 and 5173..." -ForegroundColor Cyan

function Stop-PortProcess {
    param([int]$port)
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            if ($pidToKill -and $pidToKill -ne 0 -and $pidToKill -ne 4) {
                $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "[*] Terminating process $($proc.ProcessName) (PID: $pidToKill) tree on port $port..." -ForegroundColor Yellow
                    & taskkill /F /T /PID $pidToKill 2>&1 | Out-Null
                }
            }
        }
    }
}

Stop-PortProcess -port 8000
Stop-PortProcess -port 5173

Write-Host "[+] EduPilot services stopped successfully." -ForegroundColor Green
