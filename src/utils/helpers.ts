import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function generateReferenceNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `RM-${timestamp}${random}`;
}

const RWANDAN_NAMES = [
  'Umwiza', 'Imena', 'Keza', 'Mugisha', 'Nziza', 'Teta', 'Gaju',
  'Shyaka', 'Manzi', 'Uwase', 'Mukamana', 'Hirwa', 'Ndayisaba',
  'Mutesi', 'Mutoni', 'Ingabire', 'Uwineza', 'Dusabe', 'Muhawenimana'
];

export function generateAnonymousName(): string {
  const name = RWANDAN_NAMES[Math.floor(Math.random() * RWANDAN_NAMES.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${name}-${number}`;
}

import { getRandomAvatar as getRandomProfessionalAvatar } from './avatar';

// Re-export for backward compatibility - now returns professional DiceBear avatars
export { getRandomProfessionalAvatar as getRandomAvatar };

// Old emoji avatars - deprecated, kept for backward compatibility only
export const EMOJI_AVATARS: string[] = [];

export function formatPhoneNumberRwanda(phone: string): string {
  let cleaned = phone.replace(/\s/g, '').replace(/-/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '+250' + cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('+250')) {
    cleaned = '+250' + cleaned;
  }
  
  return cleaned;
}

export function validateRwandanPhone(phone: string): boolean {
  const formatted = formatPhoneNumberRwanda(phone);
  const regex = /^\+250[78]\d{7}$/;
  return regex.test(formatted);
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(date);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateFileSize(file: File): { valid: boolean; message?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit`,
    };
  }
  return { valid: true };
}
