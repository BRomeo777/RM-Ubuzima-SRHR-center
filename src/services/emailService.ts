import type { Appointment, DirectMessage } from '../types';

// ============================================
// RM Ubuzima Email Service V2 - Ultimate Edition
// Production-ready with beautiful designs & anti-spam
// ============================================

// Get API URL from window object (set in index.html) or fallback
const EMAIL_API_URL = (window as any).EMAIL_API_URL || 'https://rm-ubuzima-email.onrender.com/api';

// Default timeout for requests (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// Email preferences storage key
const EMAIL_PREFS_KEY = 'rm-ubuzima-email-preferences';

// ============================================
// EMAIL PREFERENCES SYSTEM
// ============================================

export interface EmailPreferences {
  appointmentConfirmations: boolean;
  newMessages: boolean;
  facilitatorNotifications: boolean;
  securityAlerts: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  lastUpdated: string;
}

const defaultPreferences: EmailPreferences = {
  appointmentConfirmations: true,
  newMessages: true,
  facilitatorNotifications: true,
  securityAlerts: true,
  weeklyDigest: false,
  marketingEmails: false,
  lastUpdated: new Date().toISOString()
};

/**
 * Get user email preferences
 */
export function getEmailPreferences(): EmailPreferences {
  try {
    const stored = localStorage.getItem(EMAIL_PREFS_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error loading email preferences:', e);
  }
  return { ...defaultPreferences };
}

/**
 * Save user email preferences
 */
export function saveEmailPreferences(prefs: Partial<EmailPreferences>): void {
  try {
    const current = getEmailPreferences();
    const updated = {
      ...current,
      ...prefs,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(EMAIL_PREFS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving email preferences:', e);
  }
}

/**
 * Check if specific email type is enabled
 */
export function isEmailEnabled(type: keyof EmailPreferences): boolean {
  const prefs = getEmailPreferences();
  return prefs[type] as boolean;
}

// Helper function for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - email server may be slow or unavailable');
    }
    throw error;
  }
}

// Helper to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

// ============================================
// EMAIL API FUNCTIONS
// ============================================

/**
 * Check if email server is healthy
 */
export async function checkEmailHealth(): Promise<{ status: string; error?: string }> {
  try {
    const response = await fetchWithTimeout(`${EMAIL_API_URL.replace('/api', '')}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }, 10000);
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Email health check failed:', error);
    return { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send password reset email
 * CRITICAL: Must work reliably for user authentication
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<{ success: boolean; message?: string; error?: string; messageId?: string }> {
  try {
    const response = await fetchWithTimeout(`${EMAIL_API_URL}/send-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        resetToken,
        resetUrl: `https://rm-ubuzima.netlify.app/reset-password?token=${encodeURIComponent(resetToken)}`
      })
    });
    
    const result = await handleResponse(response);
    
    if (result.success) {
      console.log('Password reset email sent:', result.messageId);
      return { 
        success: true, 
        message: 'Password reset email sent successfully',
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to send password reset email');
    }
  } catch (error) {
    console.error('Password reset email error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send password reset email'
    };
  }
}

/**
 * Send appointment confirmation to patient
 */
export async function sendAppointmentConfirmation(
  appointment: Appointment
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetchWithTimeout(`${EMAIL_API_URL}/send-appointment-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientEmail: appointment.email,
        patientName: appointment.isAnonymous ? 'Anonymous Patient' : (appointment.name || 'Patient'),
        doctorName: 'Doctor', // You can customize this based on your doctor data
        specialty: 'General Medicine',
        appointmentDate: appointment.preferredDate,
        appointmentTime: appointment.preferredTime,
        location: 'RM Ubuzima Medical Center',
        referenceNumber: appointment.referenceNumber,
        manageLink: 'https://rm-ubuzima.netlify.app/services'
      })
    });
    
    const result = await handleResponse(response);
    
    if (result.success) {
      console.log('Appointment confirmation sent:', result.messageId);
      return { 
        success: true, 
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to send appointment confirmation');
    }
  } catch (error) {
    console.error('Appointment confirmation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send appointment confirmation'
    };
  }
}

/**
 * Notify admin about new appointment
 */
export async function notifyAdminAboutAppointment(
  appointment: Appointment
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetchWithTimeout(`${EMAIL_API_URL}/notify-admin-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: appointment.isAnonymous ? 'Anonymous' : (appointment.name || 'Not provided'),
        patientEmail: appointment.email || 'Not provided',
        patientPhone: appointment.phone,
        doctorName: 'Doctor',
        appointmentDate: appointment.preferredDate,
        appointmentTime: appointment.preferredTime,
        referenceNumber: appointment.referenceNumber,
        reason: appointment.reason
      })
    });
    
    const result = await handleResponse(response);
    
    if (result.success) {
      console.log('Admin notification sent:', result.messageId);
      return { 
        success: true, 
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to notify admin');
    }
  } catch (error) {
    console.error('Admin notification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to notify admin'
    };
  }
}

/**
 * Notify the actual doctor about new appointment
 * This uses the doctor email set in Admin Panel → Services
 */
export async function notifyDoctorAboutAppointment(
  appointment: Appointment,
  doctorEmail: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!doctorEmail) {
    console.warn('No doctor email configured, skipping doctor notification');
    return { success: false, error: 'No doctor email configured' };
  }

  try {
    // Use the generic email endpoint to send to doctor
    const response = await fetchWithTimeout(`${EMAIL_API_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: doctorEmail,
        subject: `New Appointment: ${appointment.isAnonymous ? 'Anonymous' : (appointment.name || 'Patient')} - ${appointment.referenceNumber}`,
        htmlContent: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 30px; text-align: center;">
              <h2 style="color: white; margin: 0;">New Patient Appointment</h2>
            </div>
            <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;">
              <p><strong>Reference:</strong> #${appointment.referenceNumber}</p>
              <p><strong>Patient:</strong> ${appointment.isAnonymous ? 'Anonymous' : (appointment.name || 'Not provided')}</p>
              <p><strong>Phone:</strong> ${appointment.phone}</p>
              <p><strong>Email:</strong> ${appointment.email || 'Not provided'}</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488;">
                <p style="margin: 5px 0;"><strong>Date:</strong> ${appointment.preferredDate}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${appointment.preferredTime}</p>
              </div>
              <p><strong>Reason:</strong></p>
              <p style="background: white; padding: 15px; border-radius: 8px;">${appointment.reason}</p>
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #64748b; font-size: 14px;">Please contact the patient to confirm the appointment.</p>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
              <p>RM Ubuzima Appointment System</p>
            </div>
          </div>
        `
      })
    });
    
    const result = await handleResponse(response);
    
    if (result.success) {
      console.log('Doctor notification sent:', result.messageId);
      return { 
        success: true, 
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to notify doctor');
    }
  } catch (error) {
    console.error('Doctor notification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to notify doctor'
    };
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetchWithTimeout(`${EMAIL_API_URL}/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        appLink: 'https://rm-ubuzima.netlify.app'
      })
    });
    
    const result = await handleResponse(response);
    
    if (result.success) {
      console.log('Welcome email sent:', result.messageId);
      return { 
        success: true, 
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to send welcome email');
    }
  } catch (error) {
    console.error('Welcome email error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send welcome email'
    };
  }
}

// ============================================
// BACKWARD COMPATIBILITY - Legacy Functions
// ============================================

import { usePersistentStore } from '../store';

/**
 * Send appointment email notifications
 * Sends patient confirmation and admin notification
 * Doctor notification is now handled manually by admin through the Appointments Tab
 */
export async function sendAppointmentEmail(
  appointment: Appointment, 
  _doctorEmail?: string // Kept for backward compatibility but not used
): Promise<{ success: boolean; error?: string }> {
  // Send patient confirmation
  const patientResult = await sendAppointmentConfirmation(appointment);
  
  // Notify admin (rmubuzima@gmail.com)
  const adminResult = await notifyAdminAboutAppointment(appointment);
  
  // Log results
  console.log('Appointment email results:', {
    patient: patientResult.success,
    admin: adminResult.success,
    message: 'Doctor will be contacted manually by admin'
  });
  
  // Return success if at least patient and admin notifications succeeded
  if (patientResult.success && adminResult.success) {
    return { success: true };
  } else {
    return { 
      success: false, 
      error: patientResult.error || adminResult.error || 'Failed to send appointment emails'
    };
  }
}

/**
 * Legacy Formspree function - redirects to new API
 * Kept for backward compatibility but uses new email system
 */
export async function sendFormspreeAppointment(
  appointment: Appointment,
  _formspreeEndpoint: string // Parameter kept for compatibility but not used
): Promise<{ success: boolean; error?: string }> {
  return sendAppointmentEmail(appointment);
}

// ============================================
// NEW V2 FEATURES - FACILITATOR NOTIFICATIONS
// ============================================

/**
 * Notify facilitator about new direct message
 * Uses new V2 endpoint with beautiful email design
 */
export async function notifyFacilitatorOfNewMessage(
  facilitatorEmail: string,
  facilitatorName: string,
  senderName: string,
  messagePreview: string,
  context: 'inbox' | 'shangazi' = 'inbox',
  conversationLink?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // Check if user has disabled this notification type
  if (!isEmailEnabled('facilitatorNotifications')) {
    console.log('Facilitator notifications disabled, skipping');
    return { success: false, error: 'Notifications disabled' };
  }

  try {
    const response = await fetchWithTimeout(`${EMAIL_API_URL}/notify-new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilitatorEmail,
        facilitatorName,
        senderName,
        messagePreview,
        context,
        conversationLink: conversationLink || `${window.location.origin}/inbox`
      })
    });
    
    const result = await handleResponse(response);
    
    if (result.success) {
      console.log('Facilitator notification sent:', result.messageId);
      return { 
        success: true, 
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to notify facilitator');
    }
  } catch (error) {
    console.error('Facilitator notification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to notify facilitator'
    };
  }
}

/**
 * Send security alert email
 */
export async function sendSecurityAlert(
  email: string,
  name: string,
  alertType: 'login' | 'password-changed' | 'suspicious-activity',
  device: string,
  location: string,
  time: string,
  actionLink?: string,
  actionText?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // Check if user has disabled security alerts
  if (!isEmailEnabled('securityAlerts')) {
    console.log('Security alerts disabled, skipping');
    return { success: false, error: 'Security alerts disabled' };
  }

  try {
    const response = await fetchWithTimeout(`${EMAIL_API_URL}/send-security-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        alertType,
        device,
        location,
        time,
        actionLink,
        actionText
      })
    });
    
    const result = await handleResponse(response);
    
    if (result.success) {
      console.log('Security alert sent:', result.messageId);
      return { 
        success: true, 
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to send security alert');
    }
  } catch (error) {
    console.error('Security alert error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send security alert'
    };
  }
}

/**
 * Send weekly digest to facilitators
 */
export async function sendWeeklyDigest(
  facilitatorEmail: string,
  facilitatorName: string,
  stats: { messages: number; usersHelped: number },
  period: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // Check if user has enabled weekly digest
  if (!isEmailEnabled('weeklyDigest')) {
    console.log('Weekly digest disabled, skipping');
    return { success: false, error: 'Weekly digest disabled' };
  }

  try {
    const response = await fetchWithTimeout(`${EMAIL_API_URL}/send-weekly-digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilitatorEmail,
        facilitatorName,
        stats,
        period,
        dashboardLink: `${window.location.origin}/facilitator-panel`
      })
    });
    
    const result = await handleResponse(response);
    
    if (result.success) {
      console.log('Weekly digest sent:', result.messageId);
      return { 
        success: true, 
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to send weekly digest');
    }
  } catch (error) {
    console.error('Weekly digest error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send weekly digest'
    };
  }
}

/**
 * Send facilitator request notification to admin
 */
export async function notifyAdminOfFacilitatorRequest(
  requesterName: string,
  requesterEmail: string,
  reason: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetchWithTimeout(`${EMAIL_API_URL}/notify-facilitator-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminName: 'Admin',
        requesterName,
        requesterEmail,
        requestReason: reason,
        reviewLink: `${window.location.origin}/admin-panel`
      })
    });
    
    const result = await handleResponse(response);
    
    if (result.success) {
      console.log('Facilitator request notification sent:', result.messageId);
      return { 
        success: true, 
        messageId: result.messageId
      };
    } else {
      throw new Error(result.error || 'Failed to notify admin');
    }
  } catch (error) {
    console.error('Facilitator request notification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to notify admin'
    };
  }
}

// ============================================
// SMART NOTIFICATION DISPATCHER
// ============================================

/**
 * Smart message notification - checks preferences and sends appropriately
 */
export async function sendMessageNotification(
  message: DirectMessage,
  facilitatorEmail: string,
  facilitatorName: string,
  context: 'inbox' | 'shangazi' = 'inbox'
): Promise<{ success: boolean; error?: string }> {
  // Don't send if notifications disabled
  if (!isEmailEnabled('newMessages')) {
    return { success: false, error: 'Notifications disabled' };
  }

  // Debounce: Only send email if message is at least 5 minutes old
  // This prevents spam when user is actively chatting
  const messageTime = new Date(message.timestamp).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (now - messageTime < fiveMinutes) {
    console.log('Message too recent, skipping email notification');
    return { success: false, error: 'Message too recent' };
  }

  const result = await notifyFacilitatorOfNewMessage(
    facilitatorEmail,
    facilitatorName,
    message.senderName,
    message.content,
    context
  );

  return result;
}

// ============================================
// EMAIL VALIDATION & UTILITIES
// ============================================

/**
 * Validate email format
 */
export function isValidEmailFormat(email: string): boolean {
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return regex.test(email.trim()) && email.length <= 254;
}

/**
 * Mask email for privacy (e.g., j***@gmail.com)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = localPart.charAt(0) + '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Get email server status
 */
export async function getEmailServerStatus(): Promise<{
  healthy: boolean;
  version?: string;
  queueSize?: number;
  error?: string;
}> {
  try {
    const response = await fetchWithTimeout(
      `${EMAIL_API_URL.replace('/api', '')}/api/health`,
      { method: 'GET' },
      10000
    );
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      healthy: data.status === 'OK',
      version: data.version,
      queueSize: data.queueSize
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Send multiple emails with rate limiting
 */
export async function sendBatchEmails(
  emails: Array<{
    type: 'welcome' | 'appointment' | 'notification';
    to: string;
    data: Record<string, any>;
  }>
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{ to: string; success: boolean; error?: string }>;
}> {
  const results: Array<{ to: string; success: boolean; error?: string }> = [];
  let successful = 0;
  let failed = 0;

  // Process in batches of 5 with 1 second delay between batches
  const BATCH_SIZE = 5;
  const DELAY_MS = 1000;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (email) => {
        // Dispatch based on type
        let result;
        switch (email.type) {
          case 'welcome':
            result = await sendWelcomeEmail(email.to, email.data.name);
            break;
          case 'appointment':
            result = await sendAppointmentConfirmation(email.data.appointment);
            break;
          default:
            throw new Error(`Unknown email type: ${email.type}`);
        }
        
        return {
          to: maskEmail(email.to),
          success: result.success,
          error: result.error
        };
      })
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.success) successful++;
        else failed++;
      } else {
        results.push({ to: 'unknown', success: false, error: result.reason });
        failed++;
      }
    });

    // Delay between batches (except last)
    if (i + BATCH_SIZE < emails.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return {
    total: emails.length,
    successful,
    failed,
    results
  };
}
