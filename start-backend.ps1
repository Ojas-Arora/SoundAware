<#
start-backend.ps1

Helper script to reliably start the Flask backend with ffmpeg available on PATH.
Usage: from the repo root in PowerShell run: .\start-backend.ps1

This script will:
- try to locate ffmpeg with `where.exe ffmpeg` and prepend its parent folder to PATH for this session
- fall back to %USERPROFILE%\tools\ffmpeg if not found
- cd into the backend folder and run `python .\app.py`

This avoids having to restart VS Code or re-login after PATH changes.
#>
try {
    $ffmpegExe = (& where.exe ffmpeg) -split "\r?\n" | Where-Object { $_ -ne '' } | Select-Object -First 1
} catch {
    $ffmpegExe = $null
}

if ($ffmpegExe) {
    $ffmpegDir = Split-Path $ffmpegExe -Parent
} else {
    $ffmpegDir = Join-Path $env:USERPROFILE 'tools\ffmpeg'
}

Write-Host "Using ffmpeg dir: $ffmpegDir"

if (Test-Path $ffmpegDir) {
    # Prepend to PATH for this session so python process sees it
    $env:PATH = "$ffmpegDir;$env:PATH"
    Write-Host "Prepended $ffmpegDir to PATH for this session"
} else {
    Write-Warning "ffmpeg directory not found: $ffmpegDir. Ensure ffmpeg is installed or update the script with the correct path."
}

# Move to backend and run
Push-Location -LiteralPath (Join-Path $PSScriptRoot 'backend')
Write-Host "Starting backend from: $PWD"

# Run python app.py and keep the process in this terminal
python .\app.py

Pop-Location
