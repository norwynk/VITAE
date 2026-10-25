/**
 * The service worker that shows dose reminders when PRICK isn't open.
 * Served as a route so it carries this environment's Firebase config.
 * Firebase's own worker code displays the notification; tapping it opens
 * the member's account.
 */
const FIREBASE_VERSION = '12.19.0';

export function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const body = `importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(config)});
firebase.messaging();
`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' },
  });
}
