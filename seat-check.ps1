# seat-check.ps1 — how many Claude Code CLI seats are running on this machine?
# Exit code = the count (0 = none, safe to start one). Exit 99 = the check itself
# failed, which callers must treat as NOT safe (fail closed).
# Only the CLI binary counts (~\.local\bin\claude.exe); the Claude desktop app is
# also called claude.exe but lives under WindowsApps and is not a seat.
# Added 2026-08-27 after a windowless CLI process outlived its terminal for 17 h.
try {
  $seats = @(Get-CimInstance Win32_Process -Filter "Name='claude.exe'" -ErrorAction Stop |
    Where-Object { $_.ExecutablePath -like '*\.local\bin\claude.exe' })
  foreach ($s in $seats) {
    '    PID {0}  started {1}  [{2}]' -f $s.ProcessId, $s.CreationDate.ToString('MM-dd HH:mm'), $s.CommandLine
  }
  exit $seats.Count
} catch {
  'seat-check FAILED: ' + $_.Exception.Message
  exit 99
}
