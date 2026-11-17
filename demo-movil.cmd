@echo off
rem ============================================================================
rem  NativIA - demo para celulares y tabletas (doble clic para arrancar).
rem  Hace lo mismo que "pnpm demo:movil": compila, arranca la app en este
rem  computador, abre el enlace publico y muestra el codigo QR.
rem  Cierra esta ventana (o Ctrl+C) para apagar la demo.
rem ============================================================================
chcp 65001 >nul
title NativIA - demo para celulares
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  No se encontro Node.js en este computador.
  echo  Instala la version LTS desde https://nodejs.org y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

node scripts\demo-movil.mjs %*

echo.
echo  La demo se detuvo. Puedes cerrar esta ventana.
pause >nul
