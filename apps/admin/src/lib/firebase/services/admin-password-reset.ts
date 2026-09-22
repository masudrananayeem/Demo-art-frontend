import { auth } from '../config';
import { sendPasswordResetEmail } from 'firebase/auth';

/**
 * Send password reset email to user
 */
export async function resetUserPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send password reset email' };
  }
}
