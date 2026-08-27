# seat-check.ps1 - is a Claude Code CLI seat already running ON THIS FOLDER?
#
# Exit code = number of seats found in THIS folder (0 = none, safe to start).
# Exit 99 = the check itself failed; callers must treat that as NOT safe.
#
# 2026-08-27 (first version): counted every CLI claude.exe on the machine. That
# was wrong. The rule is "two seats on ONE FOLDER is forbidden" - a session open
# in scannerbot must not block the mixed-up-golf icon. That version bricked all
# six desktop icons whenever any one session was open. Now folder-scoped.
#
# How a seat's folder is identified: the launcher runs as
#   cmd.exe /c ""<folder>\RESUME-Claude.bat" "
# and claude.exe is its child, so the folder appears in an ancestor's command
# line. Walk up to 5 ancestors looking for this folder's path.
#
# Only the CLI binary counts (~\.local\bin\claude.exe). The Claude desktop app
# is also called claude.exe but lives under WindowsApps and is not a seat.
#
# A seat whose folder cannot be determined (an orphan whose launcher window is
# gone - the 17-hour ghost this guard was written for) is REPORTED but does NOT
# block. Blocking on it is what killed every icon.

param([string]$Folder = $PSScriptRoot)

try {
  $target = (Resolve-Path -LiteralPath $Folder -ErrorAction Stop).Path.TrimEnd('\')

  $all = @(Get-CimInstance Win32_Process -Filter "Name='claude.exe'" -ErrorAction Stop |
    Where-Object { $_.ExecutablePath -like '*\.local\bin\claude.exe' })

  $mine = @()
  $unknown = @()

  foreach ($s in $all) {
    $found = $false
    $text = [string]$s.CommandLine
    $pid_ = $s.ParentProcessId
    for ($i = 0; $i -lt 5 -and -not $found; $i++) {
      if ($text -and $text.ToLower().Contains($target.ToLower())) { $found = $true; break }
      if (-not $pid_) { break }
      $par = Get-CimInstance Win32_Process -Filter "ProcessId=$pid_" -ErrorAction SilentlyContinue
      if (-not $par) { break }
      $text = [string]$par.CommandLine
      $pid_ = $par.ParentProcessId
    }
    if ($found) { $mine += $s } else { $unknown += $s }
  }

  foreach ($s in $mine) {
    '    PID {0}  started {1}  THIS FOLDER  [{2}]' -f $s.ProcessId, $s.CreationDate.ToString('MM-dd HH:mm'), $s.CommandLine
  }
  foreach ($s in $unknown) {
    '    PID {0}  started {1}  other folder or orphan  [{2}]' -f $s.ProcessId, $s.CreationDate.ToString('MM-dd HH:mm'), $s.CommandLine
  }

  exit $mine.Count
} catch {
  'seat-check FAILED: ' + $_.Exception.Message
  exit 99
}
