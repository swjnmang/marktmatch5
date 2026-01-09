@echo off
REM Auto-update version and commit
REM Usage: commit.bat "your commit message"

cd /d "%~dp0"
echo Updating version...
call npm run version:update

echo.
echo Adding files to git...
git add .

echo.
echo Committing with message: %*
git commit -m %*

echo.
echo Done! Don't forget to run: git push
