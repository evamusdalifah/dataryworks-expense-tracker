@echo off
title DataryWorks Expense Tracker
echo =====================================================================
echo  DATARYWORKS EXPENSE TRACKER - LOCAL SERVER
echo =====================================================================
echo.
echo  Menyalakan server lokal di http://localhost:8000 ...
echo  Membuka browser otomatis...
echo.
echo  Tekan Ctrl+C di terminal ini jika ingin mematikan server.
echo =====================================================================

start http://localhost:8000
python -m http.server 8000
