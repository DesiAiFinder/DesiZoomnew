@echo off
REM ── Snapshot the test content before wiping it ────────────────────────────
REM
REM backup.cmd dumps the whole schema with --clean, so restoring it DROPS every
REM table first. That is the right tool for "the database is gone", and the
REM wrong tool for "I want my test restaurants back" — after go-live it would
REM take real merchant data with it.
REM
REM This is data-only, and covers exactly the tables migration_reset_for_live.sql
REM empties. Nothing else in the database is touched on restore.
REM
REM ── Usage ─────────────────────────────────────────────────────────────────
REM   snapshot_testdata.cmd            <- run BEFORE the reset
REM
REM ── To put it back ────────────────────────────────────────────────────────
REM   Re-run migration_reset_for_live.sql (so ids don't collide), then:
REM     psql -h aws-1-us-east-2.pooler.supabase.com -p 5432 ^
REM          -U postgres.rroyfpheqwalxylgeidu -d postgres ^
REM          -f backups\testdata-YYYY-MM-DD_HHMM.sql
REM
REM   Restoring into a live database with real orders in it will collide on
REM   primary keys. Don't. See the note at the bottom of this file.

setlocal

set PGHOST=aws-1-us-east-2.pooler.supabase.com
set PGPORT=5432
set PGUSER=postgres.rroyfpheqwalxylgeidu
set PGDATABASE=postgres

if "%DZ_DB_PASS%"=="" (
  echo DZ_DB_PASS is not set.  Run:  setx DZ_DB_PASS "your-database-password"
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

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set STAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%%dt:~10,2%

if not exist backups mkdir backups

echo Snapshotting test content ...
pg_dump --data-only --no-owner --no-privileges --quote-all-identifiers ^
  -t public.orders -t public.order_items -t public.tickets ^
  -t public.service_bookings -t public.service_requests -t public.lead_unlocks ^
  -t public.menu_items -t public.restaurants -t public.businesses ^
  -t public.service_offerings -t public.service_providers ^
  -t public.organizations -t public.live_streams -t public.news_items ^
  -t public.votes -t public.comments -t public.posts -t public.favorites ^
  -t public.reviews -t public.reports -t public.messages -t public.conversations ^
  -t public.alerts -t public.notifications ^
  -f "backups\testdata-%STAMP%.sql"
if errorlevel 1 goto :failed

echo.
echo Done: backups\testdata-%STAMP%.sql
echo Copy it off this machine. A backup on the same disk is not a backup.
echo.
echo Also run backup.cmd for a full snapshot before the reset - belt and braces.
goto :eof

:failed
echo.
echo SNAPSHOT FAILED - do not run the reset.
exit /b 1

REM ── The honest recommendation ─────────────────────────────────────────────
REM Restoring test data into the live database is a bad habit even when it
REM works. Test restaurants with test Connect accounts sitting alongside real
REM merchants is exactly the kind of mixing that made the webhook failure so
REM hard to diagnose.
REM
REM If you expect to keep testing after go-live, create a SECOND free Supabase
REM project as staging, restore this snapshot there once, and point a local
REM .env.local at it. Then test mode and live mode never share a database and
REM you can break things freely.
