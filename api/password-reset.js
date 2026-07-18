// Backend API for password reset with 6-digit codes
// Deploy this to Firebase Functions, Vercel, or your preferred server
// Uses Firebase Admin SDK to directly set passwords

const admin = require('firebase-admin');

// Initialize Firebase Admin (do this once in your backend entry point)
// admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

const CODE_EXPIRY_MINUTES = 15;
const MAX_ATTEMPTS = 3;

/**
 * Generate 6-digit code
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send reset code email
 * POST /api/send-reset-code
 */
exports.sendResetCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    // Check if user exists
    try {
      await auth.getUserByEmail(email);
    } catch (error) {
      // For security, don't reveal if email exists
      // But log for debugging
      console.log(`[Reset Code] Email not found: ${email}`);
    }
    
    const code = generateCode();
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + CODE_EXPIRY_MINUTES * 60 * 1000
    );
    
    // Store code in Firestore
    const codeId = `${email.toLowerCase()}_${Date.now()}`;
    await db.collection('passwordResetCodes').doc(codeId).set({
      code,
      email: email.toLowerCase(),
      attempts: 0,
      createdAt: now,
      expiresAt,
      used: false,
      verified: false,
    });
    
    // Store lookup
    await db.collection('passwordResetCodesByEmail').doc(email.toLowerCase()).set({
      activeCodeId: codeId,
      createdAt: now,
    });
    
    // Send email via your email service (SendGrid, AWS SES, etc.)
    // Example with a mock email service:
    await sendEmail({
      to: email,
      subject: 'Your RM Ubuzima Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0D9488;">Password Reset Code</h2>
          <p>You requested a password reset for your RM Ubuzima account.</p>
          <div style="background: #f0fdfa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">Your 6-digit verification code:</p>
            <h1 style="margin: 10px 0; font-size: 36px; letter-spacing: 8px; color: #0D9488;">${code}</h1>
            <p style="margin: 0; color: #999; font-size: 12px;">This code expires in ${CODE_EXPIRY_MINUTES} minutes</p>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            RM Ubuzima - Secure SRHR Platform<br>
            This is an automated message. Do not reply.
          </p>
        </div>
      `,
    });
    
    res.json({ success: true, message: 'Reset code sent' });
    
  } catch (error) {
    console.error('Send reset code error:', error);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
};

/**
 * Verify reset code
 * POST /api/verify-reset-code
 */
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get active code
    const lookupDoc = await db.collection('passwordResetCodesByEmail').doc(normalizedEmail).get();
    
    if (!lookupDoc.exists) {
      return res.status(400).json({ error: 'No reset code found' });
    }
    
    const { activeCodeId } = lookupDoc.data();
    const codeDoc = await db.collection('passwordResetCodes').doc(activeCodeId).get();
    
    if (!codeDoc.exists) {
      return res.status(400).json({ error: 'Code not found' });
    }
    
    const codeData = codeDoc.data();
    const now = admin.firestore.Timestamp.now();
    
    // Check expiry
    if (now.toMillis() > codeData.expiresAt.toMillis()) {
      await codeDoc.ref.delete();
      await lookupDoc.ref.delete();
      return res.status(400).json({ error: 'Code expired' });
    }
    
    // Check used
    if (codeData.used) {
      return res.status(400).json({ error: 'Code already used' });
    }
    
    // Check attempts
    if (codeData.attempts >= MAX_ATTEMPTS) {
      await codeDoc.ref.delete();
      await lookupDoc.ref.delete();
      return res.status(400).json({ error: 'Too many attempts' });
    }
    
    // Verify code
    if (codeData.code !== code) {
      await codeDoc.ref.update({ attempts: codeData.attempts + 1 });
      const remaining = MAX_ATTEMPTS - codeData.attempts - 1;
      return res.status(400).json({ 
        error: 'Invalid code',
        remainingAttempts: remaining 
      });
    }
    
    // Mark as verified (ready for password reset)
    await codeDoc.ref.update({ verified: true });
    
    res.json({ success: true, message: 'Code verified' });
    
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

/**
 * Reset password with verified code
 * POST /api/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password required' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get active code
    const lookupDoc = await db.collection('passwordResetCodesByEmail').doc(normalizedEmail).get();
    
    if (!lookupDoc.exists) {
      return res.status(400).json({ error: 'Reset session expired' });
    }
    
    const { activeCodeId } = lookupDoc.data();
    const codeDoc = await db.collection('passwordResetCodes').doc(activeCodeId).get();
    
    if (!codeDoc.exists) {
      return res.status(400).json({ error: 'Invalid reset session' });
    }
    
    const codeData = codeDoc.data();
    
    // Must be verified first
    if (!codeData.verified) {
      return res.status(400).json({ error: 'Code not verified. Please verify code first.' });
    }
    
    // Verify code matches again
    if (codeData.code !== code) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    
    // Get user and update password using Admin SDK
    const user = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(user.uid, { password: newPassword });
    
    // Mark code as used
    await codeDoc.ref.update({ used: true });
    await lookupDoc.ref.delete();
    
    // Create custom token for auto-login
    const customToken = await auth.createCustomToken(user.uid);
    
    res.json({ 
      success: true, 
      message: 'Password reset successful',
      customToken,
      uid: user.uid,
      email: normalizedEmail
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Mock email function - replace with your actual email service
async function sendEmail({ to, subject, html }) {
  console.log(`[Email] To: ${to}`);
  console.log(`[Email] Subject: ${subject}`);
  console.log(`[Email] Body: ${html}`);
  
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({ to, from: 'support@rmubuzima.org', subject, html });
}
