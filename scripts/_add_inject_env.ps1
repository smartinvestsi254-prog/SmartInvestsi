$ErrorActionPreference = "Stop"
$p = Join-Path $PSScriptRoot "..\package.json"
$s = [IO.File]::ReadAllText($p)
if ($s.Contains('inject:env')) {
  Write-Output 'already present'
  exit 0
}
$marker = '"build:functions": "tsc -p netlify/tsconfig.json"'
if (-not $s.Contains($marker)) {
  Write-Output 'marker not found'
  exit 1
}
$s = $s.Replace($marker, $marker + ',"inject:env": "node scripts/inject-public-env.js"')
[IO.File]::WriteAllText($p, $s)
Write-Output 'done'

