import { db } from '../config';
import { isDev } from '@/lib/env';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { AdminPost, PostStatus } from '@/types/admin';

/**
 * Get all books/posts
 * Performance: Limited to 500 books max to prevent resource exhaustion
 */
export async function getAllBooks(limitCount?: number): Promise<AdminPost[]> {
  try {
    const MAX_LIMIT = 500;
    const actualLimit = limitCount ? Math.min(limitCount, MAX_LIMIT) : MAX_LIMIT;
    let q = query(collection(db, 'books'), orderBy('postedDate', 'desc'), limit(actualLimit));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const postedDate =
        (data.postedDate?.toDate?.()?.toISOString?.() as string | undefined) ||
        (typeof data.postedDate === 'string' ? data.postedDate : null) ||
        new Date().toISOString();
      return {
        id: doc.id,
        ...data,
        // bookId is always doc.id; productCode (if present) is just an optional legacy/display field.
        productCode: data.productCode,
        postedDate,
        status: (data.status || (data.isSold ? 'deleted' : 'active')) as PostStatus,
        disabledAt: data.disabledAt || null,
        deletedAt: data.deletedAt || (data.isSold ? data.updatedAt?.toDate?.()?.toISOString() : null) || null,
      } as AdminPost;
    });
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error fetching books:', error);
    }
    return [];
  }
}

/**
 * Get book by ID
 */
export async function getBookById(bookId: string): Promise<AdminPost | null> {
  try {
    const bookDoc = await getDoc(doc(db, 'books', bookId));
    if (bookDoc.exists()) {
      const data = bookDoc.data();
      const postedDate =
        (data.postedDate?.toDate?.()?.toISOString?.() as string | undefined) ||
        (typeof data.postedDate === 'string' ? data.postedDate : null) ||
        new Date().toISOString();
      return {
        id: bookDoc.id,
        ...data,
        postedDate,
        status: (data.status || (data.isSold ? 'deleted' : 'active')) as PostStatus,
        disabledAt: data.disabledAt || null,
        deletedAt: data.deletedAt || (data.isSold ? data.updatedAt?.toDate?.()?.toISOString() : null) || null,
      } as AdminPost;
    }
    return null;
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error fetching book:', error);
    }
    return null;
  }
}

/**
 * Update book
 */
export async function updateBook(
  bookId: string,
  updates: Partial<AdminPost>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Sanitize updates to remove undefined values (Firestore doesn't accept undefined)
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    
    const updateData: any = {
      ...sanitizedUpdates,
      updatedAt: serverTimestamp(),
    };

    // Remove fields that should never be written
    delete updateData.id;

    // Normalize postedDate when provided (accepts string or Date)
    if (updates.postedDate) {
      updateData.postedDate =
        typeof updates.postedDate === 'string'
          ? updates.postedDate
          : (updates.postedDate as any)?.toISOString?.() ?? updates.postedDate;
    }

    // Handle status changes with consistent timestamps
    if (updates.status === 'disabled') {
      updateData.status = 'disabled';
      updateData.disabledAt = updates.disabledAt ?? serverTimestamp();
    }

    if (updates.status === 'deleted') {
      updateData.status = 'deleted';
      updateData.isSold = true;
      updateData.deletedAt = updates.deletedAt ?? serverTimestamp();
    }

    if (updates.status === 'active') {
      updateData.status = 'active';
      updateData.isSold = false;
      updateData.disabledAt = null;
      updateData.deletedAt = null;
    }

    await updateDoc(doc(db, 'books', bookId), updateData);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update book' };
  }
}

/**
 * Delete book (soft delete)
 */
export async function deleteBook(bookId: string): Promise<{ success: boolean; error?: string }> {
  return updateBook(bookId, {
    status: 'deleted',
    deletedAt: undefined,
  } as Partial<AdminPost>);
}

/**
 * Permanently delete book/post (hard delete)
 */
export async function permanentlyDeleteBook(
  bookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'books', bookId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to permanently delete book' };
  }
}

/**
 * Disable book
 */
export async function disableBook(bookId: string): Promise<{ success: boolean; error?: string }> {
  return updateBook(bookId, {
    status: 'disabled',
    disabledAt: undefined,
  } as Partial<AdminPost>);
}

/**
 * Restore book
 */
export async function restoreBook(bookId: string): Promise<{ success: boolean; error?: string }> {
  return updateBook(bookId, {
    status: 'active',
    disabledAt: null,
    deletedAt: null,
  } as Partial<AdminPost>);
}

/**
 * Get books by status
 * Performance: Limited to 500 books max to prevent resource exhaustion
 */
export async function getBooksByStatus(status: PostStatus): Promise<AdminPost[]> {
  try {
    const MAX_LIMIT = 500;
    const q = query(
      collection(db, 'books'),
      where('status', '==', status),
      orderBy('postedDate', 'desc'),
      limit(MAX_LIMIT)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        status: data.status as PostStatus,
        disabledAt: data.disabledAt || null,
        deletedAt: data.deletedAt || null,
      } as AdminPost;
    });
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error fetching books by status:', error);
    }
    return [];
  }
}

/**
 * Get books by seller userId
 * Performance: Limited to 500 books max to prevent resource exhaustion
 */
export async function getBooksBySellerId(sellerUserId: string): Promise<AdminPost[]> {
  try {
    const MAX_LIMIT = 500;
    const q = query(
      collection(db, 'books'),
      where('sellerId', '==', sellerUserId),
      orderBy('postedDate', 'desc'),
      limit(MAX_LIMIT)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const postedDate =
        (data.postedDate?.toDate?.()?.toISOString?.() as string | undefined) ||
        (typeof data.postedDate === 'string' ? data.postedDate : null) ||
        new Date().toISOString();
      return {
        id: doc.id,
        ...data,
        productCode: data.productCode,
        postedDate,
        status: (data.status || (data.isSold ? 'deleted' : 'active')) as PostStatus,
        disabledAt: data.disabledAt || null,
        deletedAt: data.deletedAt || (data.isSold ? data.updatedAt?.toDate?.()?.toISOString() : null) || null,
      } as AdminPost;
    });
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error fetching books by seller ID:', error);
    }
    return [];
  }
}
