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
import { AdminOrder, OrderStatus } from '@/types/admin';

/**
 * Admin Orders Service
 * 
 * Note: Order IDs are standardized to 10 digits (timestamp 8 digits + random 2 digits).
 * Legacy 8-digit order IDs are still supported for backward compatibility.
 */

/**
 * Get all orders
 * Performance: Limited to 500 orders max to prevent resource exhaustion
 */
export async function getAllOrders(limitCount?: number): Promise<AdminOrder[]> {
  try {
    const MAX_LIMIT = 500;
    const actualLimit = limitCount ? Math.min(limitCount, MAX_LIMIT) : MAX_LIMIT;

    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
      limit(actualLimit)
    );
    const ordersSnapshot = await getDocs(ordersQuery);

    if (ordersSnapshot.empty) {
      return [];
    }

    const orders = ordersSnapshot.docs.map((orderDoc) => {
      const data = orderDoc.data() as any;
      return { id: orderDoc.id, ...data };
    });

    // Collect unique userIds and primary bookIds for batch loading
    const userIds = new Set<string>();
    const bookIds = new Set<string>();

    for (const order of orders) {
      if (order.userId) {
        userIds.add(order.userId);
      }
      if (order.items && Array.isArray(order.items) && order.items[0]?.bookId) {
        bookIds.add(order.items[0].bookId);
      }
    }

    // Batch fetch users using Firestore getAll() for better performance
    // getAll() can fetch up to 10 documents per call
    const userMap = new Map<string, any>();
    if (userIds.size > 0) {
      const userIdArray = Array.from(userIds);
      const BATCH_SIZE = 10;
      
      // Process in batches of 10
      for (let i = 0; i < userIdArray.length; i += BATCH_SIZE) {
        const batch = userIdArray.slice(i, i + BATCH_SIZE);
        try {
          // Use Promise.all with getDoc for each batch (Firestore SDK doesn't have getAll in client SDK)
          // But we can still optimize by batching Promise.all calls
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

    // Batch fetch books using the same batching strategy
    const bookMap = new Map<string, any>();
    if (bookIds.size > 0) {
      const bookIdArray = Array.from(bookIds);
      const BATCH_SIZE = 10;
      
      // Process in batches of 10
      for (let i = 0; i < bookIdArray.length; i += BATCH_SIZE) {
        const batch = bookIdArray.slice(i, i + BATCH_SIZE);
        try {
          const batchPromises = batch.map(async (bookId) => {
            try {
              const bookRef = doc(db, "books", bookId);
              const bookSnap = await getDoc(bookRef);
              if (bookSnap.exists()) {
                return { bookId, data: bookSnap.data() };
              }
              return null;
            } catch {
              return null;
            }
          });
          
          const results = await Promise.all(batchPromises);
          results.forEach((result) => {
            if (result) {
              bookMap.set(result.bookId, result.data);
            }
          });
        } catch {
          // Ignore batch errors
        }
      }
    }

    // Hydrate orders with denormalized fields using the maps
    const hydratedOrders: AdminOrder[] = orders.map((raw: any) => {
      let buyerName = "";
      let buyerEmail = "";

      if (raw.userId) {
        const user = userMap.get(raw.userId);
        if (user) {
          buyerName = user.name || "";
          buyerEmail = user.email || "";
        }
      } else {
        buyerName = raw.shippingAddress?.fullName || "Guest User";
        buyerEmail = raw.shippingAddress?.email || "No email";
      }

      let sellerName = "";
      let sellerEmail = "";
      const primaryItem = raw.items && Array.isArray(raw.items) ? raw.items[0] : null;
      if (primaryItem?.bookId) {
        const book = bookMap.get(primaryItem.bookId);
        if (book) {
          sellerName = book.sellerName || "";
          sellerEmail = book.sellerEmail || "";
        }
      }

      return {
        id: raw.id,
        ...raw,
        buyerName,
        buyerEmail,
        sellerName,
        sellerEmail,
        trackingStatus: raw.status,
        deletedAt: raw.deletedAt || null,
      } as AdminOrder;
    });

    return hydratedOrders;
  } catch {
    return [];
  }
}

/**
 * Get order by ID
 * Optimized: Uses parallel Promise.all for user and book fetches when both are needed
 */
export async function getOrderById(orderId: string): Promise<AdminOrder | null> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (orderDoc.exists()) {
      const data = orderDoc.data();
      
      // Fetch user and book in parallel if both are needed
      const fetchPromises: Promise<any>[] = [];
      let userDocPromise: Promise<any> | null = null;
      let bookDocPromise: Promise<any> | null = null;
      
      if (data.userId) {
        userDocPromise = getDoc(doc(db, 'users', data.userId)).catch(() => null);
        fetchPromises.push(userDocPromise);
      }
      
      if (data.items && data.items.length > 0 && data.items[0].bookId) {
        bookDocPromise = getDoc(doc(db, 'books', data.items[0].bookId)).catch(() => null);
        fetchPromises.push(bookDocPromise);
      }
      
      // Wait for all fetches in parallel
      await Promise.all(fetchPromises);
      
      let buyerName = '';
      let buyerEmail = '';
      if (data.userId && userDocPromise) {
        try {
          const userDoc = await userDocPromise;
          if (userDoc?.exists()) {
            buyerName = userDoc.data().name || '';
            buyerEmail = userDoc.data().email || '';
          }
        } catch (error) {
          // Fallback to guest user
        }
      }
      
      if (!buyerName && !buyerEmail) {
        buyerName = data.shippingAddress?.fullName || 'Guest User';
        buyerEmail = data.shippingAddress?.email || 'No email';
      }

      let sellerName = '';
      let sellerEmail = '';
      if (data.items && data.items.length > 0 && bookDocPromise) {
        try {
          const bookDoc = await bookDocPromise;
          if (bookDoc?.exists()) {
            const bookData = bookDoc.data();
            sellerName = bookData.sellerName || '';
            sellerEmail = bookData.sellerEmail || '';
          }
        } catch (error) {
          // Ignore errors
        }
      }

      return {
        id: orderDoc.id,
        ...data,
        buyerName,
        buyerEmail,
        sellerName,
        sellerEmail,
        trackingStatus: data.status,
        deletedAt: data.deletedAt || null,
      } as AdminOrder;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  updateData?: {
    message?: string;
    location?: string;
    trackingNumber?: string;
    courierName?: string;
    adminNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) {
      return { success: false, error: 'Order not found' };
    }

    const orderData = orderDoc.data();
    const statusHistory = orderData.statusHistory || [];

    const statusUpdate: any = {
      status,
      timestamp: new Date().toISOString(),
    };
    
    if (updateData?.message !== undefined && updateData.message !== null) {
      statusUpdate.message = updateData.message;
    }
    if (updateData?.location !== undefined && updateData.location !== null) {
      statusUpdate.location = updateData.location;
    }

    const updateFields: any = {
      status,
      statusHistory: [...statusHistory, statusUpdate],
      updatedAt: serverTimestamp(),
    };

    if (updateData?.trackingNumber !== undefined && updateData.trackingNumber !== null) {
      updateFields.trackingNumber = updateData.trackingNumber;
    }
    if (updateData?.courierName !== undefined && updateData.courierName !== null) {
      updateFields.courierName = updateData.courierName;
    }
    if (updateData?.adminNotes !== undefined && updateData.adminNotes !== null) {
      updateFields.adminNotes = updateData.adminNotes;
    }

    await updateDoc(doc(db, 'orders', orderId), updateFields);

    // If order is cancelled, check if books still have other active orders
    // If not, remove hasActiveOrder flag so books reappear on public listings
    if (status === 'cancelled' && orderData.items && Array.isArray(orderData.items)) {
      try {
        const { updateBook } = await import('./admin-books');
        const activeStatuses: OrderStatus[] = ['placed', 'pending', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
        
        const updatePromises = orderData.items.map(async (item: any) => {
          if (item.bookId) {
            try {
              // Optimized: Query only active orders (not all orders) to check for other active orders containing this book
              // Note: Firestore doesn't support querying nested array fields directly, so we query active orders
              // and filter client-side for the specific bookId
              const activeOrdersQuery = query(
                collection(db, 'orders'),
                where('status', 'in', activeStatuses),
                orderBy('createdAt', 'desc'),
                limit(100) // Reduced from 500 - only need to check recent active orders
              );
              const activeOrdersSnapshot = await getDocs(activeOrdersQuery);
              
              // Find other active orders (not this one) that contain this book
              const otherActiveOrders = activeOrdersSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((order: any) => {
                  // Skip the current cancelled order
                  if (order.id === orderId) return false;
                  // Check if this order contains the book
                  return order.items?.some((orderItem: any) => orderItem.bookId === item.bookId);
                });
              
              const hasOtherActiveOrders = otherActiveOrders.length > 0;

              // Only clear the flag if there are no other active orders
              if (!hasOtherActiveOrders) {
                const result = await updateBook(item.bookId, { hasActiveOrder: false } as any);
                if (!result.success && isDev) {
                  // eslint-disable-next-line no-console
                  console.error(
                    `[admin-orders] Failed to clear hasActiveOrder for book ${item.bookId}:`,
                    result.error
                  );
                  // eslint-disable-next-line no-console
                  console.error(
                    '[admin-orders] This might be a Firestore permissions issue. Check your firestore.rules file.'
                  );
                }
              } else {
                // In dev, surface that the flag is kept due to other active orders
                if (isDev) {
                  // eslint-disable-next-line no-console
                  console.log(
                    `[admin-orders] Book ${item.bookId} still has ${otherActiveOrders.length} other active order(s), keeping hasActiveOrder: true`
                  );
                }
              }
            } catch (err) {
              if (isDev) {
                // eslint-disable-next-line no-console
                console.error(`[admin-orders] Failed to update book ${item.bookId}:`, err);
              }
              // If checking fails, assume no other orders and clear the flag (safer to show book than hide it)
              try {
                const { updateBook } = await import('./admin-books');
                const result = await updateBook(item.bookId, { hasActiveOrder: false } as any);
                if (!result.success && isDev) {
                  // eslint-disable-next-line no-console
                  console.error(
                    `[admin-orders] Failed to clear hasActiveOrder for book ${item.bookId} (fallback):`,
                    result.error
                  );
                }
              } catch (updateErr) {
                if (isDev) {
                  // eslint-disable-next-line no-console
                  console.error(
                    `[admin-orders] Failed to clear hasActiveOrder for book ${item.bookId} (fallback import error):`,
                    updateErr
                  );
                }
              }
            }
          }
        });
        await Promise.all(updatePromises);
      } catch (bookUpdateError) {
        // Log error but don't fail the order update
        console.error('[admin-orders] Error updating books after order cancellation:', bookUpdateError);
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update order status' };
  }
}

/**
 * Get orders by status
 * Performance: Limited to 500 orders max to prevent resource exhaustion
 */
export async function getOrdersByStatus(status: OrderStatus): Promise<AdminOrder[]> {
  try {
    const MAX_LIMIT = 500;
    const q = query(
      collection(db, 'orders'),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
      limit(MAX_LIMIT)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      trackingStatus: doc.data().status,
      deletedAt: doc.data().deletedAt || null,
    })) as AdminOrder[];
  } catch (error) {
    return [];
  }
}

/**
 * Soft delete order (sets deletedAt timestamp)
 */
export async function deleteOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete order' };
  }
}

/**
 * Permanently delete order (hard delete)
 */
export async function permanentlyDeleteOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'orders', orderId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to permanently delete order' };
  }
}

/**
 * Restore deleted order (removes deletedAt)
 */
export async function restoreOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      deletedAt: null,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to restore order' };
  }
}
