import { getDb } from "../mongo/client.js";
import { getAccessToken, getProjectId } from "./googleAuth.js";

const FCM_BASE_URL = "https://fcm.googleapis.com/v1/projects";

export async function sendPush(userIds, notification, data = {}, options = {}) {
  try {
    const projectId = getProjectId();
    if (!projectId) {
      console.error("[FCM] FCM_PROJECT_ID not set");
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error("[FCM] No access token available");
      return;
    }

    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return;

    const db = getDb();
    const tokenDocs = await db
      .collection("fcmTokens")
      .find({ userId: { $in: ids.map(String) } })
      .toArray();

    if (tokenDocs.length === 0) return;

    const tokens = tokenDocs.map((d) => d.token);
    const tokenStrings = [...tokens];

    const message = {
      notification: {
        title: notification.title || "",
        body: notification.body || "",
      },
      data: Object.fromEntries(
        Object.entries({ ...data, click_action: "FLUTTER_NOTIFICATION_CLICK" }).map(([k, v]) => [k, String(v ?? "")]),
      ),
    };

    const results = [];
    for (const token of tokens) {
      try {
        const response = await fetch(`${FCM_BASE_URL}/${projectId}/messages:send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: { ...message, token } }),
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`[FCM] Send failed: ${response.status} ${text}`);
          results.push({ error: { code: String(response.status) } });
          continue;
        }

        results.push(await response.json());
      } catch (err) {
        console.error("[FCM] Send error:", err.message);
        results.push({ error: { code: "NETWORK_ERROR" } });
      }
    }

    const invalidTokens = [];
    results.forEach((r, i) => {
      if (r.error) {
        const code = r.error.code || r.error.status || "";
        if (code.includes("UNREGISTERED") || code.includes("NOT_FOUND") || code.includes("invalid-registration")) {
          invalidTokens.push(tokenStrings[i]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await db.collection("fcmTokens").deleteMany({ token: { $in: invalidTokens } });
      console.log(`[FCM] Cleaned up ${invalidTokens.length} invalid tokens`);
    }
  } catch (err) {
    console.error("[FCM] sendPush error:", err.message);
  }
}

export async function sendPushToUser(userId, notification, data = {}, options = {}) {
  return sendPush(userId, notification, data, options);
}

export async function sendPushToMany(userIds, notification, data = {}, options = {}) {
  return sendPush(userIds, notification, data, options);
}
