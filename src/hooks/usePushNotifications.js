import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

// Registers for push notifications on Capacitor (iOS/Android).
// onAction is called when the user taps a notification while the app is backgrounded.
// No-ops on web.
export function usePushNotifications(onAction) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listeners = [];

    async function init() {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === "prompt") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted") return;

      await PushNotifications.register();

      listeners.push(
        await PushNotifications.addListener("registration", token => {
          console.log("Push token:", token.value);
        }),
        await PushNotifications.addListener("registrationError", err => {
          console.warn("Push registration error:", err);
        }),
        await PushNotifications.addListener("pushNotificationActionPerformed", action => {
          if (onAction) onAction(action);
        }),
      );
    }

    init().catch(e => console.warn("Push init failed:", e));

    return () => { listeners.forEach(l => l.remove()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
