importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyDIBEdYHHC4HzuK_4uZaXhs__F0OgtoPQ8",
  authDomain: "edges-network-7a0f6.firebaseapp.com",
  projectId: "edges-network-7a0f6",
  storageBucket: "edges-network-7a0f6.firebasestorage.app",
  messagingSenderId: "439416188932",
  appId: "1:439416188932:web:1b3e2fe7eb4c645b494551",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: "/edgesnetworkicon.png",
    badge: "/badge.png",
    data: payload.data,
  });
});
