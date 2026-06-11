@echo off
chcp 65001 >nul
cd /d "%~dp0"
title GitHub 업로드

echo.
echo  GitHub에 최신 파일을 업로드합니다...
echo  저장소: https://github.com/y006230-arch/gugudan
echo.

git add gugudan.html index.html "구구단 시작.bat" "구구단 바로열기.bat"
git commit -m "Update gugudan game files" 2>nul
if %errorlevel% neq 0 (
  echo  변경된 파일이 없습니다.
) else (
  echo  커밋 완료.
)

git push origin main
if %errorlevel% neq 0 (
  echo.
  echo  업로드 실패 - GitHub 로그인이 필요할 수 있습니다.
  echo  Cursor 터미널에서 git push origin main 을 실행해 보세요.
) else (
  echo.
  echo  업로드 완료!
  echo  https://github.com/y006230-arch/gugudan
)

echo.
pause
