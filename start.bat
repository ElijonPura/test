@echo off
title BiteDash Restaurant Server
echo ======================================================
echo    Starting BiteDash Full-Stack Restaurant Server
echo ======================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node server.js
) else (
    where agy-node >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        agy-node server.js
    ) else (
        echo [ERROR] Node.js is not found on PATH.
        echo Please ensure Node.js is installed or run with agy-node.
        pause
    )
)
