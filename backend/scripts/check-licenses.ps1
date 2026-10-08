param(
  [string]$MavenCommand = ""
)

$ErrorActionPreference = "Stop"
$backendRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $backendRoot

if (-not $MavenCommand) {
  $portableMaven = Join-Path $repoRoot ".tools\apache-maven-3.9.16\bin\mvn.cmd"
  $MavenCommand = if (Test-Path $portableMaven) { $portableMaven } else { "mvn" }
}

$outputDir = Join-Path $backendRoot "target"
$dependencyListPath = Join-Path $outputDir "license-dependencies.txt"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

& $MavenCommand -q dependency:list "-DincludeScope=runtime" "-DoutputFile=$dependencyListPath" "-DappendOutput=false" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "No se pudo listar dependencias Maven para revisar licencias."
}

$localRepo = Join-Path $env:USERPROFILE ".m2\repository"
$blockedPattern = [regex]"(?i)\b(A?GPL|LGPL)\b"
$permissivePattern = [regex]"(?i)\b(MIT|Apache|BSD|ISC|EPL|MPL|CDDL|Public Domain|Unicode|W3C|Zlib)\b"
$missingPom = New-Object System.Collections.Generic.List[string]
$missingLicense = New-Object System.Collections.Generic.List[string]
$blocked = New-Object System.Collections.Generic.List[string]
$inspected = 0
$seen = @{}

function Test-BlockedLicense {
  param([string]$LicenseValue)
  if (-not $blockedPattern.IsMatch($LicenseValue)) { return $false }
  $hasAlternative = $LicenseValue -match "(?i)\bOR\b|/"
  return -not ($hasAlternative -and $permissivePattern.IsMatch($LicenseValue))
}

function Get-PomPath {
  param([string]$GroupId, [string]$ArtifactId, [string]$Version)
  $groupPath = $GroupId.Replace(".", [IO.Path]::DirectorySeparatorChar)
  return Join-Path $localRepo (Join-Path $groupPath (Join-Path $ArtifactId (Join-Path $Version "$ArtifactId-$Version.pom")))
}

function Get-LicenseNames {
  param(
    [string]$PomPath,
    [hashtable]$Visited = @{}
  )
  if ($Visited.ContainsKey($PomPath)) { return @() }
  $Visited[$PomPath] = $true

  [xml]$pom = Get-Content $PomPath
  $licenseNames = @($pom.project.licenses.license | ForEach-Object { $_.name } | Where-Object { $_ })
  if ($licenseNames.Length) { return $licenseNames }

  $parent = $pom.project.parent
  if (-not $parent) { return @() }
  $parentGroupId = [string]$parent.groupId
  $parentArtifactId = [string]$parent.artifactId
  $parentVersion = [string]$parent.version
  if (-not $parentGroupId -or -not $parentArtifactId -or -not $parentVersion) { return @() }

  $parentPomPath = Get-PomPath $parentGroupId $parentArtifactId $parentVersion
  if (-not (Test-Path $parentPomPath)) { return @() }
  return Get-LicenseNames $parentPomPath $Visited
}

Get-Content $dependencyListPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("The following files")) { return }
  if ($line -notmatch "^[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+:") { return }
  $parts = $line -split ":"
  if ($parts.Length -lt 4) { return }

  $groupId = $parts[0]
  $artifactId = $parts[1]
  $version = $parts[3]
  $key = "$groupId`:$artifactId`:$version"
  if ($seen.ContainsKey($key)) { return }
  $seen[$key] = $true

  $pomPath = Get-PomPath $groupId $artifactId $version
  if (-not (Test-Path $pomPath)) {
    $missingPom.Add($key)
    return
  }

  $licenseNames = @(Get-LicenseNames $pomPath)
  if (-not $licenseNames.Length) {
    $missingLicense.Add($key)
    return
  }

  $inspected += 1
  $licenseValue = ($licenseNames -join " OR ")
  if (Test-BlockedLicense $licenseValue) {
    $blocked.Add("$key -> $licenseValue")
  }
}

if ($missingPom.Count -gt 0) {
  Write-Error ("No se encontraron POMs locales para revisar licencias:`n- " + ($missingPom -join "`n- "))
  exit 1
}

if ($missingLicense.Count -gt 0) {
  Write-Error ("Dependencias Maven sin licencia declarada en POM:`n- " + ($missingLicense -join "`n- "))
  exit 1
}

if ($blocked.Count -gt 0) {
  Write-Error ("Dependencias Maven con licencia copyleft fuerte detectada:`n- " + ($blocked -join "`n- "))
  exit 1
}

Write-Output "Licencias backend revisadas: $inspected dependencias runtime Maven sin AGPL/GPL/LGPL obligatorio."
