# 바탕화면 바로가기용. 에디터 서버를 켜고(이미 떠 있으면 그대로) 브라우저를 연다.

$root = Split-Path -Parent $PSScriptRoot
$port = 4322

$running = $false
try {
    $res = Invoke-WebRequest "http://127.0.0.1:$port/api/status" -TimeoutSec 1 -UseBasicParsing
    $running = $res.StatusCode -eq 200
} catch {}

if (-not $running) {
    Start-Process powershell -ArgumentList @(
        '-NoExit', '-Command',
        "Set-Location '$root'; npm run write"
    ) -WindowStyle Minimized

    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $res = Invoke-WebRequest "http://127.0.0.1:$port/api/status" -TimeoutSec 1 -UseBasicParsing
            if ($res.StatusCode -eq 200) { break }
        } catch {}
    }
}

Start-Process "http://localhost:$port"
