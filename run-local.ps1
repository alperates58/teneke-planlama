param(
    [int]$Port = 3000,
    [switch]$SingleRequest
)

$listener = New-Object System.Net.HttpListener
try {
    $listener.Prefixes.Add("http://localhost:$Port/")
} catch {}

try {
    $listener.Prefixes.Add("http://127.0.0.1:$Port/")
} catch {}

try {
    $listener.Start()
    Write-Host "Teneke Planlama yerel web sunucusu aktif: http://127.0.0.1:$Port/ ve http://localhost:$Port/" -ForegroundColor Green

    $baseDir = Join-Path $PSScriptRoot "public"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $filePath = Join-Path $baseDir "index.html"
            $contentType = "text/html; charset=utf-8"
        } elseif ($urlPath -eq "/api/health") {
            $json = '{"status":"healthy","project":"Teneke Planlama","phases_active":[0,1],"time":"' + (Get-Date -Format "o") + '"}'
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.OutputStream.Close()
            if ($SingleRequest) { break }
            continue
        } else {
            $cleanRelative = $urlPath.TrimStart('/')
            $filePath = Join-Path $baseDir $cleanRelative
            if (-not (Test-Path $filePath)) {
                $filePath = Join-Path $baseDir "index.html"
                $contentType = "text/html; charset=utf-8"
            } else {
                if ($filePath.EndsWith(".js")) { $contentType = "application/javascript; charset=utf-8" }
                elseif ($filePath.EndsWith(".css")) { $contentType = "text/css; charset=utf-8" }
                elseif ($filePath.EndsWith(".json")) { $contentType = "application/json; charset=utf-8" }
                elseif ($filePath.EndsWith(".html")) { $contentType = "text/html; charset=utf-8" }
                else { $contentType = "application/octet-stream" }
            }
        }

        if (Test-Path $filePath) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($err, 0, $err.Length)
        }
        $response.OutputStream.Close()

        if ($SingleRequest) { break }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
