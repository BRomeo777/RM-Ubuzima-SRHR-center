import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, type User as FirebaseUser, signInAnonymously, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { app } from './firebaseConfig';

// Get Auth instance from initialized app
const auth = getAuth(app);

// Validate Firebase configuration on load
const validateFirebaseConfig = () => {
  const config = app.options;
  const missingFields = [];
  if (!config.apiKey) missingFields.push('apiKey');
  if (!config.authDomain) missingFields.push('authDomain');
  if (!config.projectId) missingFields.push('projectId');
  
  if (missingFields.length > 0) {
    console.error('[Firebase Auth] Missing configuration fields:', missingFields);
    console.error('[Firebase Auth] Firebase Auth will not work. Check your environment variables.');
  } else {
    console.log('[Firebase Auth] Configuration validated successfully');
  }
};

validateFirebaseConfig();

// Current user cache
let currentUser: FirebaseUser | null = null;

// Listen to auth state changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    console.log('[Firebase Auth] User state changed - logged in:', user.uid);
  } else {
    console.log('[Firebase Auth] User state changed - logged out');
  }
});

/**
 * Register a new user with email and password
 */
export async function registerUser(email: string, password: string, displayName: string, photoURL: string): Promise<FirebaseUser | null> {
  try {
    console.log('[Firebase Auth] Attempting to register user:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('[Firebase Auth] User created successfully:', userCredential.user.uid);
    
    // Update profile with display name and photo
    await updateProfile(userCredential.user, {
      displayName,
      photoURL
    });
    console.log('[Firebase Auth] Profile updated successfully');
    
    return userCredential.user;
  } catch (error: any) {
    console.error('[Firebase Auth] Registration error:', error.code, error.message);
    if (error.code === 'auth/configuration-not-found') {
      throw new Error('Firebase Auth not enabled. Please enable Email/Password authentication in your Firebase Console (Authentication > Sign-in method).');
    } else if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use at least 6 characters');
    } else if (error.code === 'auth/invalid-api-key') {
      throw new Error('Invalid Firebase API key. Please check your environment variables.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email/password sign up is not enabled. Please contact support.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    } else if (error.code === 'auth/internal-error') {
      throw new Error('Firebase internal error. Please try again later.');
    }
    throw new Error(`Registration failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(email: string, password: string): Promise<FirebaseUser | null> {
  try {
    console.log('[Firebase Auth] Attempting login for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('[Firebase Auth] Login successful:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error('[Firebase Auth] Login error:', error.code, error.message);
    if (error.code === 'auth/configuration-not-found') {
      throw new Error('Firebase Auth not enabled. Please enable Email/Password authentication in your Firebase Console (Authentication > Sign-in method).');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('Account not found. Please sign up first.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Invalid password. Please try again.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password. Please check your credentials.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address');
    } else if (error.code === 'auth/invalid-api-key') {
      throw new Error('Invalid Firebase API key. Please check your environment variables.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email/password login is not enabled. Please contact support.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    } else if (error.code === 'auth/internal-error') {
      throw new Error('Firebase internal error. Please try again later.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    }
    throw new Error(`Login failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error logging out:', error);
    throw new Error('Failed to log out');
  }
}

/**
 * Sign in anonymously for chat users
 */
export async function signInAnonymous(): Promise<FirebaseUser | null> {
  try {
    console.log('[Firebase Auth] Attempting anonymous sign-in...');
    const userCredential = await signInAnonymously(auth);
    console.log('[Firebase Auth] Anonymous sign-in successful:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error('[Firebase Auth] Anonymous sign-in error:', error.code, error.message);
    if (error.code === 'auth/configuration-not-found') {
      throw new Error('Firebase Auth not enabled. Please enable Anonymous authentication in your Firebase Console (Authentication > Sign-in method).');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Anonymous sign-in is not enabled. Please enable it in Firebase Console.');
    }
    throw new Error(`Anonymous sign-in failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get current user
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  return !!auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Send password reset email (Firebase Auth built-in - FREE!)
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    console.log('[Firebase Auth] Sending password reset email to:', email);
    await sendPasswordResetEmail(auth, email);
    console.log('[Firebase Auth] Password reset email sent successfully');
  } catch (error: any) {
    console.error('[Firebase Auth] Password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address');
    } else {
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }
}

/**
 * Send email verification (Firebase Auth built-in - FREE!)
 */
export async function verifyEmail(user?: FirebaseUser | null): Promise<void> {
  const targetUser = user || auth.currentUser;
  if (!targetUser) {
    throw new Error('No user is currently logged in');
  }
  
  try {
    console.log('[Firebase Auth] Sending email verification to:', targetUser.email);
    await sendEmailVerification(targetUser);
    console.log('[Firebase Auth] Email verification sent successfully');
  } catch (error: any) {
    console.error('[Firebase Auth] Email verification error:', error);
    throw new Error(error.message || 'Failed to send verification email');
  }
}

/**
 * Get the Firebase Auth instance
 */
export function getFirebaseAuth() {
  return auth;
}

export { auth };
