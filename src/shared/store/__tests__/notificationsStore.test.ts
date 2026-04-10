import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationsStore } from '../notificationsStore';

describe('notificationsStore', () => {
  beforeEach(() => {
    useNotificationsStore.setState({ items: [] });
  });

  it('adds a notification with id and timestamp', () => {
    const { add } = useNotificationsStore.getState();
    add({ type: 'system', title: 'Test' });
    const { items } = useNotificationsStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBeDefined();
    expect(items[0].createdAt).toBeGreaterThan(0);
    expect(items[0].read).toBe(false);
    expect(items[0].title).toBe('Test');
  });

  it('counts unread notifications', () => {
    const store = useNotificationsStore.getState();
    store.add({ type: 'system', title: 'A' });
    store.add({ type: 'system', title: 'B' });
    expect(useNotificationsStore.getState().unreadCount()).toBe(2);
  });

  it('marks single notification as read', () => {
    const store = useNotificationsStore.getState();
    store.add({ type: 'system', title: 'A' });
    const id = useNotificationsStore.getState().items[0].id;
    useNotificationsStore.getState().markRead(id);
    expect(useNotificationsStore.getState().items[0].read).toBe(true);
    expect(useNotificationsStore.getState().unreadCount()).toBe(0);
  });

  it('marks all as read', () => {
    const store = useNotificationsStore.getState();
    store.add({ type: 'system', title: 'A' });
    store.add({ type: 'system', title: 'B' });
    useNotificationsStore.getState().markAllRead();
    expect(useNotificationsStore.getState().unreadCount()).toBe(0);
  });

  it('removes a notification by ID', () => {
    const store = useNotificationsStore.getState();
    store.add({ type: 'system', title: 'A' });
    store.add({ type: 'system', title: 'B' });
    const id = useNotificationsStore.getState().items[0].id;
    useNotificationsStore.getState().remove(id);
    expect(useNotificationsStore.getState().items).toHaveLength(1);
  });

  it('clears all notifications', () => {
    const store = useNotificationsStore.getState();
    store.add({ type: 'system', title: 'A' });
    store.add({ type: 'system', title: 'B' });
    useNotificationsStore.getState().clear();
    expect(useNotificationsStore.getState().items).toHaveLength(0);
  });

  it('caps at 100 notifications', () => {
    const store = useNotificationsStore.getState();
    for (let i = 0; i < 110; i++) {
      store.add({ type: 'system', title: `N${i}` });
    }
    expect(useNotificationsStore.getState().items.length).toBeLessThanOrEqual(100);
  });
});
