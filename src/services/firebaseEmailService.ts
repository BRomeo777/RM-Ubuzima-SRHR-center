/**
 * RM Ubuzima Firebase Email Service
 * Optimal solution using Firebase Cloud Functions + Brevo
 * No external server needed!
 */

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from './firebaseConfig';

// Initialize Functions
const functions = getFunctions(app);

// Use emulator in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Callable Functions
const sendPasswordResetEmailFn = httpsCallable(functions, 'sendPasswordResetEmail');
const sendAppointmentConfirmationFn = httpsCallable(functions, 'sendAppointmentConfirmation');
const sendWelcomeEmailFn = httpsCallable(functions, 'sendWelcomeEmail');
const checkEmailHealthFn = httpsCallable(functions, 'checkEmailHealth');

// ============================================
// EMAIL SERVICE - OPTIMAL & SIMPLIFIED
// ============================================

export const firebaseEmailService = {
  /**
   * Send password reset email
   */
  async sendPasswordReset(data: {
    email: string;
    name?: string;
    resetUrl: string;
  }) {
    try {
      const result = await sendPasswordResetEmailFn(data);
      return result.data as { success: boolean; messageId?: string };
    } catch (error: any) {
      console.error('Password reset email failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send password reset email'
      };
    }
  },

  /**
   * Send appointment confirmation
   */
  async sendAppointmentConfirmation(data: {
    patientEmail: string;
    patientName: string;
    doctorName: string;
    specialty: string;
    appointmentDate: string;
    appointmentTime: string;
    location: string;
    referenceNumber: string;
    manageLink?: string;
  }) {
    try {
      const result = await sendAppointmentConfirmationFn(data);
      return result.data as { success: boolean; messageId?: string };
    } catch (error: any) {
      console.error('Appointment confirmation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send appointment confirmation'
      };
    }
  },

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(data: {
    email: string;
    name: string;
    appLink?: string;
  }) {
    try {
      const result = await sendWelcomeEmailFn({
        ...data,
        appLink: data.appLink || 'https://rm-ubuzima.netlify.app'
      });
      return result.data as { success: boolean; messageId?: string };
    } catch (error: any) {
      console.error('Welcome email failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send welcome email'
      };
    }
  },

  /**
   * Check email service health
   */
  async checkHealth() {
    try {
      const result = await checkEmailHealthFn({});
      return result.data as { status: string; brevoConfigured: boolean };
    } catch (error: any) {
      return { status: 'error', error: error.message, brevoConfigured: false };
    }
  }
};

// For backwards compatibility
export const sendPasswordReset = firebaseEmailService.sendPasswordReset;
export const sendAppointmentConfirmation = firebaseEmailService.sendAppointmentConfirmation;
export const sendWelcomeEmail = firebaseEmailService.sendWelcomeEmail;

export default firebaseEmailService;
