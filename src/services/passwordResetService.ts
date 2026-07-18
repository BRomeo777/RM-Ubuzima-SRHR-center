import { 
  getAuth, 
  signInWithEmailAndPassword,
  updatePassword,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { app } from './firebaseConfig';

const auth = getAuth(app);
const db = getFirestore(app);

const CODE_EXPIRY_MINUTES = 15;
const MAX_ATTEMPTS = 3;

interface ResetCodeData {
  code: string;
  email: string;
  attempts: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  used: boolean;
}

/**
 * Generate a 6-digit verification code
 */
export function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store reset code in Firestore
 */
export async function storeResetCode(email: string, code: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const codeId = `${normalizedEmail}_${Date.now()}`;
  
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + CODE_EXPIRY_MINUTES * 60 * 1000);
  
  const codeData: ResetCodeData = {
    code,
    email: normalizedEmail,
    attempts: 0,
    createdAt: now,
    expiresAt,
    used: false,
  };
  
  // Store in passwordResetCodes collection
  await setDoc(doc(db, 'passwordResetCodes', codeId), codeData);
  
  // Also store a lookup by email for easy retrieval
  await setDoc(doc(db, 'passwordResetCodesByEmail', normalizedEmail), {
    activeCodeId: codeId,
    createdAt: now,
  });
}

/**
 * Verify reset code
 */
export async function verifyResetCode(email: string, code: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Get the active code for this email
  const lookupDoc = await getDoc(doc(db, 'passwordResetCodesByEmail', normalizedEmail));
  
  if (!lookupDoc.exists()) {
    throw new Error('No reset code found. Please request a new code.');
  }
  
  const { activeCodeId } = lookupDoc.data();
  const codeDocRef = doc(db, 'passwordResetCodes', activeCodeId);
  const codeDoc = await getDoc(codeDocRef);
  
  if (!codeDoc.exists()) {
    throw new Error('Reset code not found.');
  }
  
  const codeData = codeDoc.data() as ResetCodeData;
  const now = Timestamp.now();
  
  // Check if code is expired
  if (now.toMillis() > codeData.expiresAt.toMillis()) {
    await deleteDoc(codeDocRef);
    await deleteDoc(doc(db, 'passwordResetCodesByEmail', normalizedEmail));
    throw new Error('Code has expired. Please request a new code.');
  }
  
  // Check if code is already used
  if (codeData.used) {
    throw new Error('Code has already been used. Please request a new code.');
  }
  
  // Increment attempts
  const newAttempts = codeData.attempts + 1;
  await setDoc(codeDocRef, { attempts: newAttempts }, { merge: true });
  
  // Check max attempts
  if (newAttempts > MAX_ATTEMPTS) {
    await deleteDoc(codeDocRef);
    await deleteDoc(doc(db, 'passwordResetCodesByEmail', normalizedEmail));
    throw new Error('Too many failed attempts. Please request a new code.');
  }
  
  // Verify code
  if (codeData.code !== code) {
    const remainingAttempts = MAX_ATTEMPTS - newAttempts;
    throw new Error(`Invalid code. ${remainingAttempts} attempts remaining.`);
  }
  
  // Mark code as verified (but not used yet - will be used after password reset)
  return true;
}

/**
 * Reset password with code verification
 */
export async function resetPasswordWithCode(
  email: string, 
  code: string, 
  newPassword: string
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // First verify the code
  await verifyResetCode(normalizedEmail, code);
  
  // Get the active code ID
  const lookupDoc = await getDoc(doc(db, 'passwordResetCodesByEmail', normalizedEmail));
  
  if (!lookupDoc.exists()) {
    throw new Error('Reset session expired. Please start over.');
  }
  
  const { activeCodeId } = lookupDoc.data();
  
  // Mark code as used
  await setDoc(doc(db, 'passwordResetCodes', activeCodeId), { used: true }, { merge: true });
  
  // Clean up
  await deleteDoc(doc(db, 'passwordResetCodesByEmail', normalizedEmail));
  
  // Note: We can't directly set the password without the user's current credentials
  // The actual password reset must happen on the backend or through a secure process
  // For now, we'll throw an error directing to use the proper flow
  throw new Error('Password reset requires backend verification. Please use the email link method or contact support.');
}

/**
 * Check if email exists in Firebase Auth
 * Note: For security, Firebase doesn't expose this directly
 * We'll check by attempting to send a password reset
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Send reset code email via custom backend
 * This is a mock - in production, you'd call your backend API
 */
export async function sendResetCodeEmail(email: string, code: string): Promise<void> {
  // Store the code first
  await storeResetCode(email, code);
  
  // In production, this would be an API call to your backend
  // which sends the email via SendGrid/AWS SES/etc.
  // For now, we log it (in production, you'd integrate with your email service)
  console.log(`[Password Reset] Code for ${email}: ${code}`);
  
  // Simulate API call to backend
  // const response = await fetch('/api/send-reset-code', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, code })
  // });
  // 
  // if (!response.ok) {
  //   throw new Error('Failed to send reset code email');
  // }
}

export { CODE_EXPIRY_MINUTES, MAX_ATTEMPTS };
