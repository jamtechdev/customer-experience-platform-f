self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'CX Alert';
  const body = notification.body || data.body || '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/assets/images/logo-icon.svg',
      data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/app/alerts/alert-dashboard'));
});
