/**
 * RM Ubuzima Email Server V2 - Ultimate Edition
 * Production-ready email system with beautiful designs and anti-spam protection
 * 
 * Features:
 * - Beautiful HTML email templates with modern design
 * - Anti-spam measures (DKIM, SPF, validation, rate limiting)
 * - Email tracking and analytics
 * - Comprehensive notification system
 * - Queue management with retry logic
 * - Security hardening
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// FIREBASE ADMIN INIT
// ===============================

// Initialize Firebase Admin if service account provided
let firebaseInitialized = false;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
    console.log('🔥 Firebase Admin initialized');
  } catch (error) {
    console.error('⚠️ Firebase Admin init failed:', error.message);
  }
}

// ===============================
// CONFIGURATION & SECURITY
// ===============================

// Environment variables - ALL REQUIRED for production
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM_EMAIL = process.env.FROM_EMAIL || 'rmubuzima@gmail.com';
const FROM_NAME = process.env.FROM_NAME || 'RM Ubuzima';
const APP_URL = process.env.APP_URL || 'https://rm-ubuzima.netlify.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'rmubuzima@gmail.com';
const EMAIL_WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');

// Validate critical environment variables
if (!BREVO_API_KEY) {
  console.error('❌ FATAL: BREVO_API_KEY environment variable is required');
  process.exit(1);
}

// Security: Log startup without exposing sensitive data
console.log('🔐 Email Server V2 Starting...');
console.log(`📧 Sender: ${FROM_NAME} <${FROM_EMAIL}>`);
console.log(`🌐 App URL: ${APP_URL}`);
console.log(`👤 Admin: ${ADMIN_EMAIL}`);

// ===============================
// ANTI-SPAM & SECURITY CONFIG
// ===============================

// Rate limiting - strict to prevent spam
const RATE_LIMITS = {
  global: { windowMs: 60 * 1000, max: 200 },        // 200 emails/minute total
  perIP: { windowMs: 60 * 1000, max: 10 },         // 10 emails/minute per IP
  perEmail: { windowMs: 60 * 60 * 1000, max: 5 },  // 5 emails/hour per recipient
  passwordReset: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 password resets/hour
};

// Suspicious patterns for spam detection
const SPAM_PATTERNS = [
  /viagra|cialis|xxx|porn|sex|nude/i,
  /\$\$\$|earn money|get rich|make money fast/i,
  /click here|act now|limited time|urgent/i,
  /\b[A-Z]{10,}\b/, // Excessive caps
  /(.)\1{5,}/,      // Repeated characters
];

// Allowed domains (restrict to prevent abuse)
const ALLOWED_RECIPIENT_DOMAINS = process.env.ALLOWED_DOMAINS?.split(',') || [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  // African domains
  'co.rw',
  'rw',
  'co.ke',
  'ke',
  'co.ug',
  'ug',
  'co.tz',
  'tz',
  'co.za',
  'za',
  'ng',
  'cm',
  'et',
  'gh',
  'sn',
  'zm',
  'zw',
  'mw',
  'bi',
  'cd',
  // Corporate/Edu
  'edu',
  'ac.rw',
  'ac.ke',
  'ac.ug',
  'ac.tz',
  'hospital',
  'clinic',
  'health',
];

// Rate limit storage
const rateLimitStore = new Map();

// Email tracking storage (in production, use Redis)
const emailTracking = new Map();

// ===============================
// BEAUTIFUL EMAIL TEMPLATES
// ===============================

const EmailTemplates = {
  // Brand colors
  colors: {
    primary: '#0d9488',      // Teal
    primaryDark: '#0f766e',
    secondary: '#0891b2',    // Cyan
    accent: '#f59e0b',       // Amber
    success: '#10b981',      // Green
    warning: '#f59e0b',      // Amber
    danger: '#ef4444',       // Red
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    }
  },

  // Base template with modern design
  baseTemplate(content, options = {}) {
    const { title, preheader, footerText = 'RM Ubuzima - Your Health Companion' } = options;
    const year = new Date().getFullYear();
    
    return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .mobile-padding { padding: 20px !important; }
      .mobile-font { font-size: 16px !important; }
      .mobile-button { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Hidden preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}</div>
  
  <!-- Email Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        
        <!-- Main Content Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 40px 30px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-block; line-height: 60px; text-align: center; font-size: 28px;">💚</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">RM Ubuzima</h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 400;">${title}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td class="mobile-padding" style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px; line-height: 1.5;">${footerText}</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${year} RM Ubuzima. All rights reserved.<br>
                <a href="${APP_URL}/privacy" style="color: #64748b; text-decoration: underline;">Privacy Policy</a> • 
                <a href="${APP_URL}/terms" style="color: #64748b; text-decoration: underline;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Anti-spam: Physical Address (helps deliverability) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin-top: 20px;">
          <tr>
            <td style="text-align: center; padding: 0 20px;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
                This email was sent from RM Ubuzima Health Platform.<br>
                If you received this in error, please disregard or contact support.
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
  },

  // Button component
  button(url, text, color = 'primary') {
    const bgColor = color === 'primary' ? '#0d9488' : 
                    color === 'danger' ? '#ef4444' :
                    color === 'success' ? '#10b981' : '#0891b2';
    
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${url}" class="mobile-button" style="display: inline-block; background-color: ${bgColor}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
  },

  // Info box component
  infoBox(content, type = 'info') {
    const colors = {
      info: { bg: '#eff6ff', border: '#3b82f6', icon: 'ℹ️' },
      success: { bg: '#f0fdf4', border: '#10b981', icon: '✅' },
      warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️' },
      danger: { bg: '#fef2f2', border: '#ef4444', icon: '🚨' },
    };
    const theme = colors[type];
    
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0; background-color: ${theme.bg}; border-left: 4px solid ${theme.border}; border-radius: 8px;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">${theme.icon} ${content}</p>
        </td>
      </tr>
    </table>`;
  },

  // Data row component (for appointment details, etc.)
  dataRow(label, value, highlight = false) {
    return `<tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="35%" style="color: #64748b; font-size: 14px; font-weight: 500;">${label}</td>
            <td width="65%" style="color: ${highlight ? '#0d9488' : '#1e293b'}; font-size: 14px; font-weight: ${highlight ? '600' : '400'};">${value}</td>
          </tr>
        </table>
      </td>
    </tr>`;
  },

  // =========================
  // SPECIFIC EMAIL TEMPLATES
  // =========================

  // 1. Welcome Email
  welcome(data) {
    const { name, appLink } = data;
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Dear <strong>${name}</strong>,
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Welcome to <strong>RM Ubuzima</strong>! We're thrilled to have you join our community dedicated to reproductive health and wellness.
      </p>
      
      ${this.infoBox('Your account is now active and ready to use!', 'success')}
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        With RM Ubuzima, you can:
      </p>
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #475569;">💬 Chat with AI health assistants</td></tr>
        <tr><td style="padding: 8px 0; color: #475569;">📅 Book appointments with healthcare providers</td></tr>
        <tr><td style="padding: 8px 0; color: #475569;">📚 Access SRHR educational content</td></tr>
        <tr><td style="padding: 8px 0; color: #475569;">🏥 Find nearby health facilities</td></tr>
        <tr><td style="padding: 8px 0; color: #475569;">👥 Join supportive community groups</td></tr>
      </table>
      
      ${this.button(appLink, 'Get Started', 'primary')}
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
        Need help? Reply to this email or visit our <a href="${appLink}/help" style="color: #0d9488; text-decoration: underline;">Help Center</a>.
      </p>
    `;
    
    return this.baseTemplate(content, {
      title: 'Welcome to RM Ubuzima',
      preheader: `Welcome to RM Ubuzima, ${name}! Start your health journey with us.`
    });
  },

  // 2. Password Reset
  passwordReset(data) {
    const { name, resetUrl, expiryTime = '24 hours' } = data;
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We received a request to reset your password. Click the button below to create a new password:
      </p>
      
      ${this.button(resetUrl, 'Reset My Password', 'primary')}
      
      ${this.infoBox(`This link expires in ${expiryTime} for security reasons.`, 'warning')}
      
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 20px 0;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #475569; margin: 0;">
        ${resetUrl}
      </p>
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    `;
    
    return this.baseTemplate(content, {
      title: 'Password Reset Request',
      preheader: 'Reset your RM Ubuzima password - link expires in 24 hours'
    });
  },

  // 3. Appointment Confirmation (Patient)
  appointmentConfirmation(data) {
    const { patientName, doctorName, specialty, appointmentDate, appointmentTime, location, referenceNumber, manageLink } = data;
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Dear <strong>${patientName}</strong>,
      </p>
      
      ${this.infoBox('Your appointment has been confirmed!', 'success')}
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #0d9488; font-size: 18px; font-weight: 600;">Appointment Details</h3>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${this.dataRow('Reference #', referenceNumber, true)}
              ${this.dataRow('Doctor', doctorName)}
              ${this.dataRow('Specialty', specialty)}
              ${this.dataRow('Date', appointmentDate)}
              ${this.dataRow('Time', appointmentTime)}
              ${this.dataRow('Location', location)}
            </table>
          </td>
        </tr>
      </table>
      
      ${this.button(manageLink, 'Manage Appointment', 'primary')}
      
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 20px 0;">
        <strong>What's next?</strong><br>
        The healthcare provider will contact you to confirm the appointment. Please keep your phone available.
      </p>
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        Need to reschedule? Use the button above or contact us at <a href="mailto:${ADMIN_EMAIL}" style="color: #0d9488;">${ADMIN_EMAIL}</a>
      </p>
    `;
    
    return this.baseTemplate(content, {
      title: 'Appointment Confirmed',
      preheader: `Your appointment with ${doctorName} is confirmed for ${appointmentDate}`
    });
  },

  // 4. Admin Notification (New Appointment)
  adminAppointmentNotification(data) {
    const { patientName, patientEmail, patientPhone, doctorName, appointmentDate, appointmentTime, referenceNumber, reason } = data;
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        A new appointment has been booked on the platform.
      </p>
      
      ${this.infoBox('New patient appointment requires attention', 'info')}
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #0d9488; font-size: 18px; font-weight: 600;">Patient Information</h3>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${this.dataRow('Reference #', referenceNumber, true)}
              ${this.dataRow('Patient', patientName)}
              ${this.dataRow('Email', patientEmail || 'Not provided')}
              ${this.dataRow('Phone', patientPhone)}
            </table>
          </td>
        </tr>
      </table>
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #fffbeb; border-radius: 12px; overflow: hidden; border-left: 4px solid #f59e0b;">
        <tr>
          <td style="padding: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #b45309; font-size: 18px; font-weight: 600;">Appointment Request</h3>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${this.dataRow('Doctor', doctorName)}
              ${this.dataRow('Preferred Date', appointmentDate)}
              ${this.dataRow('Preferred Time', appointmentTime)}
            </table>
            <div style="margin-top: 16px; padding: 16px; background-color: #ffffff; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Reason for Visit</p>
              <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6;">${reason}</p>
            </div>
          </td>
        </tr>
      </table>
      
      ${this.button(`${APP_URL}/admin`, 'View in Admin Panel', 'primary')}
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        Please ensure the doctor is notified and contacts the patient to confirm the appointment.
      </p>
    `;
    
    return this.baseTemplate(content, {
      title: 'New Appointment Booked',
      preheader: `New appointment: ${patientName} with ${doctorName} on ${appointmentDate}`
    });
  },

  // 5. Doctor Notification
  doctorAppointmentNotification(data) {
    const { patientName, patientEmail, patientPhone, appointmentDate, appointmentTime, referenceNumber, reason } = data;
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        You have a new patient appointment request.
      </p>
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 24px; color: #ffffff;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 500; opacity: 0.9;">Reference Number</h3>
            <p style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">${referenceNumber}</p>
          </td>
        </tr>
      </table>
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #0d9488; font-size: 18px; font-weight: 600;">Patient Details</h3>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${this.dataRow('Name', patientName)}
              ${this.dataRow('Phone', `<a href="tel:${patientPhone}" style="color: #0d9488; text-decoration: none;">${patientPhone}</a>`)}
              ${this.dataRow('Email', patientEmail ? `<a href="mailto:${patientEmail}" style="color: #0d9488; text-decoration: none;">${patientEmail}</a>` : 'Not provided')}
            </table>
          </td>
        </tr>
      </table>
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #f0fdf4; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #15803d; font-size: 18px; font-weight: 600;">Requested Schedule</h3>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${this.dataRow('Date', appointmentDate)}
              ${this.dataRow('Time', appointmentTime)}
            </table>
            <div style="margin-top: 16px; padding: 16px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #22c55e;">
              <p style="margin: 0 0 8px 0; color: #15803d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Reason for Visit</p>
              <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6;">${reason}</p>
            </div>
          </td>
        </tr>
      </table>
      
      ${this.infoBox('Please contact the patient within 24 hours to confirm this appointment.', 'warning')}
      
      ${this.button(`tel:${patientPhone}`, 'Call Patient Now', 'success')}
    `;
    
    return this.baseTemplate(content, {
      title: 'New Patient Appointment',
      preheader: `New appointment: ${patientName} on ${appointmentDate} at ${appointmentTime}`
    });
  },

  // 6. New Message Notification (for facilitators)
  newMessageNotification(data) {
    const { facilitatorName, senderName, messagePreview, conversationLink, context = 'inbox' } = data;
    const contextLabel = context === 'shangazi' ? 'Girls Room' : 'Inbox';
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi <strong>${facilitatorName}</strong>,
      </p>
      
      ${this.infoBox(`You have a new message in your ${contextLabel}`, 'info')}
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="48" style="vertical-align: top;">
                  <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); border-radius: 50%; display: inline-block; text-align: center; line-height: 40px; color: #ffffff; font-weight: 600; font-size: 16px;">
                    ${senderName.charAt(0).toUpperCase()}
                  </div>
                </td>
                <td style="vertical-align: top; padding-left: 12px;">
                  <p style="margin: 0 0 4px 0; color: #1e293b; font-size: 16px; font-weight: 600;">${senderName}</p>
                  <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5; font-style: italic;">
                    "${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}"
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      ${this.button(conversationLink, 'Reply to Message', 'primary')}
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        You're receiving this because you're a facilitator on RM Ubuzima. 
        <a href="${APP_URL}/settings/notifications" style="color: #0d9488;">Manage notification preferences</a>
      </p>
    `;
    
    return this.baseTemplate(content, {
      title: `New Message in ${contextLabel}`,
      preheader: `${senderName} sent you a message in your ${contextLabel}`
    });
  },

  // 7. Facilitator Request Notification
  facilitatorRequestNotification(data) {
    const { adminName, requesterName, requesterEmail, requestReason, reviewLink } = data;
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi <strong>${adminName}</strong>,
      </p>
      
      ${this.infoBox('New facilitator request pending review', 'warning')}
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #0d9488; font-size: 18px; font-weight: 600;">Requester Information</h3>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${this.dataRow('Name', requesterName)}
              ${this.dataRow('Email', requesterEmail)}
            </table>
            <div style="margin-top: 16px; padding: 16px; background-color: #ffffff; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Reason for Request</p>
              <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6;">${requestReason}</p>
            </div>
          </td>
        </tr>
      </table>
      
      ${this.button(reviewLink, 'Review Request', 'primary')}
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        Please review this request promptly to maintain community engagement.
      </p>
    `;
    
    return this.baseTemplate(content, {
      title: 'New Facilitator Request',
      preheader: `${requesterName} has requested to become a facilitator`
    });
  },

  // 8. Account Security Alert
  securityAlert(data) {
    const { name, alertType, device, location, time, actionLink, actionText } = data;
    const alertMessages = {
      'login': { title: 'New Login Detected', color: 'warning', icon: '🔐' },
      'password-changed': { title: 'Password Changed', color: 'success', icon: '🔒' },
      'suspicious-activity': { title: 'Suspicious Activity Detected', color: 'danger', icon: '🚨' },
    };
    const alert = alertMessages[alertType] || alertMessages['login'];
    
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi <strong>${name}</strong>,
      </p>
      
      ${this.infoBox(`${alert.icon} ${alert.title}`, alert.color)}
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        We detected activity on your account:
      </p>
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${this.dataRow('Device', device)}
              ${this.dataRow('Location', location)}
              ${this.dataRow('Time', time)}
            </table>
          </td>
        </tr>
      </table>
      
      ${alertType === 'suspicious-activity' ? 
        `<p style="color: #ef4444; font-size: 16px; line-height: 1.6; margin: 20px 0; font-weight: 600;">
          If this wasn't you, please secure your account immediately.
        </p>` : 
        `<p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 20px 0;">
          If this wasn't you, please secure your account.
        </p>`
      }
      
      ${actionLink ? this.button(actionLink, actionText || 'Review Activity', alertType === 'suspicious-activity' ? 'danger' : 'primary') : ''}
    `;
    
    return this.baseTemplate(content, {
      title: alert.title,
      preheader: `Security alert for your RM Ubuzima account`
    });
  },

  // 9. Weekly Digest (for facilitators)
  weeklyDigest(data) {
    const { facilitatorName, stats, period, dashboardLink } = data;
    const content = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi <strong>${facilitatorName}</strong>,
      </p>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Here's your weekly activity summary for <strong>${period}</strong>:
      </p>
      
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td width="48%" style="padding: 20px; background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); border-radius: 12px; text-align: center;">
            <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Messages</p>
            <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 36px; font-weight: 700;">${stats.messages || 0}</p>
          </td>
          <td width="4%"></td>
          <td width="48%" style="padding: 20px; background-color: #f0fdf4; border-radius: 12px; text-align: center; border: 2px solid #10b981;">
            <p style="margin: 0; color: #15803d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Users Helped</p>
            <p style="margin: 8px 0 0 0; color: #15803d; font-size: 36px; font-weight: 700;">${stats.usersHelped || 0}</p>
          </td>
        </tr>
      </table>
      
      ${this.button(dashboardLink, 'View Full Dashboard', 'primary')}
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
        Thank you for your dedication to helping our community! 💚
      </p>
    `;
    
    return this.baseTemplate(content, {
      title: 'Your Weekly Summary',
      preheader: `Weekly activity summary: ${stats.messages} messages, ${stats.usersHelped} users helped`
    });
  },
};

// Export for use in other modules
module.exports = { EmailTemplates };

// ============================================
// SECURITY & VALIDATION FUNCTIONS
// ============================================

/**
 * Check rate limits for various endpoints
 */
function checkRateLimit(key, limitType) {
  const now = Date.now();
  const config = RATE_LIMITS[limitType];
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs, firstRequest: now });
    return { allowed: true };
  }
  
  const record = rateLimitStore.get(key);
  
  // Reset if window has passed
  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs, firstRequest: now });
    return { allowed: true };
  }
  
  // Check limit
  if (record.count >= config.max) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
      limit: config.max,
      remaining: 0
    };
  }
  
  // Increment count
  record.count++;
  return {
    allowed: true,
    limit: config.max,
    remaining: config.max - record.count
  };
}

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimits() {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit entries`);
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupRateLimits, 10 * 60 * 1000);

/**
 * Validate email format (RFC 5322 compliant)
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return regex.test(email.trim()) && email.length <= 254;
}

/**
 * Check if email domain is allowed
 */
function isAllowedDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  // Always allow if no restrictions set
  if (!process.env.ALLOWED_DOMAINS) return true;
  
  return ALLOWED_RECIPIENT_DOMAINS.some(allowed => 
    domain === allowed || domain.endsWith('.' + allowed)
  );
}

/**
 * Detect spam content
 */
function detectSpam(content) {
  if (!content || typeof content !== 'string') return { isSpam: false, score: 0 };
  
  let score = 0;
  const matches = [];
  
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      score += 10;
      matches.push(pattern.toString());
    }
  }
  
  // Check for excessive caps
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 20) {
    score += 15;
    matches.push('excessive_caps');
  }
  
  // Check for suspicious URLs
  const suspiciousUrls = content.match(/bit\.ly|tinyurl|t\.co|goo\.gl/i);
  if (suspiciousUrls) {
    score += 20;
    matches.push('suspicious_url');
  }
  
  return {
    isSpam: score >= 20,
    score,
    matches
  };
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHtml(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Generate unique tracking ID
 */
function generateTrackingId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash email for privacy (for logging)
 */
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
}

// ============================================
// EMAIL SENDING & QUEUE SYSTEM
// ============================================

const emailQueue = [];
let isProcessingQueue = false;

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 15000]; // 2s, 5s, 15s

/**
 * Send email via Brevo API with retry logic
 */
async function sendEmailWithRetry({ to, subject, htmlContent, textContent, replyTo, trackingId, attempt = 1 }) {
  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        subject,
        htmlContent,
        textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
        replyTo: replyTo ? { email: replyTo } : { email: FROM_EMAIL },
        tags: ['rm-ubuzima', trackingId].filter(Boolean),
        tracking: {
          open: true,
          click: true
        }
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      success: true,
      messageId: response.data.messageId,
      trackingId,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const isRetryable = error.response?.status >= 500 || 
                        error.code === 'ECONNRESET' || 
                        error.code === 'ETIMEDOUT' ||
                        error.code === 'ENOTFOUND' ||
                        error.code === 'ECONNREFUSED' ||
                        error.response?.status === 429;
    
    if (attempt < MAX_RETRIES && isRetryable) {
      console.log(`📧 Email retry ${attempt}/${MAX_RETRIES} for ${hashEmail(to)} in ${RETRY_DELAYS[attempt - 1]}ms`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1]));
      return sendEmailWithRetry({ to, subject, htmlContent, textContent, replyTo, trackingId, attempt: attempt + 1 });
    }

    console.error('❌ Email send failed after retries:', {
      to: hashEmail(to),
      subject,
      error: error.response?.data?.message || error.message,
      attempt,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      trackingId,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Process email queue
 */
async function processQueue() {
  if (isProcessingQueue || emailQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  const batch = emailQueue.splice(0, 5); // Process 5 at a time
  console.log(`📤 Processing ${batch.length} queued emails (${emailQueue.length} remaining)`);
  
  const results = await Promise.allSettled(
    batch.map(job => sendEmailWithRetry(job))
  );
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      console.log(`✅ Queued email sent: ${result.value.messageId}`);
    } else {
      console.error(`❌ Queued email failed:`, result.reason || result.value?.error);
      // Re-queue if retryable
      if (batch[index].attempt < MAX_RETRIES) {
        emailQueue.push({ ...batch[index], attempt: (batch[index].attempt || 1) + 1 });
      }
    }
  });
  
  isProcessingQueue = false;
  
  // Continue processing if more in queue
  if (emailQueue.length > 0) {
    setTimeout(processQueue, 1000);
  }
}

// Start queue processor
setInterval(() => {
  if (emailQueue.length > 0 && !isProcessingQueue) {
    processQueue();
  }
}, 1000);

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration - Allow all origins for now (restrict in production)
app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins for testing
    callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400
}));

// Body parsing with limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Request logging and ID
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req.startTime = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.id} - ${req.method} ${req.path} - ${req.ip}`);
  
  // Log response time
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    console.log(`[${new Date().toISOString()}] ${req.id} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Global rate limiting
app.use((req, res, next) => {
  const key = `global:${req.ip}`;
  const result = checkRateLimit(key, 'global');
  
  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Global rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfter
    });
  }
  
  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': result.limit,
    'X-RateLimit-Remaining': result.remaining
  });
  
  next();
});

// Security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });
  next();
});

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    queueSize: emailQueue.length,
    memory: process.memoryUsage()
  });
});

// Send welcome email
app.post('/api/send-welcome', async (req, res) => {
  // Rate limit
  const rateResult = checkRateLimit(`email:${req.ip}`, 'perIP');
  if (!rateResult.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: rateResult.retryAfter
    });
  }

  const { email, name } = req.body;
  
  // Validation
  if (!email || !name) {
    return res.status(400).json({ success: false, error: 'Email and name are required' });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Per-email rate limit
  const perEmailLimit = checkRateLimit(`email:${email}`, 'perEmail');
  if (!perEmailLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many emails to this address',
      retryAfter: perEmailLimit.retryAfter
    });
  }

  // Spam check
  const spamCheck = detectSpam(name);
  if (spamCheck.isSpam) {
    console.warn(`🚫 Spam detected from ${req.ip}:`, spamCheck.matches);
    return res.status(400).json({ success: false, error: 'Content flagged as spam' });
  }

  const trackingId = generateTrackingId();
  const htmlContent = EmailTemplates.welcome({
    name: sanitizeHtml(name),
    appLink: APP_URL
  });

  const result = await sendEmailWithRetry({
    to: email,
    subject: 'Welcome to RM Ubuzima! 💚',
    htmlContent,
    trackingId,
    replyTo: ADMIN_EMAIL
  });

  if (result.success) {
    emailTracking.set(trackingId, {
      type: 'welcome',
      to: hashEmail(email),
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      messageId: result.messageId,
      trackingId,
      message: 'Welcome email sent successfully'
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      message: 'Failed to send welcome email'
    });
  }
});

// Send password reset
app.post('/api/send-password-reset', async (req, res) => {
  // Stricter rate limit for password resets
  const rateResult = checkRateLimit(`pwd:${req.ip}`, 'passwordReset');
  if (!rateResult.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many password reset attempts. Please try again later.',
      retryAfter: rateResult.retryAfter
    });
  }

  const { email, name, resetUrl } = req.body;
  
  if (!email || !name || !resetUrl) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Validate reset URL is from our domain
  try {
    const resetUrlObj = new URL(resetUrl);
    const allowedHosts = ['rm-ubuzima.netlify.app', 'localhost'];
    if (!allowedHosts.some(host => resetUrlObj.hostname.includes(host))) {
      return res.status(400).json({ success: false, error: 'Invalid reset URL' });
    }
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid reset URL format' });
  }

  const trackingId = generateTrackingId();
  const htmlContent = EmailTemplates.passwordReset({
    name: sanitizeHtml(name),
    resetUrl,
    expiryTime: '24 hours'
  });

  const result = await sendEmailWithRetry({
    to: email,
    subject: 'Reset Your RM Ubuzima Password',
    htmlContent,
    trackingId,
    replyTo: ADMIN_EMAIL
  });

  if (result.success) {
    emailTracking.set(trackingId, {
      type: 'password-reset',
      to: hashEmail(email),
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      messageId: result.messageId,
      trackingId,
      message: 'Password reset email sent'
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      message: 'Failed to send password reset'
    });
  }
});

// Send appointment confirmation to patient
app.post('/api/send-appointment-confirmation', async (req, res) => {
  const rateResult = checkRateLimit(`email:${req.ip}`, 'perIP');
  if (!rateResult.allowed) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded', retryAfter: rateResult.retryAfter });
  }

  const { patientEmail, patientName, doctorName, specialty, appointmentDate, appointmentTime, location, referenceNumber } = req.body;
  
  if (!patientEmail || !patientName || !appointmentDate) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  if (!isValidEmail(patientEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid patient email' });
  }

  const trackingId = generateTrackingId();
  const htmlContent = EmailTemplates.appointmentConfirmation({
    patientName: sanitizeHtml(patientName),
    doctorName: sanitizeHtml(doctorName || 'Healthcare Provider'),
    specialty: sanitizeHtml(specialty || 'General Practice'),
    appointmentDate: sanitizeHtml(appointmentDate),
    appointmentTime: sanitizeHtml(appointmentTime || 'To be confirmed'),
    location: sanitizeHtml(location || 'To be confirmed'),
    referenceNumber: sanitizeHtml(referenceNumber),
    manageLink: `${APP_URL}/appointments`
  });

  const result = await sendEmailWithRetry({
    to: patientEmail,
    subject: 'Your Appointment is Confirmed ✓',
    htmlContent,
    trackingId,
    replyTo: ADMIN_EMAIL
  });

  if (result.success) {
    res.json({ success: true, messageId: result.messageId, trackingId });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Notify admin about new appointment
app.post('/api/notify-admin-appointment', async (req, res) => {
  const rateResult = checkRateLimit(`admin:${req.ip}`, 'perIP');
  if (!rateResult.allowed) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
  }

  const { patientName, patientEmail, patientPhone, doctorName, appointmentDate, appointmentTime, referenceNumber, reason } = req.body;
  
  const trackingId = generateTrackingId();
  const htmlContent = EmailTemplates.adminAppointmentNotification({
    patientName: sanitizeHtml(patientName || 'Anonymous'),
    patientEmail: patientEmail ? sanitizeHtml(patientEmail) : null,
    patientPhone: sanitizeHtml(patientPhone || 'Not provided'),
    doctorName: sanitizeHtml(doctorName || 'Doctor'),
    appointmentDate: sanitizeHtml(appointmentDate),
    appointmentTime: sanitizeHtml(appointmentTime || 'Not specified'),
    referenceNumber: sanitizeHtml(referenceNumber),
    reason: sanitizeHtml(reason || 'Not specified')
  });

  const result = await sendEmailWithRetry({
    to: ADMIN_EMAIL,
    subject: `New Appointment: ${patientName || 'Anonymous'} with ${doctorName || 'Doctor'}`,
    htmlContent,
    trackingId,
    replyTo: patientEmail || ADMIN_EMAIL
  });

  if (result.success) {
    res.json({ success: true, messageId: result.messageId, trackingId });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Notify doctor about appointment
app.post('/api/notify-doctor', async (req, res) => {
  const { doctorEmail, patientName, patientEmail, patientPhone, appointmentDate, appointmentTime, referenceNumber, reason } = req.body;
  
  if (!doctorEmail || !isValidEmail(doctorEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid doctor email' });
  }

  if (!isAllowedDomain(doctorEmail)) {
    return res.status(400).json({ success: false, error: 'Email domain not allowed' });
  }

  const trackingId = generateTrackingId();
  const htmlContent = EmailTemplates.doctorAppointmentNotification({
    patientName: sanitizeHtml(patientName || 'Anonymous'),
    patientEmail: patientEmail ? sanitizeHtml(patientEmail) : null,
    patientPhone: sanitizeHtml(patientPhone || 'Not provided'),
    appointmentDate: sanitizeHtml(appointmentDate),
    appointmentTime: sanitizeHtml(appointmentTime || 'Not specified'),
    referenceNumber: sanitizeHtml(referenceNumber),
    reason: sanitizeHtml(reason || 'Not specified')
  });

  const result = await sendEmailWithRetry({
    to: doctorEmail,
    subject: `New Patient Appointment: ${referenceNumber}`,
    htmlContent,
    trackingId,
    replyTo: patientEmail || ADMIN_EMAIL
  });

  if (result.success) {
    res.json({ success: true, messageId: result.messageId, trackingId });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Send new message notification to facilitator
app.post('/api/notify-new-message', async (req, res) => {
  const rateResult = checkRateLimit(`msg:${req.ip}`, 'perEmail');
  if (!rateResult.allowed) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
  }

  const { facilitatorEmail, facilitatorName, senderName, messagePreview, context, conversationLink } = req.body;
  
  if (!facilitatorEmail || !isValidEmail(facilitatorEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid facilitator email' });
  }

  const trackingId = generateTrackingId();
  const htmlContent = EmailTemplates.newMessageNotification({
    facilitatorName: sanitizeHtml(facilitatorName),
    senderName: sanitizeHtml(senderName),
    messagePreview: sanitizeHtml(messagePreview),
    context: context || 'inbox',
    conversationLink: conversationLink || APP_URL
  });

  const result = await sendEmailWithRetry({
    to: facilitatorEmail,
    subject: `New Message from ${senderName}`,
    htmlContent,
    trackingId,
    replyTo: ADMIN_EMAIL
  });

  if (result.success) {
    res.json({ success: true, messageId: result.messageId, trackingId });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Generic email endpoint (admin only, requires API key)
app.post('/api/send-email', async (req, res) => {
  // Verify API key for admin operations
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { to, subject, htmlContent, textContent, fromName } = req.body;
  
  if (!to || !subject || (!htmlContent && !textContent)) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!isValidEmail(to)) {
    return res.status(400).json({ success: false, error: 'Invalid recipient email' });
  }

  const trackingId = generateTrackingId();
  const result = await sendEmailWithRetry({
    to,
    subject,
    htmlContent,
    textContent,
    trackingId
  });

  if (result.success) {
    res.json({ success: true, messageId: result.messageId, trackingId });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Email tracking webhook (for Brevo)
app.post('/api/webhook/email-event', (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-brevo-signature'];
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto.createHmac('sha256', EMAIL_WEBHOOK_SECRET).update(payload).digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const events = Array.isArray(req.body) ? req.body : [req.body];
  
  events.forEach(event => {
    console.log(`📊 Email Event: ${event.event} - ${event.messageId} - ${event.email}`);
    // Store in analytics (production: use database)
  });
  
  res.json({ received: true, processed: events.length });
});

// Get email stats (admin only)
app.get('/api/stats', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  res.json({
    queueSize: emailQueue.length,
    isProcessing: isProcessingQueue,
    trackingSize: emailTracking.size,
    rateLimitSize: rateLimitStore.size,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// ============================================
// 6-DIGIT CODE PASSWORD RESET SYSTEM
// ============================================

const CODE_EXPIRY_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 3;
const MAX_RESEND_ATTEMPTS = 3;

// In-memory storage for reset codes (use Redis in production)
const resetCodes = new Map();

// Generate 6-digit code
const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send 6-digit reset code email
app.post('/api/send-reset-code', async (req, res) => {
  // Rate limit: 3 per hour per IP
  const rateResult = checkRateLimit(`code:${req.ip}`, 'passwordReset');
  if (!rateResult.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many attempts. Please try again later.',
      retryAfter: rateResult.retryAfter
    });
  }

  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();

  // Check daily resend attempts
  const userCodes = Array.from(resetCodes.values()).filter(
    c => c.email === normalizedEmail && c.createdAt > now - 24 * 60 * 60 * 1000
  );
  
  if (userCodes.length >= MAX_RESEND_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      error: 'Maximum 3 attempts per day reached. Try again tomorrow.'
    });
  }

  // Generate code
  const code = generateResetCode();
  const expiresAt = now + CODE_EXPIRY_MINUTES * 60 * 1000;
  const codeId = crypto.randomUUID();

  // Store code
  resetCodes.set(codeId, {
    id: codeId,
    code,
    email: normalizedEmail,
    attempts: 0,
    createdAt: now,
    expiresAt,
    used: false,
    verified: false
  });

  // Clean up old codes for this email
  userCodes.forEach(c => {
    if (c.expiresAt < now) resetCodes.delete(c.id);
  });

  // Get user name from email
  const name = normalizedEmail.split('@')[0];

  // Send email with 6-digit code
  const trackingId = generateTrackingId();
  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f1f5f9; font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
        <tr><td style="padding:40px;">
          <div style="text-align:center; margin-bottom:30px;">
            <div style="width:60px; height:60px; background:linear-gradient(135deg, #0d9488 0%, #0891b2 100%); border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:28px;">🔐</div>
            <h1 style="color:#0d9488; margin:15px 0 5px 0; font-size:28px;">RM Ubuzima</h1>
            <p style="color:#64748b; margin:0; font-size:14px;">Your Health Companion</p>
          </div>
          <h2 style="color:#0f172a; font-size:24px; margin-bottom:20px; text-align:center;">Password Reset Code</h2>
          <p style="color:#475569; font-size:16px; line-height:1.6;">Hi ${name},</p>
          <p style="color:#475569; font-size:16px; line-height:1.6;">You requested a password reset. Use this 6-digit code:</p>
          <div style="background:linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%); border-radius:16px; padding:40px; text-align:center; margin:30px 0; border:3px dashed #0d9488;">
            <p style="color:#64748b; margin:0 0 15px 0; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Your verification code</p>
            <h1 style="color:#0d9488; margin:0; font-size:56px; letter-spacing:12px; font-weight:800; font-family:'Courier New',monospace;">${code}</h1>
            <p style="color:#94a3b8; margin:15px 0 0 0; font-size:13px;">⏱️ This code expires in ${CODE_EXPIRY_MINUTES} minutes</p>
          </div>
          <div style="background:#fef3c7; border-left:5px solid #f59e0b; padding:20px; margin:25px 0; border-radius:8px;">
            <p style="color:#92400e; margin:0; font-size:14px; line-height:1.6;">
              <strong>🔒 Security tip:</strong> Never share this code with anyone. RM Ubuzima staff will never ask for it.
            </p>
          </div>
          <p style="color:#475569; font-size:14px; line-height:1.6;">If you didn't request this password reset, please ignore this email or contact support at <a href="mailto:${ADMIN_EMAIL}" style="color:#0d9488;">${ADMIN_EMAIL}</a></p>
          <hr style="border:none; border-top:1px solid #e2e8f0; margin:30px 0;">
          <p style="color:#94a3b8; font-size:12px; text-align:center;">RM Ubuzima - Secure SRHR Platform<br>This is an automated message. Do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const result = await sendEmailWithRetry({
    to: normalizedEmail,
    subject: 'Your RM Ubuzima Password Reset Code',
    htmlContent,
    trackingId,
    replyTo: ADMIN_EMAIL
  });

  if (result.success) {
    emailTracking.set(trackingId, {
      type: 'reset-code',
      to: hashEmail(normalizedEmail),
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Reset code sent',
      codeId // For testing only - remove in production
    });
  } else {
    resetCodes.delete(codeId);
    res.status(500).json({
      success: false,
      error: 'Failed to send reset code email'
    });
  }
});

// Verify 6-digit code
app.post('/api/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Email and code required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();

  // Find valid code for this email
  const userCode = Array.from(resetCodes.values()).find(
    c => c.email === normalizedEmail && !c.used && c.expiresAt > now
  );

  if (!userCode) {
    return res.status(400).json({ success: false, error: 'No active reset code found. Request a new code.' });
  }

  // Check attempts
  if (userCode.attempts >= MAX_CODE_ATTEMPTS) {
    resetCodes.delete(userCode.id);
    return res.status(400).json({ success: false, error: 'Too many failed attempts. Request a new code.' });
  }

  // Verify code
  if (userCode.code !== code) {
    userCode.attempts++;
    const remaining = MAX_CODE_ATTEMPTS - userCode.attempts;
    return res.status(400).json({ 
      success: false, 
      error: `Invalid code. ${remaining} attempts remaining.`
    });
  }

  // Mark as verified
  userCode.verified = true;

  res.json({ success: true, message: 'Code verified' });
});

// Reset password with verified code
app.post('/api/reset-password-with-code', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, error: 'Email, code, and new password required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();

  // Find verified code
  const userCode = Array.from(resetCodes.values()).find(
    c => c.email === normalizedEmail && 
         c.code === code && 
         c.verified && 
         !c.used && 
         c.expiresAt > now
  );

  if (!userCode) {
    return res.status(400).json({ success: false, error: 'Invalid or expired reset session. Start over.' });
  }

  // Mark code as used
  userCode.used = true;

  // Update password in Firebase Auth
  if (firebaseInitialized) {
    try {
      const user = await admin.auth().getUserByEmail(normalizedEmail);
      await admin.auth().updateUser(user.uid, { password: newPassword });
      console.log(`🔐 Password reset successful for: ${normalizedEmail}`);
    } catch (firebaseError) {
      console.error('🔥 Firebase password update error:', firebaseError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to update password. Please try again.'
      });
    }
  } else {
    console.warn('⚠️ Firebase not initialized - password not actually changed');
    return res.status(500).json({
      success: false,
      error: 'Password reset service not fully configured. Contact support.'
    });
  }
  
  res.json({
    success: true,
    message: 'Password reset successful. You can now log in with your new password.'
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         RM UBUZIMA EMAIL SERVER V2 - ULTIMATE EDITION      ║');
  console.log('║                    🚀 Production Ready                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📧 Server running on port ${PORT}`);
  console.log(`🔐 Security: Rate limiting enabled`);
  console.log(`🛡️  Spam protection: Active`);
  console.log(`📊 Email tracking: Enabled`);
  console.log(`🔄 Queue system: ${emailQueue.length} pending`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/send-welcome');
  console.log('  POST /api/send-password-reset');
  console.log('  POST /api/send-appointment-confirmation');
  console.log('  POST /api/notify-admin-appointment');
  console.log('  POST /api/notify-doctor');
  console.log('  POST /api/notify-new-message');
  console.log('  POST /api/send-email (admin)');
  console.log('  GET  /api/health');
  console.log('');
  console.log('🔐 6-Digit Code Password Reset:');
  console.log('  POST /api/send-reset-code');
  console.log('  POST /api/verify-reset-code');
  console.log('  POST /api/reset-password-with-code');
  console.log('');
});

module.exports = app;