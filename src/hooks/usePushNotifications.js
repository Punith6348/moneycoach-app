import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

function getOrCreateDeviceId() {
  // On iOS, AppDelegate injects window._nativeDeviceId so native and JS share the same doc ID
  if (window._nativeDeviceId) return window._nativeDeviceId;
  let id = localStorage.getItem("mcDeviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mcDeviceId", id);
  }
  return id;
}

// Registers for push notifications on Capacitor (iOS/Android).
// On Android: uses Capacitor registration event (returns FCM token directly).
// On iOS: AppDelegate saves token natively via REST; also dispatches 'fcmTokenReady'
//         so JS can update the doc with userId when the user logs in.
// Works for both logged-in users and guests (uses a stable device ID for guests).
export function usePushNotifications(userId, onAction) {
  const onActionRef = useRef(onAction);
  useEffect(() => { onActionRef.current = onAction; });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listeners = [];
    let cancelled = false;
    let fcmTokenListener = null;

    async function saveToken(token) {
      if (cancelled) return;
      const platform = Capacitor.getPlatform();
      const docId = userId || getOrCreateDeviceId();
      try {
        await setDoc(doc(db, "fcmTokens", docId), {
          token,
          platform,
          updatedAt: Date.now(),
          userId:    userId || null,
        });
      } catch (e) {
        console.error("[Push] token save failed:", e.code, e.message);
      }
    }

    async function init() {
      if (Capacitor.getPlatform() === "android") {
        await PushNotifications.createChannel({
          id:          "expense_reminders",
          name:        "Expense Reminders",
          description: "Daily reminders to log your expenses",
          importance:  4,
          visibility:  1,
          sound:       "default",
          vibration:   true,
          lights:      true,
        });
      }

      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted") return;

      if (Capacitor.getPlatform() === "ios") {
        // AppDelegate already saved the token natively.
        // This JS path updates the doc with the correct userId when the user logs in,
        // and provides a fallback if the native save somehow missed.
        if (window._fcmToken) {
          await saveToken(window._fcmToken);
        } else {
          fcmTokenListener = (e) => {
            if (!cancelled) saveToken(e.detail.token);
          };
          window.addEventListener("fcmTokenReady", fcmTokenListener);
        }
      }

      listeners.push(
        await PushNotifications.addListener("registration", (tokenData) => {
          // Android: FCM token comes directly here
          if (Capacitor.getPlatform() === "android") {
            saveToken(tokenData.value);
          }
        }),
        await PushNotifications.addListener("registrationError", err => {
          console.warn("[Push] registration error:", err.error);
        }),
        await PushNotifications.addListener("pushNotificationReceived", () => {}),
        await PushNotifications.addListener("pushNotificationActionPerformed", action => {
          if (onActionRef.current) onActionRef.current(action);
        }),
      );

      await PushNotifications.register();
    }

    init().catch(e => console.warn("[Push] init failed:", e));

    return () => {
      cancelled = true;
      listeners.forEach(l => l?.remove());
      if (fcmTokenListener) {
        window.removeEventListener("fcmTokenReady", fcmTokenListener);
      }
    };
  }, [userId]);
}
