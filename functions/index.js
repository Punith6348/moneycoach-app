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

  const sends = snapshot.docs.map(async (docSnap) => {
    const { token, platform } = docSnap.data();
    if (!token) return;

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
      if (
        err.code === "messaging/invalid-registration-token" ||
        err.code === "messaging/registration-token-not-registered"
      ) {
        invalidTokens.push(docSnap.id);
      }
      console.error(`❌ Failed for ${docSnap.id}:`, err.code);
    }
  });

  await Promise.all(sends);

  if (invalidTokens.length > 0) {
    const batch = db.batch();
    invalidTokens.forEach((uid) => {
      batch.delete(db.collection("fcmTokens").doc(uid));
    });
    await batch.commit();
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
