type NotificationEvent = {
  id: string;
  userId: string;
  type: string;
  payload: unknown;
  read: boolean;
  createdAt: string;
};

type Listener = (event: NotificationEvent) => void;

const SSE_LISTENER_SET_KEY = "__rap_keo_notification_sse_listeners__";

function getListenerSet(): Set<Listener> {
  const globalWithStore = globalThis as typeof globalThis & {
    [SSE_LISTENER_SET_KEY]?: Set<Listener>;
  };

  if (!globalWithStore[SSE_LISTENER_SET_KEY]) {
    globalWithStore[SSE_LISTENER_SET_KEY] = new Set();
  }

  return globalWithStore[SSE_LISTENER_SET_KEY];
}

export function subscribeNotificationEvent(listener: Listener) {
  const listenerSet = getListenerSet();
  listenerSet.add(listener);

  return () => {
    listenerSet.delete(listener);
  };
}

export function publishNotificationEvent(event: NotificationEvent) {
  const listenerSet = getListenerSet();
  for (const listener of listenerSet) {
    listener(event);
  }
}
