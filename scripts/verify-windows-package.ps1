param(
  [string]$DistDir = "desktop-dist",
  [ValidateSet("NotSigned", "Valid")]
  [string]$ExpectedSignature = "NotSigned"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

trap {
  $Message = $_.Exception.Message.Replace("%", "%25").Replace("`r", "%0D").Replace("`n", "%0A")
  Write-Host "::error title=Windows package verification failed::$Message"
  exit 1
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ResolvedDist = (Resolve-Path -LiteralPath (Join-Path $ProjectRoot $DistDir)).Path
$SmokeSource = Join-Path ([System.IO.Path]::GetTempPath()) "phase360-smoke-report.json"

function Get-SingleFile {
  param(
    [string]$Directory,
    [string]$Filter,
    [string]$Description
  )

  $Files = @(Get-ChildItem -LiteralPath $Directory -File -Filter $Filter)
  if ($Files.Count -ne 1) {
    throw "Expected exactly one $Description matching '$Filter' in '$Directory', found $($Files.Count)."
  }
  return $Files[0]
}

function Get-PeMachine {
  param([string]$Executable)

  $Bytes = [System.IO.File]::ReadAllBytes($Executable)
  if ($Bytes.Length -lt 64 -or $Bytes[0] -ne 0x4D -or $Bytes[1] -ne 0x5A) {
    throw "'$Executable' is not a valid PE file."
  }
  $PeOffset = [BitConverter]::ToInt32($Bytes, 0x3C)
  if (
    $PeOffset -lt 0 -or
    $PeOffset + 6 -gt $Bytes.Length -or
    $Bytes[$PeOffset] -ne 0x50 -or
    $Bytes[$PeOffset + 1] -ne 0x45 -or
    $Bytes[$PeOffset + 2] -ne 0x00 -or
    $Bytes[$PeOffset + 3] -ne 0x00
  ) {
    throw "'$Executable' has an invalid PE header."
  }
  return [BitConverter]::ToUInt16($Bytes, $PeOffset + 4)
}

function Assert-X64Application {
  param([string]$Executable)

  $Machine = Get-PeMachine -Executable $Executable
  if ($Machine -ne 0x8664) {
    throw "Expected AMD64 application '$Executable', found PE machine 0x$($Machine.ToString('X4'))."
  }
}

function Invoke-DesktopSmoke {
  param(
    [string]$Executable,
    [string]$Label
  )

  if (Test-Path -LiteralPath $SmokeSource) {
    Remove-Item -LiteralPath $SmokeSource -Force
  }
  $Process = Start-Process -FilePath $Executable -ArgumentList "--smoke-test" -PassThru
  $Deadline = [DateTime]::UtcNow.AddSeconds(90)
  while (-not (Test-Path -LiteralPath $SmokeSource) -and [DateTime]::UtcNow -lt $Deadline) {
    Start-Sleep -Milliseconds 250
  }
  if (-not (Test-Path -LiteralPath $SmokeSource)) {
    if (-not $Process.HasExited) {
      $Process.Kill()
    }
    throw "Desktop smoke '$Label' did not create its report within 90 seconds."
  }

  if (-not $Process.HasExited) {
    [void]$Process.WaitForExit(15000)
  }
  if ($Process.HasExited -and $Process.ExitCode -ne 0) {
    throw "Desktop smoke '$Label' exited with code $($Process.ExitCode)."
  }

  $Report = Get-Content -LiteralPath $SmokeSource -Raw | ConvertFrom-Json
  if (
    -not $Report.ok -or
    -not $Report.packaged -or
    $Report.platform -ne "win32" -or
    $Report.architecture -ne "x64"
  ) {
    throw "Desktop smoke '$Label' reported an invalid packaged Windows result."
  }
  $Destination = Join-Path $ResolvedDist "smoke-$Label.json"
  Copy-Item -LiteralPath $SmokeSource -Destination $Destination -Force
  return $Report
}

function Get-SignatureRecord {
  param([System.IO.FileInfo]$File)

  $Signature = Get-AuthenticodeSignature -LiteralPath $File.FullName
  if ($Signature.Status.ToString() -ne $ExpectedSignature) {
    throw "Unexpected Authenticode status for '$($File.Name)': $($Signature.Status). Expected $ExpectedSignature."
  }
  return [ordered]@{
    file = $File.Name
    status = $Signature.Status.ToString()
    subject = if ($null -eq $Signature.SignerCertificate) { $null } else { $Signature.SignerCertificate.Subject }
  }
}

$Installer = Get-SingleFile -Directory $ResolvedDist -Filter "Phase-360-Setup-*-x64.exe" -Description "NSIS installer"
$Portable = Get-SingleFile -Directory $ResolvedDist -Filter "Phase-360-Portable-*-x64.exe" -Description "portable executable"
$UnpackedDirectory = Join-Path $ResolvedDist "win-unpacked"
$UnpackedApp = Get-SingleFile -Directory $UnpackedDirectory -Filter "Phase 360.exe" -Description "unpacked application"

Write-Host "Checking PE headers and Electron fuses."
[void](Get-PeMachine -Executable $Installer.FullName)
[void](Get-PeMachine -Executable $Portable.FullName)
Assert-X64Application -Executable $UnpackedApp.FullName

$FuseReportPath = Join-Path $ResolvedDist "electron-fuses.json"
& node (Join-Path $PSScriptRoot "verify-electron-fuses.mjs") $UnpackedApp.FullName $FuseReportPath
if ($LASTEXITCODE -ne 0) {
  throw "Electron fuse verification failed."
}
$FuseReport = Get-Content -LiteralPath $FuseReportPath -Raw | ConvertFrom-Json

Write-Host "Running win-unpacked smoke."
$UnpackedSmoke = Invoke-DesktopSmoke -Executable $UnpackedApp.FullName -Label "win-unpacked"
Write-Host "Running portable smoke."
$PortableSmoke = Invoke-DesktopSmoke -Executable $Portable.FullName -Label "portable"

$RunnerTemp = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$InstallDirectory = Join-Path $RunnerTemp "phase360-installer-smoke-$PID"
if (Test-Path -LiteralPath $InstallDirectory) {
  throw "Refusing to overwrite existing installer smoke directory '$InstallDirectory'."
}

Write-Host "Installing and running the installed application smoke."
$InstallerProcess = Start-Process -FilePath $Installer.FullName -ArgumentList @("/S", "/D=$InstallDirectory") -Wait -PassThru
if ($InstallerProcess.ExitCode -ne 0) {
  throw "NSIS installer exited with code $($InstallerProcess.ExitCode)."
}
$InstalledApp = Get-SingleFile -Directory $InstallDirectory -Filter "Phase 360.exe" -Description "installed application"
Assert-X64Application -Executable $InstalledApp.FullName
$InstalledSmoke = Invoke-DesktopSmoke -Executable $InstalledApp.FullName -Label "installed"

$Uninstaller = Get-SingleFile -Directory $InstallDirectory -Filter "Uninstall*.exe" -Description "uninstaller"
$UninstallProcess = Start-Process -FilePath $Uninstaller.FullName -ArgumentList "/S" -Wait -PassThru
if ($UninstallProcess.ExitCode -ne 0) {
  throw "NSIS uninstaller exited with code $($UninstallProcess.ExitCode)."
}
$UninstallDeadline = [DateTime]::UtcNow.AddSeconds(15)
while ((Test-Path -LiteralPath $InstalledApp.FullName) -and [DateTime]::UtcNow -lt $UninstallDeadline) {
  Start-Sleep -Milliseconds 250
}
$InstallerUninstalled = -not (Test-Path -LiteralPath $InstalledApp.FullName)
if (-not $InstallerUninstalled) {
  throw "NSIS uninstall left the installed application executable in place."
}

Write-Host "Checking Authenticode status and generating release evidence."
$SignatureRecords = @(
  Get-SignatureRecord -File $Installer
  Get-SignatureRecord -File $Portable
  Get-SignatureRecord -File $UnpackedApp
)

$Artefacts = @($Installer, $Portable) | ForEach-Object {
  $ArtefactFile = $_
  $SignatureRecord = @($SignatureRecords | Where-Object { $_.file -eq $ArtefactFile.Name })
  if ($SignatureRecord.Count -ne 1) {
    throw "Expected exactly one signature record for '$($ArtefactFile.Name)'."
  }
  $Hash = Get-FileHash -LiteralPath $ArtefactFile.FullName -Algorithm SHA256
  [ordered]@{
    file = $ArtefactFile.Name
    bytes = $ArtefactFile.Length
    sha256 = $Hash.Hash.ToLowerInvariant()
    authenticode = $SignatureRecord[0].status
  }
}

$ChecksumLines = $Artefacts | ForEach-Object { "$($_.sha256)  $($_.file)" }
$ChecksumLines | Set-Content -LiteralPath (Join-Path $ResolvedDist "SHA256SUMS.txt") -Encoding utf8

$RootPackage = Get-Content -LiteralPath (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json
$Commit = (& git -C $ProjectRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or -not $Commit) {
  throw "Unable to resolve the checked-out source commit."
}
if ($env:GITHUB_SHA -and $env:GITHUB_SHA -ne $Commit) {
  throw "Checked-out commit '$Commit' does not match GITHUB_SHA '$($env:GITHUB_SHA)'."
}
$Verification = [ordered]@{
  schemaVersion = 1
  verifiedAtUtc = [DateTime]::UtcNow.ToString("o")
  sourceCommit = $Commit
  applicationVersion = $RootPackage.version
  target = [ordered]@{
    platform = "win32"
    architecture = "x64"
    runnerImage = $env:ImageOS
    runnerVersion = $env:ImageVersion
  }
  toolchain = [ordered]@{
    node = (& node --version).Trim()
    electron = $RootPackage.devDependencies.electron
    electronBuilder = $RootPackage.devDependencies."electron-builder"
  }
  signingPolicy = [ordered]@{
    expected = $ExpectedSignature
    publicPromotionEligible = $ExpectedSignature -eq "Valid"
    note = if ($ExpectedSignature -eq "Valid") { "Authenticode signature verified." } else { "Unsigned internal test artefact. SHA-256 is not a publisher signature." }
  }
  dependencyAudit = "passed"
  artefacts = $Artefacts
  signatures = $SignatureRecords
  fuses = $FuseReport
  smoke = [ordered]@{
    winUnpacked = $UnpackedSmoke
    portable = $PortableSmoke
    installed = $InstalledSmoke
    installerUninstalled = $InstallerUninstalled
  }
}

$Verification | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $ResolvedDist "windows-verification.json") -Encoding utf8
Write-Host "Windows package verification passed for commit $Commit."
