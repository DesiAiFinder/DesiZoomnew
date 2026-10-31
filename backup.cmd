@echo off
REM ── DesiZoom database backup ──────────────────────────────────────────────
REM Writes a timestamped dump into .\backups\.
REM
REM Uses pg_dump directly (no Docker). Host and user are hardcoded below since
REM they aren't secret; only the password comes from the environment.
REM
REM Passed as discrete flags rather than a postgresql:// URI on purpose — a
REM password containing @ : / # or ? breaks URI parsing, and percent-encoding
REM it gets mangled again by cmd's % handling. PGPASSWORD sidesteps both.
REM
REM ── One-time setup ────────────────────────────────────────────────────────
REM   setx DZ_DB_PASS "your-database-password"
REM Then open a NEW terminal. Type the password exactly as it is — no quotes
REM inside, no encoding, special characters are fine.
REM
REM ── Usage ─────────────────────────────────────────────────────────────────
REM   backup.cmd

setlocal

set PGHOST=aws-1-us-east-2.pooler.supabase.com
set PGPORT=5432
set PGUSER=postgres.rroyfpheqwalxylgeidu
set PGDATABASE=postgres

if "%DZ_DB_PASS%"=="" (
  echo DZ_DB_PASS is not set.
  echo Run:  setx DZ_DB_PASS "your-database-password"
  echo Then open a NEW terminal and try again.
  exit /b 1
)
set PGPASSWORD=%DZ_DB_PASS%

where pg_dump >nul 2>nul
if errorlevel 1 (
  echo pg_dump not found on PATH.
  echo Add C:\Program Files\PostgreSQL\17\bin to PATH and reopen the terminal.
  exit /b 1
)

REM Timestamp via PowerShell, not wmic.
REM
REM wmic was removed in recent Windows 11 builds, so the old line produced
REM no value at all and the filename came out as literal "~0,4dt:~4,2..."
REM text, which pg_dump could not create. PowerShell's Get-Date is present
REM on every supported Windows and is not locale-dependent the way
REM %DATE% is.
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set STAMP=%%I

if "%STAMP%"=="" (
  echo Could not build a timestamp. Aborting rather than overwriting a file.
  exit /b 1
)

if not exist backups mkdir backups

echo Dumping database from %PGHOST% ...
pg_dump --clean --if-exists --quote-all-identifiers --schema=public ^
  --no-owner --no-privileges -f "backups\desizoom-%STAMP%.sql"
if errorlevel 1 goto :failed

REM pg_dump can exit 0 having written almost nothing. Check the size, because
REM "BACKUP COMPLETE" over an empty file is worse than a visible failure.
for %%F in ("backups\desizoom-%STAMP%.sql") do set SIZE=%%~zF
if %SIZE% LSS 10000 (
  echo.
  echo WARNING: the dump is only %SIZE% bytes. That is too small to be a real
  echo backup of this database. Open it and check before trusting it.
  exit /b 1
)

echo.
echo Done: backups\desizoom-%STAMP%.sql  (%SIZE% bytes)
echo Copy it somewhere off this machine - a backup on the same disk is not a backup.
goto :eof

:failed
echo.
echo BACKUP FAILED - do not assume you have a copy.
echo If it says password authentication failed, re-run:
echo     setx DZ_DB_PASS "your-database-password"
echo and open a new terminal.
exit /b 1
