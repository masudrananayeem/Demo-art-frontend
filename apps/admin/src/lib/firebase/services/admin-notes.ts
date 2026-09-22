import { db } from "../config";
import { isDev } from "@/lib/env";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
} from "firebase/firestore";

export interface AdminDashboardNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  shared?: boolean;
  sharedWithAll?: boolean;
  sharedWithAdminIds?: string[];
  createdByAdminId: string;
  createdByAdminName?: string;
  createdByAdminEmail?: string;
}

/**
 * Get notes visible to a given admin.
 * Includes:
 * - Notes created by this admin
 * - Notes that are shared with all admins
 * - Notes that are shared with this admin specifically
 */
export async function getAdminNotes(adminId: string): Promise<AdminDashboardNote[]> {
  try {
    const notesRef = collection(db, "adminNotes");
    const MAX_LIMIT = 500; // Limit to prevent excessive reads

    const [ownSnapshot, sharedAllSnapshot, sharedSpecificSnapshot] = await Promise.all([
      getDocs(
        query(
          notesRef,
          where("createdByAdminId", "==", adminId),
          orderBy("updatedAt", "desc"),
          limit(MAX_LIMIT)
        )
      ),
      getDocs(
        query(
          notesRef,
          where("shared", "==", true),
          orderBy("updatedAt", "desc"),
          limit(MAX_LIMIT)
        )
      ),
      getDocs(
        query(
          notesRef,
          where("sharedWithAdminIds", "array-contains", adminId),
          orderBy("updatedAt", "desc"),
          limit(MAX_LIMIT)
        )
      ),
    ]);

    const map = new Map<string, AdminDashboardNote>();

    const addFromSnapshot = (snapshot: any) => {
      snapshot.forEach((docSnap: any) => {
        if (map.has(docSnap.id)) return;
        const data = docSnap.data() as any;
        const sharedWithAdminIds: string[] = Array.isArray(data.sharedWithAdminIds)
          ? data.sharedWithAdminIds
          : [];
        const sharedWithAll = data.shared === true && sharedWithAdminIds.length === 0;

        map.set(docSnap.id, {
          id: docSnap.id,
          title: data.title || "",
          content: data.content || "",
          pinned: data.pinned ?? false,
          shared: data.shared ?? false,
          sharedWithAll,
          sharedWithAdminIds,
          createdByAdminId: data.createdByAdminId,
          createdByAdminName: data.createdByAdminName,
          createdByAdminEmail: data.createdByAdminEmail,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
    };

    addFromSnapshot(ownSnapshot);
    addFromSnapshot(sharedAllSnapshot);
    addFromSnapshot(sharedSpecificSnapshot);

    const notes = Array.from(map.values());
    notes.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return notes;
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("[admin-notes] Failed to fetch notes", error);
    }
    return [];
  }
}

interface NoteInput {
  title: string;
  content: string;
  pinned?: boolean;
  shared?: boolean;
  sharedWithAll?: boolean;
  sharedWithAdminIds?: string[];
}

export async function createAdminNote(
  adminId: string,
  adminName: string | undefined,
  adminEmail: string | undefined,
  payload: NoteInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const notesRef = collection(db, "adminNotes");
    const now = serverTimestamp();
    const docRef = await addDoc(notesRef, {
      title: payload.title,
      content: payload.content,
      pinned: payload.pinned ?? false,
      shared: payload.shared ?? false,
      sharedWithAll: payload.sharedWithAll ?? false,
      sharedWithAdminIds: payload.sharedWithAdminIds ?? [],
      createdByAdminId: adminId,
      createdByAdminName: adminName || null,
      createdByAdminEmail: adminEmail || null,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id: docRef.id };
  } catch (error: any) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("[admin-notes] Failed to create note", error);
    }
    return { success: false, error: error.message || "Failed to create note" };
  }
}

export async function updateAdminNote(
  noteId: string,
  updates: Partial<NoteInput & { pinned: boolean }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const noteRef = doc(db, "adminNotes", noteId);
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.pinned !== undefined) updateData.pinned = updates.pinned;
    if (updates.shared !== undefined) updateData.shared = updates.shared;
     // Optional new sharing fields
    if (updates.sharedWithAll !== undefined) {
      updateData.sharedWithAll = updates.sharedWithAll;
    }
    if (updates.sharedWithAdminIds !== undefined) {
      updateData.sharedWithAdminIds = updates.sharedWithAdminIds;
    }

    await updateDoc(noteRef, updateData);
    return { success: true };
  } catch (error: any) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("[admin-notes] Failed to update note", error);
    }
    return { success: false, error: error.message || "Failed to update note" };
  }
}

export async function deleteAdminNote(
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, "adminNotes", noteId));
    return { success: true };
  } catch (error: any) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("[admin-notes] Failed to delete note", error);
    }
    return { success: false, error: error.message || "Failed to delete note" };
  }
}

/**
 * Get count of notes that are shared *to* a given admin (not created by them).
 * Used for sidebar badge (e.g. 1, 2, 3, ... 9+).
 */
export async function getSharedNotesCountForAdmin(adminId: string): Promise<number> {
  try {
    const notesRef = collection(db, "adminNotes");
    const MAX_LIMIT = 500; // Limit to prevent excessive reads

    const [sharedAllSnapshot, sharedSpecificSnapshot] = await Promise.all([
      getDocs(
        query(
          notesRef,
          where("shared", "==", true),
          orderBy("updatedAt", "desc"),
          limit(MAX_LIMIT)
        )
      ),
      getDocs(
        query(
          notesRef,
          where("sharedWithAdminIds", "array-contains", adminId),
          orderBy("updatedAt", "desc"),
          limit(MAX_LIMIT)
        )
      ),
    ]);

    const ids = new Set<string>();

    const collect = (snap: any) => {
      snap.forEach((docSnap: any) => {
        const data = docSnap.data() as any;
        // Only count notes not created by this admin
        if (data.createdByAdminId !== adminId) {
          ids.add(docSnap.id);
        }
      });
    };

    collect(sharedAllSnapshot);
    collect(sharedSpecificSnapshot);

    return ids.size;
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("[admin-notes] Failed to fetch shared notes count", error);
    }
    return 0;
  }
}


