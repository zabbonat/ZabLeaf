<#
.SYNOPSIS
    Installs a LaTeX engine for ZabbLeaf on Windows.

.DESCRIPTION
    ZabbLeaf runs without LaTeX: Overleaf compiles in the browser and the quick
    preview needs nothing installed. A local engine is only needed to build real
    PDFs offline, so it is a separate, optional step.

    This installs MiKTeX Basic (~142 MB) plus the one package a fresh MiKTeX is
    missing before it can compile a typical document:

      * cm-super       - scalable Type1 Computer Modern fonts. Without them any
                         document using \usepackage[T1]{fontenc} fails with
                         "auto expansion is only possible with scalable fonts".

    The same thing is available inside ZabbLeaf: the home screen offers to
    install LaTeX when no engine is found.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File install-latex.ps1
#>

[CmdletBinding()]
param(
    [switch] $Force
)

$ErrorActionPreference = 'Stop'

function Find-PdfLatex {
    $onPath = Get-Command pdflatex -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }

    $candidates = @(
        "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe",
        "C:\Program Files\MiKTeX\miktex\bin\x64\pdflatex.exe"
    ) + (Get-ChildItem "C:\texlive" -Directory -ErrorAction SilentlyContinue |
         ForEach-Object { Join-Path $_.FullName "bin\windows\pdflatex.exe" })

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) { return $candidate }
    }
    return $null
}

$existing = Find-PdfLatex
if ($existing -and -not $Force) {
    Write-Host "LaTeX is already installed: $existing" -ForegroundColor Green
    Write-Host "Re-run with -Force to configure it again."
    exit 0
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Warning "winget is not available. Install MiKTeX manually: https://miktex.org/download"
    exit 1
}

Write-Host "Installing MiKTeX Basic (~142 MB). This takes a few minutes..." -ForegroundColor Cyan
winget install --id MiKTeX.MiKTeX --scope user --silent `
    --accept-package-agreements --accept-source-agreements --disable-interactivity

$pdflatex = Find-PdfLatex
if (-not $pdflatex) {
    Write-Warning "MiKTeX was installed but pdflatex could not be found. Sign out and back in, then re-run this script."
    exit 1
}

$bin = Split-Path $pdflatex -Parent
Write-Host "Installing scalable Computer Modern fonts (cm-super)..." -ForegroundColor Cyan
& "$bin\mpm.exe" --install=cm-super | Out-Null
& "$bin\initexmf.exe" --update-fndb | Out-Null

Write-Host ""
Write-Host "Done. $(& $pdflatex --version | Select-Object -First 1)" -ForegroundColor Green
Write-Host "Restart ZabbLeaf and pick a local engine in the compiler menu."
