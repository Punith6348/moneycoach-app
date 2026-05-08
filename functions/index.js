const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.dailyExpenseReminder = onSchedule(
  {
    schedule: "30 15 * * *", // 9:00 PM IST (UTC+5:30)
    timeZone: "Asia/Kolkata",
    region: "asia-south1",   // Mumbai — closest to your users
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();

    // 1. Get all FCM tokens
    const snapshot = await db.collection("fcmTokens").get();
    if (snapshot.empty) {
      console.log("No tokens found");
      return;
    }

    const invalidTokens = [];

    // 2. Send to each user
    const sends = snapshot.docs.map(async (docSnap) => {
      const { token, platform } = docSnap.data();
      if (!token) return;

      const message = {
        token,
        notification: {
          title: "💸 Daily Expense Check-in",
          body: "Did you log today's expenses? Takes just 30 seconds!",
        },
        data: {
          navigateTo: "home",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "expense_reminders",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      try {
        await messaging.send(message);
        console.log(`✅ Sent to ${docSnap.id} (${platform})`);
      } catch (err) {
        // Token expired or invalid — mark for cleanup
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

    // 3. Clean up invalid tokens
    if (invalidTokens.length > 0) {
      const batch = db.batch();
      invalidTokens.forEach((uid) => {
        batch.delete(db.collection("fcmTokens").doc(uid));
      });
      await batch.commit();
      console.log(`🧹 Removed ${invalidTokens.length} invalid tokens`);
    }
  }
);