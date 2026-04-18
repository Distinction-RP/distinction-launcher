@echo off
setlocal
:: Se place dans le dossier du script
cd /d "%~dp0"

echo ==========================================
echo    DISTINCTION RP - BUILD SYSTEM
echo ==========================================

:: 1. Vérification de Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe sur ce PC.
    echo Veuillez l'installer sur https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Installation des dépendances et Build
echo [1/3] Installation des dependances et Build Electron...
call npm install
call npm run electron:build

:: 3. Création du Payload ZIP
echo [2/3] Creation du payload.zip...
:: On verifie si le dossier de sortie est bien win-unpacked
if not exist "release\win-unpacked" (
    echo [ERREUR] Le build Electron a echoue ou le dossier release/win-unpacked est introuvable.
    pause
    exit /b 1
)

powershell -Command "Compress-Archive -Path 'release\win-unpacked\*' -DestinationPath 'payload.zip' -Force"

:: 4. Compilation du Loader C# (Version avec DLL references)
echo [3/3] Compilation du Loader final (EXE)...

:: Chemins possibles pour CSC
set CSC_PATH=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC_PATH%" set CSC_PATH=csc.exe

:: Compilation avec les flags exacts de votre log
"%CSC_PATH%" /target:winexe /out:Launcher_DistinctionRP.exe /win32icon:app.ico /resource:payload.zip /r:System.IO.Compression.FileSystem.dll /r:System.IO.Compression.dll /r:System.Windows.Forms.dll Loader.cs

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo   SUCCES : Launcher_DistinctionRP.exe cree !
    echo ==========================================
    if exist payload.zip del payload.zip
) else (
    echo [ERREUR] La compilation du Loader a echoue.
)

pause
