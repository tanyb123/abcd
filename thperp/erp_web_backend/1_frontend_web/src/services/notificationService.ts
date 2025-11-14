import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  doc,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseClient';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'PROJECT_OPENED' | 'PROJECT_DISCUSSION' | 'QUOTATION_READY' | 'OTHER';
  read: boolean;
  createdAt: Timestamp;
  navLink?: {
    screen: string;
    params?: Record<string, any>;
  };
  projectId?: string;
  projectName?: string;
}

/**
 * Lấy danh sách notification cho user
 */
export const getUserNotifications = async (
  userId: string | null | undefined
): Promise<Notification[]> => {
  if (!userId) return [];

  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Subscribe real-time notifications
 */
export const subscribeToNotifications = (
  userId: string | null | undefined,
  callback: (notifications: Notification[]) => void
): (() => void) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Notification)
      );
      callback(notifications);
    },
    (error) => {
      console.error('Error subscribing to notifications:', error);
      callback([]);
    }
  );
};

/**
 * Đánh dấu notification là đã đọc
 */
export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  if (!notificationId) return;

  try {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Đánh dấu tất cả notifications là đã đọc
 */
export const markAllNotificationsAsRead = async (
  userId: string | null | undefined
): Promise<void> => {
  if (!userId) return;

  try {
    const notifications = await getUserNotifications(userId);
    const unreadNotifications = notifications.filter((n) => !n.read);
    
    await Promise.all(
      unreadNotifications.map((n) => markNotificationAsRead(n.id))
    );
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

/**
 * Đếm số notification chưa đọc
 */
export const getUnreadNotificationCount = async (
  userId: string | null | undefined
): Promise<number> => {
  if (!userId) return 0;

  try {
    const notifications = await getUserNotifications(userId);
    return notifications.filter((n) => !n.read).length;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
};

