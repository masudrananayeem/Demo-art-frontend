import { db } from '../config';
import { isDev } from '@/lib/env';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { AdminCategory } from '@/types/admin';

/**
 * Get all categories, sorted by order (then name).
 * Performance: Limited to 100 categories max to prevent resource exhaustion
 */
export async function getAllCategories(): Promise<AdminCategory[]> {
  try {
    const MAX_LIMIT = 100;
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, limit(MAX_LIMIT));
    const querySnapshot = await getDocs(q);

    const list = querySnapshot.docs.map((d) => {
      const data = d.data();
      const deletedAt = data.deletedAt?.toDate?.()?.toISOString() ||
                       (typeof data.deletedAt === 'string' ? data.deletedAt : null) ||
                       null;
      const order = typeof data.order === 'number' ? data.order : undefined;
      return {
        id: d.id,
        name: data.name || '',
        nameBn: data.nameBn || '',
        icon: data.icon || 'BookOpen',
        order,
        deletedAt,
      } as AdminCategory;
    });

    list.sort((a, b) => {
      const orderA = a.order ?? 999999;
      const orderB = b.order ?? 999999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error fetching categories:', error);
    }
    return [];
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(categoryId: string): Promise<AdminCategory | null> {
  try {
    const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
    if (categoryDoc.exists()) {
      const data = categoryDoc.data();
      const deletedAt = data.deletedAt?.toDate?.()?.toISOString() ||
                       (typeof data.deletedAt === 'string' ? data.deletedAt : null) ||
                       null;
      const order = typeof data.order === 'number' ? data.order : undefined;
      return {
        id: categoryDoc.id,
        name: data.name || '',
        nameBn: data.nameBn || '',
        icon: data.icon || 'BookOpen',
        order,
        deletedAt,
      } as AdminCategory;
    }
    return null;
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error fetching category:', error);
    }
    return null;
  }
}

/**
 * Create category
 */
export async function createCategory(
  categoryData: Omit<AdminCategory, 'id'>
): Promise<{ success: boolean; categoryId?: string; error?: string }> {
  try {
    const newCategory = {
      ...categoryData,
      order: typeof categoryData.order === 'number' ? categoryData.order : undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'categories'), newCategory);
    return { success: true, categoryId: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create category' };
  }
}

/**
 * Update category
 */
export async function updateCategory(
  categoryId: string,
  updates: Partial<AdminCategory>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Remove id from updates
    delete updateData.id;

    await updateDoc(doc(db, 'categories', categoryId), updateData);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update category' };
  }
}

/**
 * Soft delete category (move to trash)
 */
export async function softDeleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'categories', categoryId), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete category' };
  }
}

/**
 * Restore category from trash
 */
export async function restoreCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'categories', categoryId), {
      deletedAt: null,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to restore category' };
  }
}

/**
 * Permanently delete category (hard delete)
 */
export async function permanentlyDeleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to permanently delete category' };
  }
}

/**
 * Update order for multiple categories (batch). Used for reordering.
 */
export async function reorderCategories(
  updates: Array<{ categoryId: string; order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    for (const { categoryId, order } of updates) {
      batch.update(doc(db, 'categories', categoryId), {
        order,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reorder categories' };
  }
}

/**
 * Delete category (legacy - kept for backward compatibility, now uses soft delete)
 * @deprecated Use softDeleteCategory instead
 */
export async function deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  return softDeleteCategory(categoryId);
}
