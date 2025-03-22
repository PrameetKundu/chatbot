@echo off
echo Cleaning temporary files...

:: Get the current username
set "tempFolder=C:\Users\Admin\AppData\Local\logs"

:: Delete all files and subfolders
echo Deleting files in %tempFolder%...
del /s /q "%tempFolder%\*" 2>nul

echo Deleting folders in %tempFolder%...
for /d %%X in ("%tempFolder%\*") do rd /s /q "%%X" 2>nul

echo Cleanup complete!
exit /b
