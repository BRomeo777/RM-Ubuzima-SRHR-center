@echo off
echo ==========================================
echo  Deploy 6-Digit Code Password Reset
echo ==========================================
echo.

REM Check if BREVO_API_KEY is set
if "%BREVO_API_KEY%"=="" (
    echo ERROR: BREVO_API_KEY environment variable not set!
    echo.
    echo Please set it first:
    echo    set BREVO_API_KEY=your-key-here
    echo.
    echo Or run:
    echo    firebase functions:config:set brevo.key="your-key"
    echo.
    pause
    exit /b 1
)

echo Step 1: Setting Brevo API Key...
cd functions
firebase functions:config:set brevo.key="%BREVO_API_KEY%"
if errorlevel 1 (
    echo ERROR: Failed to set Brevo API key
    pause
    exit /b 1
)

echo.
echo Step 2: Installing dependencies...
npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo Step 3: Building functions...
npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo Step 4: Deploying Firebase Functions...
firebase deploy --only functions
if errorlevel 1 (
    echo ERROR: Functions deployment failed
    pause
    exit /b 1
)

echo.
echo Step 5: Deploying Firestore indexes...
firebase deploy --only firestore:indexes
if errorlevel 1 (
    echo WARNING: Indexes deployment failed (non-critical)
)

echo.
echo ==========================================
echo  DEPLOYMENT COMPLETE! 
echo ==========================================
echo.
echo Your 6-digit code password reset is now LIVE!
echo.
echo Test it:
echo  1. Go to your login page
echo  2. Click "Forgot password?"
echo  3. Enter your email
echo  4. Check email for 6-digit code
echo.
pause
