/**
 * RM Ubuzima Firebase Cloud Functions - Email System
 * Optimal solution using Brevo + Firebase
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

const db = admin.firestore();

// Brevo Configuration
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM_EMAIL = 'rmubuzima@gmail.com';
const FROM_NAME = 'RM Ubuzima';
const ADMIN_EMAIL = 'rmubuzima@gmail.com';

// Get API key from Firebase config
const getBrevoKey = () => {
  const key = functions.config().brevo?.key || process.env.BREVO_API_KEY;
  if (!key) {
    throw new Error('BREVO_API_KEY not configured');
  }
  return key;
};

// Email Templates
const templates = {
  passwordReset: (data: any) => ({
    subject: 'Password Reset - RM Ubuzima',
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
          <h2 style="color:#0f172a; font-size:24px; margin-bottom:20px;">Password Reset Request</h2>
          <p style="color:#475569; font-size:16px; line-height:1.6;">Hi ${data.name || 'User'},</p>
          <p style="color:#475569; font-size:16px; line-height:1.6;">We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align:center; margin:30px 0;">
            <a href="${data.resetUrl}" style="background:#0d9488; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:8px; font-size:16px; font-weight:600; display:inline-block;">Reset My Password</a>
          </div>
          <p style="color:#64748b; font-size:14px; line-height:1.6;">This link will expire in 1 hour for security reasons.</p>
          <p style="color:#64748b; font-size:14px; line-height:1.6;">If you didn't request this, please ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 40px; background:#f8fafc; border-bottom-left-radius:12px; border-bottom-right-radius:12px;">
          <p style="color:#94a3b8; font-size:12px; text-align:center; margin:0;">© ${new Date().getFullYear()} RM Ubuzima. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  }),

  appointmentConfirmation: (data: any) => ({
    subject: 'Appointment Confirmed - RM Ubuzima',
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
          </div>
          <h2 style="color:#0f172a; font-size:24px; margin-bottom:20px;">Appointment Confirmed</h2>
          <p style="color:#475569; font-size:16px; line-height:1.6;">Hi ${data.patientName},</p>
          <p style="color:#475569; font-size:16px; line-height:1.6;">Your appointment has been confirmed. Here are the details:</p>
          <div style="background:#f0fdfa; border-left:4px solid #0d9488; padding:20px; margin:20px 0; border-radius:8px;">
            <p style="margin:5px 0; color:#0f172a;"><strong>Doctor:</strong> ${data.doctorName}</p>
            <p style="margin:5px 0; color:#0f172a;"><strong>Specialty:</strong> ${data.specialty}</p>
            <p style="margin:5px 0; color:#0f172a;"><strong>Date:</strong> ${data.appointmentDate}</p>
            <p style="margin:5px 0; color:#0f172a;"><strong>Time:</strong> ${data.appointmentTime}</p>
            <p style="margin:5px 0; color:#0f172a;"><strong>Location:</strong> ${data.location}</p>
            <p style="margin:5px 0; color:#0f172a;"><strong>Reference:</strong> ${data.referenceNumber}</p>
          </div>
          ${data.manageLink ? `<div style="text-align:center; margin:30px 0;">
            <a href="${data.manageLink}" style="background:#0d9488; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:8px; font-size:16px; font-weight:600; display:inline-block;">Manage Appointment</a>
          </div>` : ''}
        </td></tr>
        <tr><td style="padding:20px 40px; background:#f8fafc; border-bottom-left-radius:12px; border-bottom-right-radius:12px;">
          <p style="color:#94a3b8; font-size:12px; text-align:center; margin:0;">© ${new Date().getFullYear()} RM Ubuzima. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  }),

  welcomeEmail: (data: any) => ({
    subject: 'Welcome to RM Ubuzima',
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
          </div>
          <h2 style="color:#0f172a; font-size:24px; margin-bottom:20px;">Welcome to RM Ubuzima!</h2>
          <p style="color:#475569; font-size:16px; line-height:1.6;">Hi ${data.name},</p>
          <p style="color:#475569; font-size:16px; line-height:1.6;">Thank you for joining RM Ubuzima - Your trusted health companion.</p>
          <div style="background:#f0fdfa; border-left:4px solid #0d9488; padding:20px; margin:20px 0; border-radius:8px;">
            <p style="margin:0; color:#0f172a;">With RM Ubuzima, you can:</p>
            <ul style="color:#475569; margin:10px 0;">
              <li>Book appointments with doctors</li>
              <li>Access your health records</li>
              <li>Get medication reminders</li>
              <li>Consult with healthcare providers</li>
            </ul>
          </div>
          ${data.appLink ? `<div style="text-align:center; margin:30px 0;">
            <a href="${data.appLink}" style="background:#0d9488; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:8px; font-size:16px; font-weight:600; display:inline-block;">Get Started</a>
          </div>` : ''}
        </td></tr>
        <tr><td style="padding:20px 40px; background:#f8fafc; border-bottom-left-radius:12px; border-bottom-right-radius:12px;">
          <p style="color:#94a3b8; font-size:12px; text-align:center; margin:0;">© ${new Date().getFullYear()} RM Ubuzima. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  }),

  adminNotification: (data: any) => ({
    subject: `New ${data.type} - RM Ubuzima`,
    htmlContent: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:20px; font-family:Arial,sans-serif;">
  <h2 style="color:#0d9488;">New ${data.type}</h2>
  <p><strong>Details:</strong></p>
  <pre style="background:#f5f5f5; padding:15px; border-radius:8px;">${JSON.stringify(data, null, 2)}</pre>
  <p style="color:#64748b; font-size:12px;">© ${new Date().getFullYear()} RM Ubuzima</p>
</body>
</html>`
  })
};

// Send email via Brevo
const sendEmail = async (to: string, template: any) => {
  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: to }],
        subject: template.subject,
        htmlContent: template.htmlContent
      },
      {
        headers: {
          'api-key': getBrevoKey(),
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, messageId: response.data.messageId };
  } catch (error: any) {
    console.error('Email send error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to send email');
  }
};

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

// 1. Send Password Reset Email
export const sendPasswordResetEmail = functions.https.onCall(async (data, context) => {
  // Validate input
  if (!data.email || !data.resetUrl) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and reset URL are required');
  }

  try {
    const template = templates.passwordReset(data);
    const result = await sendEmail(data.email, template);
    
    // Log to Firestore
    await db.collection('emailLogs').add({
      type: 'passwordReset',
      to: data.email,
      success: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// 2. Send Appointment Confirmation
export const sendAppointmentConfirmation = functions.https.onCall(async (data, context) => {
  if (!data.patientEmail || !data.doctorName) {
    throw new functions.https.HttpsError('invalid-argument', 'Required fields missing');
  }

  try {
    const template = templates.appointmentConfirmation(data);
    const result = await sendEmail(data.patientEmail, template);
    
    // Also notify admin
    const adminTemplate = templates.adminNotification({
      type: 'Appointment Booking',
      ...data
    });
    await sendEmail(ADMIN_EMAIL, adminTemplate).catch(() => {}); // Don't fail if admin email fails

    // Log to Firestore
    await db.collection('emailLogs').add({
      type: 'appointmentConfirmation',
      to: data.patientEmail,
      doctor: data.doctorName,
      success: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// 3. Send Welcome Email
export const sendWelcomeEmail = functions.https.onCall(async (data, context) => {
  if (!data.email || !data.name) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and name are required');
  }

  try {
    const template = templates.welcomeEmail(data);
    const result = await sendEmail(data.email, template);

    await db.collection('emailLogs').add({
      type: 'welcomeEmail',
      to: data.email,
      success: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// 4. Trigger on user creation
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  if (user.email) {
    try {
      const template = templates.welcomeEmail({
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        appLink: 'https://rm-ubuzima.netlify.app'
      });
      await sendEmail(user.email, template);
    } catch (error) {
      console.error('Welcome email failed:', error);
    }
  }
});

// 5. Health check
export const checkEmailHealth = functions.https.onCall(async (data, context) => {
  try {
    const key = getBrevoKey();
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      brevoConfigured: !!key
    };
  } catch (error: any) {
    return { status: 'error', error: error.message };
  }
});

// ============================================================================
// 6-DIGIT CODE PASSWORD RESET SYSTEM
// ============================================================================

const CODE_EXPIRY_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 3;
const MAX_RESEND_ATTEMPTS = 3;

// Generate 6-digit code
const generateResetCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send 6-digit reset code email
const sendResetCodeEmail = async (email: string, code: string, name?: string) => {
  const brevoKey = getBrevoKey();
  
  const emailData = {
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: email }],
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

// 6. Send Reset Code (HTTP Callable)
export const sendResetCode = functions.https.onCall(async (data, context) => {
  try {
    const { email } = data;
    
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new functions.https.HttpsError('invalid-argument', 'Valid email required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = admin.firestore.Timestamp.now();

    // Check for recent sends (rate limiting)
    const recentSends = await db.collection('passwordResetCodes')
      .where('email', '==', normalizedEmail)
      .where('createdAt', '>', admin.firestore.Timestamp.fromMillis(now.toMillis() - 60000))
      .get();

    if (recentSends.size > 0) {
      throw new functions.https.HttpsError('resource-exhausted', 'Please wait before requesting another code');
    }

    // Check resend attempts
    const todayStarts = admin.firestore.Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000);
    const todaySends = await db.collection('passwordResetCodes')
      .where('email', '==', normalizedEmail)
      .where('createdAt', '>', todayStarts)
      .get();

    if (todaySends.size >= MAX_RESEND_ATTEMPTS) {
      throw new functions.https.HttpsError('resource-exhausted', 'Maximum daily attempts reached. Try again tomorrow.');
    }

    // Check if user exists (don't reveal to client for security)
    let userName = 'User';
    try {
      const user = await admin.auth().getUserByEmail(normalizedEmail);
      userName = user.displayName || normalizedEmail.split('@')[0];
    } catch (e) {
      // User doesn't exist - still "send" for security, but don't actually send
      console.log(`[Password Reset] User not found: ${normalizedEmail}`);
      return { success: true, message: 'If an account exists, a code has been sent' };
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
    await sendResetCodeEmail(normalizedEmail, code, userName);

    return { success: true, message: 'Reset code sent' };

  } catch (error: any) {
    console.error('Send reset code error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to send code');
  }
});

// 7. Verify Reset Code (HTTP Callable)
export const verifyResetCode = functions.https.onCall(async (data, context) => {
  try {
    const { email, code } = data;

    if (!email || !code) {
      throw new functions.https.HttpsError('invalid-argument', 'Email and code required');
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
      throw new functions.https.HttpsError('not-found', 'No active reset code found');
    }

    const codeDoc = codesSnapshot.docs[0];
    const codeData = codeDoc.data();

    // Check expiry
    if (now.toMillis() > codeData.expiresAt.toMillis()) {
      await codeDoc.ref.delete();
      throw new functions.https.HttpsError('deadline-exceeded', 'Code has expired');
    }

    // Check attempts
    if (codeData.attempts >= MAX_CODE_ATTEMPTS) {
      await codeDoc.ref.delete();
      throw new functions.https.HttpsError('permission-denied', 'Too many failed attempts');
    }

    // Verify code
    if (codeData.code !== code) {
      await codeDoc.ref.update({ attempts: codeData.attempts + 1 });
      const remaining = MAX_CODE_ATTEMPTS - codeData.attempts - 1;
      throw new functions.https.HttpsError('permission-denied', `Invalid code. ${remaining} attempts remaining.`);
    }

    // Mark as verified
    await codeDoc.ref.update({ verified: true });

    return { success: true, message: 'Code verified' };

  } catch (error: any) {
    console.error('Verify code error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Verification failed');
  }
});

// 8. Reset Password with Code (HTTP Callable)
export const resetPasswordWithCode = functions.https.onCall(async (data, context) => {
  try {
    const { email, code, newPassword } = data;

    if (!email || !code || !newPassword) {
      throw new functions.https.HttpsError('invalid-argument', 'Email, code, and new password required');
    }

    if (newPassword.length < 6) {
      throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
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
      throw new functions.https.HttpsError('permission-denied', 'Invalid or expired reset session');
    }

    const codeDoc = codesSnapshot.docs[0];
    const codeData = codeDoc.data();
    const now = admin.firestore.Timestamp.now();

    // Double-check not expired
    if (now.toMillis() > codeData.expiresAt.toMillis()) {
      await codeDoc.ref.delete();
      throw new functions.https.HttpsError('deadline-exceeded', 'Reset session expired');
    }

    // Get user and update password
    const user = await admin.auth().getUserByEmail(normalizedEmail);
    await admin.auth().updateUser(user.uid, { password: newPassword });

    // Mark code as used
    await codeDoc.ref.update({ used: true });

    // Create custom token for auto-login
    const customToken = await admin.auth().createCustomToken(user.uid);

    return { 
      success: true, 
      message: 'Password reset successful',
      customToken,
      uid: user.uid,
      email: normalizedEmail
    };

  } catch (error: any) {
    console.error('Reset password error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to reset password');
  }
});
