const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

async function sendToAllUsers(title, body) {
  const db = getFirestore();
  const messaging = getMessaging();

  const snapshot = await db.collection("fcmTokens").get();
  if (snapshot.empty) {
    console.log("No tokens found");
    return;
  }

  const invalidTokens = [];
  // Deduplicate by raw token value — a single APNs/FCM token may appear in
  // multiple Firestore docs (e.g. native device-ID doc + user-ID doc on iOS).
  // Sending to the same token twice delivers two notifications to one device.
  const seenTokens = new Set();

  const sends = snapshot.docs.map(async (docSnap) => {
    const { token, platform } = docSnap.data();
    if (!token) return;
    if (seenTokens.has(token)) return;
    seenTokens.add(token);

    const message = {
      token,
      notification: { title, body },
      data: { navigateTo: "home" },
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "expense_reminders" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    try {
      await messaging.send(message);
      console.log(`✅ Sent to ${docSnap.id} (${platform})`);
    } catch (err) {
      // Only treat definitively-invalid tokens as stale.
      // messaging/third-party-auth-error means our APNs key/cert failed —
      // it is a server-side credential error, not a per-device token error.
      // Deleting tokens on that code would silently unsubscribe all iOS users
      // whenever APNs auth has a transient issue.
      const staleToken =
        err.code === "messaging/invalid-registration-token" ||
        err.code === "messaging/registration-token-not-registered";

      if (staleToken) invalidTokens.push(docSnap.id);
      console.error(`❌ Failed for ${docSnap.id} (${platform}):`, err.code);
    }
  });

  await Promise.all(sends);

  if (invalidTokens.length > 0) {
    // Firestore batch writes are capped at 500 operations per commit.
    const BATCH_SIZE = 500;
    for (let i = 0; i < invalidTokens.length; i += BATCH_SIZE) {
      const chunk = invalidTokens.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach((id) => batch.delete(db.collection("fcmTokens").doc(id)));
      await batch.commit();
    }
    console.log(`🧹 Removed ${invalidTokens.length} invalid tokens`);
  }
}

exports.morningExpenseReminder = onSchedule(
  {
    schedule: "0 8 * * *", // 8:00 AM IST
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    await sendToAllUsers(
      "☀️ Good Morning! Plan Your Day",
      "Start the day right — set your budget and track expenses as you go!"
    );
  }
);

exports.dailyExpenseReminder = onSchedule(
  {
    schedule: "0 21 * * *", // 9:00 PM IST
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    await sendToAllUsers(
      "💸 Daily Expense Check-in",
      "Did you log today's expenses? Takes just 30 seconds!"
    );
  }
);
