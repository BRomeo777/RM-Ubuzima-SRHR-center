// App Configuration
// Central place for app-wide settings

export const APP_CONFIG = {
  // App Email - used for sending emails to users
  email: 'rmubuzima@gmail.com',
  
  // App Name
  name: 'RM Ubuzima',
  
  // Support/Contact
  supportEmail: 'rmubuzima@gmail.com',
  
  // Social/External links
  website: '',
  
  // Feature flags
  features: {
    emailNotifications: true,
    passwordReset: true,
    anonymousMode: true,
  }
};

// Helper to get app email
export const getAppEmail = (): string => APP_CONFIG.email;

// Helper to get support email
export const getSupportEmail = (): string => APP_CONFIG.supportEmail;
