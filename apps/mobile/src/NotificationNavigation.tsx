import { useEffect, useRef } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { notificationDestination } from './notificationDestination';

export default function NotificationNavigation() {
  const navigation = useRootNavigationState();
  const router = useRouter();
  const lastHandled = useRef('');
  useEffect(() => {
    if (!navigation?.key) return;
    let active = true, liveResponseReceived = false;
    const open = (response: Notifications.NotificationResponse) => {
      if (!active || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const request = response.notification.request;
      const route = notificationDestination(request.content.data);
      if (!route || lastHandled.current === request.identifier) return;
      lastHandled.current = request.identifier;
      router.push(route);
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(response => { liveResponseReceived = true; open(response); });
    void Notifications.getLastNotificationResponseAsync().then(response => { if (response && !liveResponseReceived) open(response); }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, [navigation?.key, router]);
  return null;
}
