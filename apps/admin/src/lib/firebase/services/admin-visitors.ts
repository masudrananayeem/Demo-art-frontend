import { db } from '../config';
import { isDev } from '@/lib/env';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

/**
 * Visitor Analytics Interface
 */
export interface VisitorLog {
  id: string;
  sessionId: string;
  userId?: string;
  page: string;
  referrer?: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  timestamp: string;
  createdAt: Timestamp | string;
}

export interface VisitorStats {
  totalVisitors: number;
  uniqueVisitors: number;
  visitorsToday: number;
  visitorsThisMonth: number;
  desktopCount: number;
  mobileCount: number;
  tabletCount: number;
}

export interface DailyVisitorData {
  date: string;
  desktop: number;
  mobile: number;
  tablet: number;
  total: number;
  unique: number;
}

/**
 * Helper function to convert Timestamp or string to Date
 */
function toDate(value: Timestamp | string | undefined): Date {
  if (!value) {
    return new Date();
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return new Date(value);
}

/**
 * Track a visitor/page view
 */
export async function trackVisitor(data: {
  sessionId: string;
  userId?: string;
  page: string;
  referrer?: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await addDoc(collection(db, 'visitorLogs'), {
      ...data,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error tracking visitor:', error);
    }
    return { success: false, error: error.message || 'Failed to track visitor' };
  }
}

/**
 * Get all visitor logs
 * Performance: Limited to 1000 logs max to prevent resource exhaustion
 * @throws when the Firestore query fails (e.g. permission, missing index)
 */
export async function getAllVisitorLogs(limitCount?: number): Promise<VisitorLog[]> {
  const MAX_LIMIT = 1000;
  const actualLimit = limitCount ? Math.min(limitCount, MAX_LIMIT) : MAX_LIMIT;
  const q = query(collection(db, 'visitorLogs'), orderBy('createdAt', 'desc'), limit(actualLimit));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt || new Date().toISOString(),
  })) as VisitorLog[];
}

/**
 * Get visitor statistics
 * Performance: Uses limited query (1000 logs) for stats calculation
 */
export async function getVisitorStats(): Promise<VisitorStats> {
  try {
    // Limit to 1000 logs for performance - stats don't need all historical data
    const allLogs = await getAllVisitorLogs(1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const logsToday = allLogs.filter((log) => {
      const logDate = toDate(log.timestamp || log.createdAt);
      return logDate >= today;
    });

    const logsThisMonth = allLogs.filter((log) => {
      const logDate = toDate(log.timestamp || log.createdAt);
      return logDate >= startOfMonth;
    });

    // Get unique visitors (by sessionId)
    const uniqueSessions = new Set(allLogs.map((log) => log.sessionId));
    const uniqueSessionsToday = new Set(logsToday.map((log) => log.sessionId));
    const uniqueSessionsThisMonth = new Set(logsThisMonth.map((log) => log.sessionId));

    // Count by device type
    const desktopCount = allLogs.filter((log) => log.deviceType === 'desktop').length;
    const mobileCount = allLogs.filter((log) => log.deviceType === 'mobile').length;
    const tabletCount = allLogs.filter((log) => log.deviceType === 'tablet').length;

    return {
      totalVisitors: allLogs.length,
      uniqueVisitors: uniqueSessions.size,
      visitorsToday: uniqueSessionsToday.size,
      visitorsThisMonth: uniqueSessionsThisMonth.size,
      desktopCount,
      mobileCount,
      tabletCount,
    };
  } catch (error: any) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error calculating visitor stats:', error);
    }
    return {
      totalVisitors: 0,
      uniqueVisitors: 0,
      visitorsToday: 0,
      visitorsThisMonth: 0,
      desktopCount: 0,
      mobileCount: 0,
      tabletCount: 0,
    };
  }
}

/**
 * Format a local date as YYYY-MM-DD for grouping
 */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get daily visitor data for charts
 * Fills in all days in the range with 0 so the chart always has a continuous series.
 * @throws when the Firestore query fails (e.g. permission, missing index)
 */
export async function getDailyVisitorData(days: number = 90): Promise<DailyVisitorData[]> {
  const allLogs = await getAllVisitorLogs(1000);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const filteredLogs = allLogs.filter((log) => {
    const logDate = toDate(log.timestamp || log.createdAt);
    return logDate >= startDate && logDate <= today;
  });

  const dailyDataMap = new Map<string, {
    desktop: Set<string>;
    mobile: Set<string>;
    tablet: Set<string>;
    unique: Set<string>;
  }>();

  filteredLogs.forEach((log) => {
    const logDate = toDate(log.timestamp || log.createdAt);
    const dateKey = toLocalDateKey(logDate);

    if (!dailyDataMap.has(dateKey)) {
      dailyDataMap.set(dateKey, {
        desktop: new Set(),
        mobile: new Set(),
        tablet: new Set(),
        unique: new Set(),
      });
    }

    const dayData = dailyDataMap.get(dateKey)!;
    dayData.unique.add(log.sessionId);

    if (log.deviceType === 'desktop') {
      dayData.desktop.add(log.sessionId);
    } else if (log.deviceType === 'mobile') {
      dayData.mobile.add(log.sessionId);
    } else if (log.deviceType === 'tablet') {
      dayData.tablet.add(log.sessionId);
    }
  });

  const dailyData: DailyVisitorData[] = Array.from(dailyDataMap.entries()).map(([date, data]) => ({
    date,
    desktop: data.desktop.size,
    mobile: data.mobile.size,
    tablet: data.tablet.size,
    total: data.desktop.size + data.mobile.size + data.tablet.size,
    unique: data.unique.size,
  }));

  dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Fill in every day in the range so the chart always has a continuous series
  const filled: DailyVisitorData[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = toLocalDateKey(cursor);
    const existing = dailyData.find((d) => d.date === key);
    filled.push(
      existing ?? {
        date: key,
        desktop: 0,
        mobile: 0,
        tablet: 0,
        total: 0,
        unique: 0,
      }
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return filled;
}

/**
 * Get visitor logs by date range
 */
export async function getVisitorLogsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<VisitorLog[]> {
  try {
    // Limit to 1000 logs for performance
    const allLogs = await getAllVisitorLogs(1000);
    return allLogs.filter((log) => {
      const logDate = toDate(log.timestamp || log.createdAt);
      return logDate >= startDate && logDate <= endDate;
    });
  } catch (error: any) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error('Error getting visitor logs by date range:', error);
    }
    return [];
  }
}
