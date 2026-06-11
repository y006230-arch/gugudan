@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 구구단 게임 (서버 없이)

echo gugudan.html 파일을 브라우저로 엽니다...
start "" "%~dp0gugudan.html"
timeout /t 2 >nul
exit
