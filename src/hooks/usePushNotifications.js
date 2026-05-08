import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// Registers for push notifications on Capacitor (iOS/Android).
// Saves the FCM/APNS token to Firestore so the Cloud Function can send messages.
// onAction is called when the user taps a notification while the app is backgrounded.
// No-ops on web or when userId is null (guest / not logged in).
export function usePushNotifications(userId, onAction) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !userId) return;

    let listeners = [];

    async function saveToken(tokenData) {
      try {
        await setDoc(doc(db, "fcmTokens", userId), {
          token:     tokenData.value,
          platform:  Capacitor.getPlatform(), // "ios" | "android"
          updatedAt: Date.now(),
        });
        console.log("FCM token saved for", userId);
      } catch (e) {
        console.warn("FCM token save failed:", e);
      }
    }

    async function init() {
      // Android 8+ requires a channel to exist before notifications can be shown.
      // Must match the channelId in the Cloud Function.
      if (Capacitor.getPlatform() === "android") {
        await PushNotifications.createChannel({
          id:          "expense_reminders",
          name:        "Expense Reminders",
          description: "Daily reminders to log your expenses",
          importance:  4,    // IMPORTANCE_HIGH
          visibility:  1,    // VISIBILITY_PUBLIC
          sound:       "default",
          vibration:   true,
          lights:      true,
        });
      }

      // Request permission if not yet decided
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted") return;

      await PushNotifications.register();

      listeners.push(
        // Registration success → save token to Firestore
        await PushNotifications.addListener("registration", saveToken),

        await PushNotifications.addListener("registrationError", err => {
          console.warn("Push registration error:", err.error);
        }),

        // Foreground notification — show a console log; extend here for in-app banner
        await PushNotifications.addListener("pushNotificationReceived", notification => {
          console.log("Notification received (foreground):", notification.title);
        }),

        // User tapped a notification → call the action handler
        await PushNotifications.addListener("pushNotificationActionPerformed", action => {
          if (onAction) onAction(action);
        }),
      );
    }

    init().catch(e => console.warn("Push init failed:", e));

    return () => { listeners.forEach(l => l.remove()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
