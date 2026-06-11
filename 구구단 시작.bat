@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 구구단 게임

echo.
echo  구구단 게임을 실행합니다...
echo.

:: 1) 서버가 이미 떠 있으면 바로 브라우저만 열기
curl -s -o nul http://localhost:8765/gugudan.html 2>nul
if %errorlevel%==0 (
  echo  브라우저를 엽니다: http://localhost:8765/gugudan.html
  start "" "http://localhost:8765/gugudan.html"
  echo.
  echo  게임 창이 열렸습니다. 이 창은 닫아도 됩니다.
  timeout /t 3 >nul
  exit /b 0
)

:: 2) 서버 새로 시작
echo  서버를 시작합니다...
start "구구단서버" /min cmd /c "cd /d "%~dp0" && (py -m http.server 8765 2>nul || python -m http.server 8765) && pause"

:: 서버 준비 대기
timeout /t 2 /nobreak >nul

echo  브라우저를 엽니다: http://localhost:8765/gugudan.html
start "" "http://localhost:8765/gugudan.html"

echo.
echo  ========================================
echo   주소: http://localhost:8765/gugudan.html
echo.
echo   브라우저가 안 열리면 위 주소를 복사해서
echo   Chrome 또는 Edge 주소창에 붙여넣으세요.
echo.
echo   서버 종료: 작업표시줄의 "구구단서버" 창 닫기
echo  ========================================
echo.
pause
