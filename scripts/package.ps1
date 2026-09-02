$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root

try {
  node scripts/build.mjs
  node scripts/validate.mjs

  $manifest = Get-Content -Raw -Encoding UTF8 (Join-Path $root "komari-theme.json") | ConvertFrom-Json
  $version = $manifest.version
  $releaseDir = Join-Path $root "release"
  $name = "komari-butterfly-v$version.zip"
  $output = Join-Path $releaseDir $name
  New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

  Add-Type -AssemblyName System.IO.Compression
  $fileStream = [System.IO.File]::Open(
    $output,
    [System.IO.FileMode]::Create,
    [System.IO.FileAccess]::ReadWrite,
    [System.IO.FileShare]::None
  )

  try {
    $archive = [System.IO.Compression.ZipArchive]::new(
      $fileStream,
      [System.IO.Compression.ZipArchiveMode]::Create,
      $false
    )

    try {
      $items = New-Object System.Collections.Generic.List[object]
      $items.Add([pscustomobject]@{ Source = (Join-Path $root "komari-theme.json"); Entry = "komari-theme.json" })
      $items.Add([pscustomobject]@{ Source = (Join-Path $root "preview.png"); Entry = "preview.png" })

      $distFiles = Get-ChildItem -LiteralPath (Join-Path $root "dist") -Recurse -File | Sort-Object FullName
      foreach ($file in $distFiles) {
        if (-not $file.FullName.StartsWith($root + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
          throw "Unexpected package file outside the workspace: $($file.FullName)"
        }
        $relative = $file.FullName.Substring($root.Length + 1).Replace("\", "/")
        $items.Add([pscustomobject]@{ Source = $file.FullName; Entry = $relative })
      }

      foreach ($item in $items) {
        $entry = $archive.CreateEntry($item.Entry, [System.IO.Compression.CompressionLevel]::Optimal)
        $entry.LastWriteTime = [DateTimeOffset]::new(1980, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
        $sourceStream = [System.IO.File]::OpenRead($item.Source)
        try {
          $entryStream = $entry.Open()
          try { $sourceStream.CopyTo($entryStream) }
          finally { $entryStream.Dispose() }
        }
        finally { $sourceStream.Dispose() }
      }
    }
    finally { $archive.Dispose() }
  }
  finally { $fileStream.Dispose() }

  $hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
  [System.IO.File]::WriteAllText(
    "$output.sha256",
    "$hash  $name`n",
    [System.Text.UTF8Encoding]::new($false)
  )
  node scripts/sync-release-metadata.mjs $hash

  Write-Host "Created release/$name"
  Write-Host "SHA256: $hash"
}
finally {
  Pop-Location
}
