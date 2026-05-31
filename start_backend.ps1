# Kill any stale backend processes before starting
Write-Host "Stopping any existing backend processes..."
Get-Process | Where-Object { $_.Path -like "*JME*backend*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait for port 8000 to be free
$maxWait = 10
$waited = 0
while ($waited -lt $maxWait) {
    $listening = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if (-not $listening) { break }
    $pids = ($listening | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique) -join ", "
    $alive = $pids | ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }
    if (-not $alive) { break }  # only ghost sockets remain
    Write-Host "Waiting for port 8000 to clear (PIDs: $pids)..."
    Start-Sleep 1
    $waited++
}

Set-Location "C:\Users\vilap\Desktop\Projects-root\2026_Projects\JME\backend"

# NOTE: On Windows, uvicorn --reload switches to a selector loop policy that
# breaks Playwright subprocess launching used by scrapers. Keep reload off by
# default so /api/jobs fresh-scrape works reliably.
$enableReload = $env:JME_BACKEND_RELOAD -eq "1"
if ($enableReload) {
    Write-Host "Starting backend with reload enabled (JME_BACKEND_RELOAD=1)..."
    .\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
} else {
    Write-Host "Starting backend without reload (default for scraper stability)..."
    .\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
}
