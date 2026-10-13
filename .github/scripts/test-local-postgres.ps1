param([Parameter(Mandatory = $true)][string]$PostgresBin)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$bin = (Resolve-Path -LiteralPath $PostgresBin).Path
# PostgreSQL Windows tools can encode non-ASCII installation/data paths as ANSI.
$filesystem = New-Object -ComObject Scripting.FileSystemObject
$bin = $filesystem.GetFolder($bin).ShortPath
$root = $filesystem.GetFolder((Join-Path $repo '.git')).ShortPath
$data = Join-Path $root ('integration-postgres/data-' + [guid]::NewGuid().ToString('N'))
if (Get-NetTCPConnection -LocalPort 54329 -ErrorAction SilentlyContinue) { throw 'Port 54329 is already occupied; no existing database will be used.' }
$started = $false
function Run-Native([string]$Program, [string[]]$Arguments) {
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Program exited with $LASTEXITCODE" }
}
$names = @('DATABASE_URL', 'CI', 'LOCAL_DISPOSABLE_DATABASE', 'AI_BUDGET_TEST', 'NOTICE_RETENTION_TEST', 'PUSH_DELIVERY_TEST')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
  Set-Location -LiteralPath $repo
  Run-Native (Join-Path $bin 'initdb.exe') @('-D', $data, '-U', 'vox', '-A', 'trust', '-E', 'UTF8', '--locale=C', '--no-sync')
  # This cluster is exclusive to this run; trust is restricted to loopback by the listener.
  Run-Native (Join-Path $bin 'pg_ctl.exe') @('-D', $data, '-l', (Join-Path $data 'server.log'), '-o', '-h 127.0.0.1 -p 54329 -c shared_buffers=16MB -c max_connections=20', '-w', 'start')
  $started = $true
  Run-Native (Join-Path $bin 'createdb.exe') @('-h', '127.0.0.1', '-p', '54329', '-U', 'vox', 'voxcelular')
  $env:DATABASE_URL = 'postgresql://vox:ci-only-password@127.0.0.1:54329/voxcelular'
  $env:CI = 'true'
  $env:LOCAL_DISPOSABLE_DATABASE = 'vox-local-postgres'
  $env:AI_BUDGET_TEST = 'local-disposable'
  $env:NOTICE_RETENTION_TEST = 'local-disposable'
  $env:PUSH_DELIVERY_TEST = 'local-disposable'
  Run-Native 'npx.cmd' @('prisma', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma')
  Run-Native 'npm.cmd' @('run', 'build', '--workspace', '@vox/api')
  Run-Native 'node' @('.github/scripts/test-mobile-association.mjs')
  foreach ($test in @('disposableDatabase.test', 'aiBudget.test', 'notificationRetention.integration.test', 'notificationDeliveryClaim.integration.test')) {
    Run-Native 'node' @("apps/api/dist/lib/$test.js")
  }
  Run-Native 'node' @('.github/scripts/test-api-local.mjs')
} finally {
  try {
    if ($started) { Run-Native (Join-Path $bin 'pg_ctl.exe') @('-D', $data, '-m', 'fast', '-w', 'stop') }
  } finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
  }
}
