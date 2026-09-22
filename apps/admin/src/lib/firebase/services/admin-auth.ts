import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth, db, getAuthInstance } from '../config';
import { collection, doc, getDoc, getDocs, limit, query, where, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getApprovedAdminRequestByEmail } from './admin-requests';
import { createAdmin } from './admin-admins';
import { AdminPermissions } from '@/types/admin';

export type AdminRole = 'Admin' | 'Moderator' | 'Seller';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions?: AdminPermissions;
  avatar?: string;
}

/**
 * Check if a URL is a Cloudinary URL
 * Used to prevent overwriting uploaded Cloudinary avatars with Google photos
 */
function isCloudinaryUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return url.includes('cloudinary.com');
}

/**
 * Sign in admin with email and password
 * Only allows access if user has an adminUsers document in Firestore
 */
export async function adminSignIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await user.getIdToken(true);

    const adminData = await getAdminUserData(user.uid, user.email || undefined);
    if (!adminData) {
      await signOut(auth);
      return { 
        success: false, 
        error: 'Access denied. This account does not have admin privileges. Please request admin access from an administrator.' 
      };
    }

    // Check if admin account is active (if status field exists)
    const adminDoc = await getDoc(doc(db, 'adminUsers', user.uid));
    if (adminDoc.exists()) {
      const adminDocData = adminDoc.data();
      const status = adminDocData.status;
      if (status === 'suspended' || status === 'inactive' || status === 'deleted') {
        await signOut(auth);
        return { 
          success: false, 
          error: `Access denied. Your admin account has been ${status === 'deleted' ? 'deleted' : status}. Please contact an administrator.` 
        };
      }
    }

    // Update lastLogin timestamp for this admin (non-blocking)
    try {
      await updateDoc(doc(db, 'adminUsers', user.uid), {
        lastLogin: serverTimestamp(),
      });
    } catch {
      // Ignore errors; login should still succeed even if lastLogin fails to update
    }

    return { success: true };
  } catch (error: any) {
    try {
      await signOut(auth);
    } catch (signOutError) {
    }
    return { success: false, error: error.message || 'Failed to sign in' };
  }
}

/**
 * Sign out admin
 */
export async function adminSignOut(): Promise<void> {
  await signOut(auth);
}

/**
 * Get current admin user
 */
export function getCurrentAdmin(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Get admin user data from Firestore
 * Also checks for pending admin accounts by email and links them to the UID
 */
export async function getAdminUserData(userId: string, userEmail?: string): Promise<AdminUser | null> {
  try {
    const adminDoc = await getDoc(doc(db, 'adminUsers', userId));
    if (adminDoc.exists()) {
      const adminData = adminDoc.data();
      if (adminData.status === 'deleted') {
        return null;
      }
      
      // Only auto-set avatar from Firebase Auth if admin explicitly has no avatar
      // Don't overwrite if avatar is an empty string (user might have removed it)
      // Never overwrite Cloudinary URLs (user-uploaded images)
      if ((!adminData.avatar || adminData.avatar === '') && userEmail) {
        try {
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.uid === userId && currentUser.photoURL) {
            // Only update if avatar is truly missing (not just empty string from user removal)
            // Check if avatar field doesn't exist in the document
            // AND ensure it's not a Cloudinary URL (preserve user uploads)
            const currentAvatar = adminData.avatar || '';
            const isCurrentCloudinary = isCloudinaryUrl(currentAvatar);
            
            if (!isCurrentCloudinary && (!('avatar' in adminData) || adminData.avatar === '')) {
              await updateDoc(doc(db, 'adminUsers', userId), {
                avatar: currentUser.photoURL,
              });
              return { id: adminDoc.id, ...adminData, avatar: currentUser.photoURL } as AdminUser;
            }
          }
        } catch (error) {
          // Ignore errors - don't fail if avatar update fails
        }
      }
      
      return { id: adminDoc.id, ...adminData } as AdminUser;
    }

    if (userEmail) {
      try {
        const approvedRequest = await getApprovedAdminRequestByEmail(userEmail);
        if (approvedRequest) {
          const existingAdminDoc = await getDoc(doc(db, 'adminUsers', userId));
          if (existingAdminDoc.exists()) {
            return { id: existingAdminDoc.id, ...existingAdminDoc.data() } as AdminUser;
          }
          
          const adminRef = doc(db, 'adminUsers', userId);
          const adminData: any = {
            name: approvedRequest.name,
            email: approvedRequest.email,
            role: approvedRequest.assignedRole || approvedRequest.requestedRole || 'Moderator',
            status: 'active',
            createdAt: serverTimestamp(),
          };
          
          if (approvedRequest.photoURL) {
            adminData.avatar = approvedRequest.photoURL;
          } else {
            try {
              const currentUser = auth.currentUser;
              if (currentUser && currentUser.uid === userId && currentUser.photoURL) {
                adminData.avatar = currentUser.photoURL;
              }
            } catch (error) {
            }
          }
          
          if (approvedRequest.assignedPermissions && 
              typeof approvedRequest.assignedPermissions === 'object' &&
              Object.keys(approvedRequest.assignedPermissions).length > 0) {
            adminData.permissions = approvedRequest.assignedPermissions;
          }
          
            try {
            await setDoc(adminRef, adminData, { merge: true });
            
            try {
              const tempDocId = `temp_${approvedRequest.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
              const tempDocRef = doc(db, 'adminUsers', tempDocId);
              const tempDoc = await getDoc(tempDocRef);
              if (tempDoc.exists()) {
                await deleteDoc(tempDocRef);
              }
            } catch (cleanupError: any) {
            }
            
            const newAdminDoc = await getDoc(adminRef);
            if (newAdminDoc.exists()) {
              return { id: newAdminDoc.id, ...newAdminDoc.data() } as AdminUser;
            }
          } catch (createError: any) {
            // Silently handle creation error
          }
        }
      } catch (approvedRequestError: any) {
      }
      
      try {
        const tempDocId = `temp_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const tempDocRef = doc(db, 'adminUsers', tempDocId);
        const tempDoc = await getDoc(tempDocRef);
        
        if (tempDoc.exists()) {
          const tempData = tempDoc.data();
          if (tempData.pendingUid && tempData.email === userEmail) {
            // Migrate to UID-based document
            const adminRef = doc(db, 'adminUsers', userId);
            // Clean tempData to remove undefined and null values
            const cleanTempData: any = {
              name: tempData.name,
              email: tempData.email,
              role: tempData.role,
              status: tempData.status || 'active',
              createdAt: tempData.createdAt || serverTimestamp(),
            };
            // Only include optional fields if they have values
            if (tempData.avatar) cleanTempData.avatar = tempData.avatar;
            if (tempData.phone) cleanTempData.phone = tempData.phone;
            if (tempData.location) cleanTempData.location = tempData.location;
            if (tempData.bio) cleanTempData.bio = tempData.bio;
            if (tempData.facebook) cleanTempData.facebook = tempData.facebook;
            if (tempData.whatsapp) cleanTempData.whatsapp = tempData.whatsapp;
            if (tempData.twitter) cleanTempData.twitter = tempData.twitter;
            if (tempData.linkedin) cleanTempData.linkedin = tempData.linkedin;
            if (tempData.instagram) cleanTempData.instagram = tempData.instagram;
            if (tempData.createdBy) cleanTempData.createdBy = tempData.createdBy;
            if (tempData.permissions && typeof tempData.permissions === 'object' && Object.keys(tempData.permissions).length > 0) {
              cleanTempData.permissions = tempData.permissions;
            }
            await setDoc(adminRef, cleanTempData, { merge: true });
            
            await deleteDoc(tempDocRef);
            
            const newAdminDoc = await getDoc(adminRef);
            if (newAdminDoc.exists()) {
              return { id: newAdminDoc.id, ...newAdminDoc.data() } as AdminUser;
            }
          }
        }
      } catch (tempDocError: any) {
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user has admin role
 */
export async function hasAdminRole(userId: string, role: AdminRole): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, 'adminUsers', userId));
    if (!adminDoc.exists()) {
      return false;
    }

    const adminData = adminDoc.data();
    const userRole = adminData.role;

    if (role === 'Admin') {
      return userRole === 'Admin';
    }
    if (role === 'Moderator') {
      return userRole === 'Admin' || userRole === 'Moderator';
    }
    if (role === 'Seller') {
      return userRole === 'Admin' || userRole === 'Moderator' || userRole === 'Seller';
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Sign in admin with Google
 * Only allows access if user has an adminUsers document in Firestore
 */
export async function adminSignInWithGoogle(): Promise<{ success: boolean; error?: string; uid?: string; userEmail?: string; userName?: string; userPhotoURL?: string }> {
  let result: any = null;
  try {
    const provider = new GoogleAuthProvider();
    // Use the real Auth instance instead of the proxy to avoid any issues
    // with Firebase's internal popup handling logic.
    const authInstance = getAuthInstance();
    result = await signInWithPopup(authInstance, provider);
    const user = result.user;

    await user.getIdToken(true);

    const adminData = await getAdminUserData(user.uid, user.email || undefined);
    if (!adminData) {
      return { 
        success: false, 
        uid: user.uid,
        error: 'Access denied. This Google account does not have admin privileges. Please request admin access from an administrator.',
        userEmail: user.email || undefined,
        userName: user.displayName || undefined,
        userPhotoURL: user.photoURL || undefined,
      };
    }

    // Check if admin account is active (if status field exists)
    const adminDoc = await getDoc(doc(db, 'adminUsers', user.uid));
    if (adminDoc.exists()) {
      const adminDocData = adminDoc.data();
      const status = adminDocData.status;
      if (status === 'suspended' || status === 'inactive' || status === 'deleted') {
        await signOut(auth);
        return { 
          success: false, 
          uid: user.uid,
          error: `Access denied. Your admin account has been ${status === 'deleted' ? 'deleted' : status}. Please contact an administrator.` 
        };
      }
      
      // Only update avatar with Google photo if:
      // 1. User has a Google photo
      // 2. Current avatar is empty/missing OR it's already a Google URL (to keep in sync)
      // 3. Never overwrite Cloudinary URLs (user-uploaded images)
      if (user.photoURL) {
        const currentAvatar = adminDocData.avatar || '';
        const isCurrentCloudinary = isCloudinaryUrl(currentAvatar);
        const isCurrentGoogle = currentAvatar.includes('googleusercontent.com') || currentAvatar.includes('google.com');
        
        // Only update if:
        // - Avatar is empty/missing, OR
        // - Current avatar is a Google URL (to keep Google photos in sync), AND
        // - Current avatar is NOT a Cloudinary URL (preserve user uploads)
        if (!isCurrentCloudinary && (!currentAvatar || currentAvatar === '' || (isCurrentGoogle && currentAvatar !== user.photoURL))) {
          try {
            await updateDoc(doc(db, 'adminUsers', user.uid), {
              avatar: user.photoURL,
            });
          } catch (error) {
          }
        }
      }
    }

    // Update lastLogin timestamp for this admin (non-blocking)
    try {
      await updateDoc(doc(db, 'adminUsers', user.uid), {
        lastLogin: serverTimestamp(),
      });
    } catch {
      // Ignore errors; login should still succeed even if lastLogin fails to update
    }

    return { success: true, uid: user.uid };
  } catch (error: any) {
    if (result?.user) {
      try {
        await signOut(auth);
      } catch (signOutError) {
      }
    }
    
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign-in popup was closed. Please try again.' };
    }
    if (error.code === 'auth/popup-blocked') {
      return { success: false, error: 'Popup was blocked by your browser. Please allow popups and try again.' };
    }
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      return { 
        success: false, 
        uid: result?.user?.uid,
        error: `Permission denied when reading adminUsers document.\n\nYour Firebase UID: ${result?.user?.uid || 'unknown'}\n\nPossible issues:\n1. Firestore rules not deployed (check Firebase Console → Firestore → Rules → Publish)\n2. Document ID doesn't match UID exactly\n3. Rules blocking read access\n\nPlease check browser console (F12) for detailed error.` 
      };
    }
    return { 
      success: false, 
      uid: result?.user?.uid,
      error: `Failed to sign in with Google.\n\nError: ${error.message || 'Unknown error'}\n\nPlease check browser console (F12) for details.` 
    };
  }
}

/**
 * Listen to auth state changes
 */
export function onAdminAuthStateChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}
