/**
 * RM Ubuzima - 6-Digit Code Password Reset Server
 * Deploy to Render.com (free tier, no credit card)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// You need to add your service account key as environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!serviceAccount.project_id) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT not set!');
  console.log('Please set the FIREBASE_SERVICE_ACCOUNT environment variable');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Configuration
const CODE_EXPIRY_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 3;
const MAX_RESEND_ATTEMPTS = 3;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM_EMAIL = process.env.FROM_EMAIL || 'rmubuzima@gmail.com';
const FROM_NAME = process.env.FROM_NAME || 'RM Ubuzima';

// Generate 6-digit code
const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send email via Brevo
const sendResetEmail = async (email, code, name) => {
  const brevoKey = process.env.BREVO_API_KEY;
  
  if (!brevoKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const emailData = {
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email }],
    subject: 'Your RM Ubuzima Password Reset Code',
    htmlContent: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f5f5f5; font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
        <tr><td style="padding:40px;">
          <div style="text-align:center; margin-bottom:30px;">
            <h1 style="color:#0d9488; margin:0; font-size:28px;">RM Ubuzima</h1>
            <p style="color:#64748b; margin:5px 0 0 0; font-size:14px;">Your Health Companion</p>
          </div>
          <h2 style="color:#0f172a; font-size:24px; margin-bottom:20px;">Password Reset Code</h2>
          <p style="color:#475569; font-size:16px; line-height:1.6;">Hi ${name || 'User'},</p>
          <p style="color:#475569; font-size:16px; line-height:1.6;">You requested a password reset. Use this 6-digit code:</p>
          <div style="background:#f0fdfa; border-radius:12px; padding:30px; text-align:center; margin:30px 0; border:2px dashed #0d9488;">
            <p style="color:#64748b; margin:0 0 10px 0; font-size:14px;">Your verification code:</p>
            <h1 style="color:#0d9488; margin:0; font-size:48px; letter-spacing:8px; font-weight:700;">${code}</h1>
            <p style="color:#94a3b8; margin:10px 0 0 0; font-size:12px;">This code expires in ${CODE_EXPIRY_MINUTES} minutes</p>
          </div>
          <div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:15px; margin:20px 0; border-radius:4px;">
            <p style="color:#92400e; margin:0; font-size:14px; line-height:1.5;">
              <strong>Security tip:</strong> Never share this code with anyone. RM Ubuzima staff will never ask for it.
            </p>
          </div>
          <p style="color:#475569; font-size:14px; line-height:1.6;">If you didn't request this, please ignore this email or contact support.</p>
          <hr style="border:none; border-top:1px solid #e2e8f0; margin:30px 0;">
          <p style="color:#94a3b8; font-size:12px; text-align:center;">RM Ubuzima - Secure SRHR Platform<br>This is an automated message. Do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  };

  await axios.post(BREVO_API_URL, emailData, {
    headers: { 
      'api-key': brevoKey, 
      'Content-Type': 'application/json' 
    }
  });
};

// API: Send Reset Code
app.post('/api/send-reset-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = admin.firestore.Timestamp.now();

    // Check for recent sends (rate limiting - 1 minute)
    const recentSends = await db.collection('passwordResetCodes')
      .where('email', '==', normalizedEmail)
      .where('createdAt', '>', admin.firestore.Timestamp.fromMillis(now.toMillis() - 60000))
      .get();

    if (recentSends.size > 0) {
      return res.status(429).json({ error: 'Please wait 1 minute before requesting another code' });
    }

    // Check daily resend attempts (3 per day)
    const todayStart = admin.firestore.Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000);
    const todaySends = await db.collection('passwordResetCodes')
      .where('email', '==', normalizedEmail)
      .where('createdAt', '>', todayStart)
      .get();

    if (todaySends.size >= MAX_RESEND_ATTEMPTS) {
      return res.status(429).json({ error: 'Maximum 3 attempts per day reached. Try again tomorrow.' });
    }

    // Check if user exists (don't reveal for security)
    let userName = 'User';
    let userExists = false;
    try {
      const user = await auth.getUserByEmail(normalizedEmail);
      userName = user.displayName || normalizedEmail.split('@')[0];
      userExists = true;
    } catch (e) {
      // User doesn't exist - silently continue for security
      console.log(`[Reset Code] Request for non-existent user: ${normalizedEmail}`);
    }

    // If user doesn't exist, still return success (security)
    if (!userExists) {
      return res.json({ success: true, message: 'If an account exists, a code has been sent' });
    }

    // Generate and store code
    const code = generateResetCode();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.collection('passwordResetCodes').add({
      code,
      email: normalizedEmail,
      attempts: 0,
      createdAt: now,
      expiresAt,
      used: false,
      verified: false
    });

    // Send email
    await sendResetEmail(normalizedEmail, code, userName);

    res.json({ success: true, message: 'Reset code sent' });

  } catch (error) {
    console.error('Send reset code error:', error);
    res.status(500).json({ error: error.message || 'Failed to send code' });
  }
});

// API: Verify Reset Code
app.post('/api/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = admin.firestore.Timestamp.now();

    // Find valid code
    const codesSnapshot = await db.collection('passwordResetCodes')
      .where('email', '==', normalizedEmail)
      .where('used', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (codesSnapshot.empty) {
      return res.status(400).json({ error: 'No active reset code found. Request a new code.' });
    }

    const codeDoc = codesSnapshot.docs[0];
    const codeData = codeDoc.data();

    // Check expiry
    if (now.toMillis() > codeData.expiresAt.toMillis()) {
      await codeDoc.ref.delete();
      return res.status(400).json({ error: 'Code has expired. Request a new code.' });
    }

    // Check attempts
    if (codeData.attempts >= MAX_CODE_ATTEMPTS) {
      await codeDoc.ref.delete();
      return res.status(400).json({ error: 'Too many failed attempts. Request a new code.' });
    }

    // Verify code
    if (codeData.code !== code) {
      await codeDoc.ref.update({ attempts: codeData.attempts + 1 });
      const remaining = MAX_CODE_ATTEMPTS - codeData.attempts - 1;
      return res.status(400).json({ error: `Invalid code. ${remaining} attempts remaining.` });
    }

    // Mark as verified
    await codeDoc.ref.update({ verified: true });

    res.json({ success: true, message: 'Code verified' });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

// API: Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find verified code
    const codesSnapshot = await db.collection('passwordResetCodes')
      .where('email', '==', normalizedEmail)
      .where('code', '==', code)
      .where('verified', '==', true)
      .where('used', '==', false)
      .limit(1)
      .get();

    if (codesSnapshot.empty) {
      return res.status(400).json({ error: 'Invalid or expired reset session. Start over.' });
    }

    const codeDoc = codesSnapshot.docs[0];
    const codeData = codeDoc.data();
    const now = admin.firestore.Timestamp.now();

    // Double-check not expired
    if (now.toMillis() > codeData.expiresAt.toMillis()) {
      await codeDoc.ref.delete();
      return res.status(400).json({ error: 'Reset session expired. Start over.' });
    }

    // Update password using Firebase Admin
    const user = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(user.uid, { password: newPassword });

    // Mark code as used
    await codeDoc.ref.update({ used: true });

    res.json({ 
      success: true, 
      message: 'Password reset successful',
      uid: user.uid,
      email: normalizedEmail
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Password Reset Server running on port ${PORT}`);
  console.log(`📧 Email service: Brevo (Sendinblue)`);
  console.log(`🔥 Firebase project: ${serviceAccount.project_id}`);
});
