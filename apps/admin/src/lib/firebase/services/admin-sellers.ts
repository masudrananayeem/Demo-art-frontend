import { db } from '../config';
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
import { AdminSeller, UserStatus } from '@/types/admin';

/**
 * Get all sellers
 * Performance: Limited to 500 sellers max to prevent resource exhaustion
 */
export async function getAllSellers(): Promise<AdminSeller[]> {
  try {
    const MAX_LIMIT = 500;
    const sellersRef = collection(db, 'sellers');
    const q = query(sellersRef, orderBy('joinedDate', 'desc'), limit(MAX_LIMIT));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return [];
    }

    const rawSellers = querySnapshot.docs.map((sellerDoc) => {
      const data = sellerDoc.data() as any;
      return { id: sellerDoc.id, ...data };
    });

    // Collect unique userIds
    const userIds = new Set<string>();
    for (const seller of rawSellers) {
      if (seller.userId) {
        userIds.add(seller.userId);
      }
    }

    // Optimized: Batch fetch user documents using batched Promise.all
    // Process in batches of 10 to avoid overwhelming Firestore
    const userMap = new Map<string, any>();
    if (userIds.size > 0) {
      const userIdArray = Array.from(userIds);
      const BATCH_SIZE = 10;
      
      // Process in batches of 10
      for (let i = 0; i < userIdArray.length; i += BATCH_SIZE) {
        const batch = userIdArray.slice(i, i + BATCH_SIZE);
        try {
          const batchPromises = batch.map(async (userId) => {
            try {
              const userRef = doc(db, "users", userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                return { userId, data: userSnap.data() };
              }
              return null;
            } catch {
              return null;
            }
          });
          
          const results = await Promise.all(batchPromises);
          results.forEach((result) => {
            if (result) {
              userMap.set(result.userId, result.data);
            }
          });
        } catch {
          // Ignore batch errors to keep the list robust
        }
      }
    }

    // Optimized: Single query to get all books, then group by sellerId client-side
    // This eliminates N+1 queries (one per seller)
    const sellerBookCounts = new Map<string, number>();
    try {
      // Get all books in a single query (limited to prevent excessive reads)
      const MAX_BOOKS_LIMIT = 1000;
      const allBooksQuery = query(
        collection(db, "books"),
        orderBy("postedDate", "desc"),
        limit(MAX_BOOKS_LIMIT)
      );
      const allBooksSnapshot = await getDocs(allBooksQuery);
      
      // Group books by sellerId
      const booksBySellerId = new Map<string, number>();
      allBooksSnapshot.docs.forEach((bookDoc) => {
        const bookData = bookDoc.data();
        if (bookData.sellerId) {
          const currentCount = booksBySellerId.get(bookData.sellerId) || 0;
          booksBySellerId.set(bookData.sellerId, currentCount + 1);
        }
      });
      
      // Map seller document IDs to book counts using userId
      rawSellers.forEach((seller) => {
        if (seller.userId) {
          const count = booksBySellerId.get(seller.userId) || 0;
          sellerBookCounts.set(seller.id, count);
        } else {
          sellerBookCounts.set(seller.id, 0);
        }
      });
    } catch {
      rawSellers.forEach((seller) => {
        sellerBookCounts.set(seller.id, 0);
      });
    }

    const sellers: AdminSeller[] = rawSellers.map((raw: any) => {
      const email =
        raw.userId && userMap.get(raw.userId)
          ? userMap.get(raw.userId).email || ""
          : "";

      const totalPosts = sellerBookCounts.get(raw.id) ?? 0;
      const totalOrders = raw.totalSales || 0;

      return {
        id: raw.id,
        ...raw,
        email,
        status: (raw.status || "active") as UserStatus,
        deletedAt: raw.deletedAt || null,
        suspendedAt: raw.suspendedAt || null,
        totalPosts,
        totalOrders,
        joinedDate:
          raw.joinedDate ||
          raw.createdAt?.toDate?.()?.toISOString() ||
          new Date().toISOString(),
      } as AdminSeller;
    });

    return sellers;
  } catch {
    return [];
  }
}

/**
 * Get seller by ID
 */
export async function getSellerById(sellerId: string): Promise<AdminSeller | null> {
  try {
    const sellerDoc = await getDoc(doc(db, 'sellers', sellerId));
    if (sellerDoc.exists()) {
      const data = sellerDoc.data();
      
      // Get user email
      let email = '';
      if (data.userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.userId));
          if (userDoc.exists()) {
            email = userDoc.data().email || '';
          }
        } catch {
          // ignore
        }
      }

      // Count stats
      // Note: Books use user.id as sellerId (not seller document ID)
      let totalPosts = 0;
      let totalOrders = 0;
      try {
        if (data.userId) {
          // Limit to 1000 for counting (performance optimization)
          // Note: Using .size is efficient, but we still limit the query
          const MAX_COUNT_LIMIT = 1000;
          const booksQuery = query(
            collection(db, 'books'),
            where('sellerId', '==', data.userId),
            limit(MAX_COUNT_LIMIT)
          );
          const booksSnapshot = await getDocs(booksQuery);
          totalPosts = booksSnapshot.size;
        }
        totalOrders = data.totalSales || 0;
      } catch {
        // ignore
      }

      return {
        id: sellerDoc.id,
        ...data,
        email,
        status: (data.status || 'active') as UserStatus,
        deletedAt: data.deletedAt || null,
        suspendedAt: data.suspendedAt || null,
        totalPosts,
        totalOrders,
        joinedDate: data.joinedDate || data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as AdminSeller;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Update seller
 */
export async function updateSeller(
  sellerId: string,
  updates: Partial<AdminSeller>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.email;
    delete updateData.totalPosts;
    delete updateData.totalOrders;
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

    await updateDoc(doc(db, 'sellers', sellerId), updateData);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update seller' };
  }
}

/**
 * Verify seller
 */
export async function verifySeller(sellerId: string): Promise<{ success: boolean; error?: string }> {
  return updateSeller(sellerId, { verified: true } as Partial<AdminSeller>);
}

/**
 * Unverify seller
 */
export async function unverifySeller(sellerId: string): Promise<{ success: boolean; error?: string }> {
  return updateSeller(sellerId, { verified: false } as Partial<AdminSeller>);
}

/**
 * Suspend seller
 */
export async function suspendSeller(sellerId: string): Promise<{ success: boolean; error?: string }> {
  return updateSeller(sellerId, {
    status: 'suspended',
    suspendedAt: new Date().toISOString(),
  } as Partial<AdminSeller>);
}

/**
 * Restore seller
 */
export async function restoreSeller(sellerId: string): Promise<{ success: boolean; error?: string }> {
  return updateSeller(sellerId, {
    status: 'active',
    suspendedAt: null,
    deletedAt: null,
  } as Partial<AdminSeller>);
}

/**
 * Soft delete seller (mark as deleted)
 */
export async function softDeleteSeller(sellerId: string): Promise<{ success: boolean; error?: string }> {
  return updateSeller(sellerId, {
    status: 'deleted',
    deletedAt: new Date().toISOString(),
  } as Partial<AdminSeller>);
}

/**
 * Permanently delete seller (hard delete from database).
 * Only allowed when seller is already in trash (status === 'deleted').
 */
export async function permanentDeleteSeller(sellerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sellerDoc = await getDoc(doc(db, 'sellers', sellerId));
    if (!sellerDoc.exists()) {
      return { success: false, error: 'Seller not found' };
    }
    const data = sellerDoc.data();
    if (data?.status !== 'deleted') {
      return { success: false, error: 'Seller must be in trash before permanent delete' };
    }
    await deleteDoc(doc(db, 'sellers', sellerId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to permanently delete seller' };
  }
}
