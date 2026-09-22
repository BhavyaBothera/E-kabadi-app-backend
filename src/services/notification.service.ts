import { supabaseAdmin } from '../config/supabase';
import { env, isMockStore } from '../config/env';
import { inMemoryStore } from '../db/in-memory-store';

export interface NotificationItemResponse {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: string;
}

export class NotificationService {
  async getNotifications(userId: string): Promise<NotificationItemResponse[]> {
    const isMock = isMockStore();

    if (isMock) {
      const list = inMemoryStore.notifications.filter((n) => n.user_id === userId);
      if (list.length === 0) {
        return [
          {
            id: 'N-1',
            title: 'Collector Accepted Pickup',
            message: 'Ramesh Kumar has accepted your pickup request and is on the way.',
            timestamp: '10 mins ago',
            isRead: false,
            type: 'pickup',
          },
          {
            id: 'N-2',
            title: 'Payment Received',
            message: 'Payment of ₹118 has been transferred to your UPI account.',
            timestamp: '2 hours ago',
            isRead: true,
            type: 'payment',
          },
          {
            id: 'N-3',
            title: 'Eco Points Earned!',
            message: 'You earned 20 Eco Points for recycling 4.6 kg scrap.',
            timestamp: 'Yesterday',
            isRead: true,
            type: 'reward',
          },
          {
            id: 'N-4',
            title: 'Scrap Recycled Certificate',
            message: 'Your scrap batch #EB-4912 has been processed at EcoRecycle Hub.',
            timestamp: '2 days ago',
            isRead: true,
            type: 'journey',
          },
        ];
      }
      return list.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        timestamp: n.created_at || 'Just now',
        isRead: n.is_read,
        type: n.type,
      }));
    }

    const { data } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return (data || []).map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      timestamp: n.created_at,
      isRead: n.is_read,
      type: n.type,
    }));
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const isMock = isMockStore();

    if (isMock) {
      const notif = inMemoryStore.notifications.find((n) => n.id === notificationId);
      if (notif) notif.is_read = true;
      return;
    }

    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
  }
}

export const notificationService = new NotificationService();
