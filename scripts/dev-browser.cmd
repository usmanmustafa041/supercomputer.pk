@echo off
REM Opens the dev site in a clean Chrome profile with extensions disabled.
REM
REM Why this exists: Bitdefender's browser extension injects bis_skin_checked
REM attributes into the DOM before React hydrates, which React reports as a
REM hydration mismatch. It is not an application bug and no code change can
REM suppress it -- suppressHydrationWarning only covers the element it is on,
REM not the hundreds of descendants the extension rewrites.
REM
REM This profile is separate from your normal one, so your everyday browsing
REM keeps its extensions. Nothing here is shared with the main Chrome profile.

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
  echo Chrome not found. Edit scripts\dev-browser.cmd with the correct path.
  exit /b 1
)

set "PROFILE=%LOCALAPPDATA%\supercomputers-devprofile"
set "URL=%~1"
if "%URL%"=="" set "URL=http://localhost:3000/"

start "" "%CHROME%" --user-data-dir="%PROFILE%" --disable-extensions --no-first-run --no-default-browser-check "%URL%"
