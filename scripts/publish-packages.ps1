param(
  [switch]$DryRun,
  [switch]$Yes,
  [string]$Otp,
  [switch]$PromptOtp,
  [switch]$PromptOtpPerPackage,
  [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

$packageOrder = @(
  "shared",
  "core",
  "layouts",
  "animations",
  "preview",
  "plugins"
)

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")

function Invoke-Npm {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & npm @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

function Read-PackageManifest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PackageDir
  )

  $manifestPath = Join-Path $PackageDir "package.json"

  if (-not (Test-Path $manifestPath)) {
    throw "Missing package.json in $PackageDir."
  }

  Get-Content -Raw -Path $manifestPath | ConvertFrom-Json
}

function Publish-Package {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PackageName
  )

  $packageDir = Join-Path $rootDir "packages\$PackageName"
  $manifest = Read-PackageManifest -PackageDir $packageDir
  $displayName = "$($manifest.name)@$($manifest.version)"
  $publishArgs = @("publish", "--access", "public", "--tag", $Tag)

  if ($DryRun) {
    $publishArgs += "--dry-run"
  }

  if ($PromptOtpPerPackage) {
    $script:CurrentOtp = Read-Host "npm OTP for $displayName"
  }

  Write-Host "Publishing $displayName..."

  Push-Location $packageDir
  try {
    if ($script:CurrentOtp) {
      $env:NPM_CONFIG_OTP = $script:CurrentOtp
    }

    Invoke-Npm -Arguments $publishArgs
  } finally {
    Remove-Item Env:\NPM_CONFIG_OTP -ErrorAction SilentlyContinue
    Pop-Location
  }
}

Write-Host "Checking npm authentication..."
Invoke-Npm -Arguments @("whoami")

if ($PromptOtp -and -not $Otp -and -not $PromptOtpPerPackage) {
  $Otp = Read-Host "npm OTP"
}

$script:CurrentOtp = $Otp
$mode = if ($DryRun) { "dry-run" } else { "publish" }

if (-not $Yes) {
  Write-Host "About to $mode packages in this order:"
  $packageOrder | ForEach-Object {
    $manifest = Read-PackageManifest -PackageDir (Join-Path $rootDir "packages\$_")
    Write-Host " - $($manifest.name)@$($manifest.version)"
  }

  $answer = Read-Host "Continue? Type 'yes' to proceed"

  if ($answer -ne "yes") {
    throw "Publish cancelled."
  }
}

foreach ($packageName in $packageOrder) {
  Publish-Package -PackageName $packageName
}

Write-Host "Package $mode completed."