@echo off
REM One-command runner for the Day 9 MCP assignment.
REM Usage:  run.cmd            (everything)
REM         run.cmd task1      (performance trace only)
REM         run.cmd task2      (debugging story only)
setlocal
cd /d "%~dp0harness"
if not exist node_modules (
  echo Installing chrome-devtools-mcp@1.8.0 ...
  call npm install --no-audit --no-fund || exit /b 1
)
node run.mjs %1
endlocal
