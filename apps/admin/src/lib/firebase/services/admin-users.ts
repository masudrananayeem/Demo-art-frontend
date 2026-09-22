import { db } from '../config';
import { isDev } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
} from 'firebase/firestore';
import { AdminUser, UserStatus } from '@/types/admin';

/**
 * Get all users with pagination
 * Note: All authenticated users are automatically sellers (seller account created on signup)
 * 
 * @param pageSize - Number of users per page (default: 50, max: 100)
 * @param lastDoc - Last document from previous page for cursor-based pagination
 * @returns Object with users array and pagination info
 */
export async function getAllUsers(
  pageSize: number = 50,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{
  users: AdminUser[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  try {
    const MAX_PAGE_SIZE = 100;
    const limitSize = Math.min(pageSize, MAX_PAGE_SIZE);
    
    const usersRef = collection(db, 'users');
    let q = query(usersRef, orderBy('createdAt', 'desc'), limit(limitSize + 1)); // Fetch one extra to check if there's more
    
    if (lastDoc) {
      q = query(usersRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(limitSize + 1));
    }
    
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    const hasMore = docs.length > limitSize;
    const usersDocs = hasMore ? docs.slice(0, limitSize) : docs;
    
    const users = usersDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        password: '', // Never return password
        sellerId: data.sellerId, // Seller account ID (auto-created on signup)
        phone: data.phone,
        location: data.location,
        bio: data.bio,
        avatar: data.avatar,
        facebook: data.facebook,
        whatsapp: data.whatsapp,
        slug: data.slug,
        role: 'Seller' as const,
        status: (data.status || 'active') as UserStatus,
        deletedAt: data.deletedAt || null,
        suspendedAt: data.suspendedAt || null,
        joinedDate: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLogin: data.lastLogin,
      } as AdminUser;
    });
    
    return {
      users,
      lastDoc: usersDocs.length > 0 ? usersDocs[usersDocs.length - 1] : null,
      hasMore,
    };
  } catch (error) {
    logger.error('Error fetching users:', error);
    return { users: [], lastDoc: null, hasMore: false };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<AdminUser | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: userDoc.id,
        name: data.name || '',
        email: data.email || '',
        password: '',
        sellerId: data.sellerId,
        phone: data.phone,
        location: data.location,
        bio: data.bio,
        avatar: data.avatar,
        facebook: data.facebook,
        whatsapp: data.whatsapp,
        slug: data.slug,
        role: 'Seller' as const,
        status: (data.status || 'active') as UserStatus,
        deletedAt: data.deletedAt || null,
        suspendedAt: data.suspendedAt || null,
        joinedDate: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLogin: data.lastLogin,
      } as AdminUser;
    }
    return null;
  } catch (error) {
    logger.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Update user
 */
export async function updateUser(
  userId: string,
  updates: Partial<AdminUser>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.password;
    delete updateData.role;
    delete updateData.joinedDate;

    // Handle status changes
    if (updates.status === 'suspended' && !updates.suspendedAt) {
      updateData.suspendedAt = serverTimestamp();
    }
    if (updates.status === 'deleted' && !updates.deletedAt) {
      updateData.deletedAt = serverTimestamp();
    }
    if (updates.status === 'active') {
      updateData.suspendedAt = null;
      updateData.deletedAt = null;
    }

    await updateDoc(doc(db, 'users', userId), updateData);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update user' };
  }
}

/**
 * Delete user (soft delete)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  return updateUser(userId, {
    status: 'deleted',
    deletedAt: new Date().toISOString(),
  } as Partial<AdminUser>);
}

/**
 * Suspend user
 */
export async function suspendUser(userId: string): Promise<{ success: boolean; error?: string }> {
  return updateUser(userId, {
    status: 'suspended',
    suspendedAt: new Date().toISOString(),
  } as Partial<AdminUser>);
}

/**
 * Restore user
 */
export async function restoreUser(userId: string): Promise<{ success: boolean; error?: string }> {
  return updateUser(userId, {
    status: 'active',
    suspendedAt: null,
    deletedAt: null,
  } as Partial<AdminUser>);
}
