import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission was not granted.");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log("Expo project ID not found.");
    return null;
  }

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    console.log("EXPO PUSH TOKEN:", token);

    return token;
  } catch (error) {
    console.error("Failed to get Expo push token:", error);
    return null;
  }
}

// ==================================================
// SEND TEST PUSH NOTIFICATION
// ==================================================

export async function sendTestPushNotification(token: string) {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        to: token,

        sound: "default",

        title: "Login Successful",

        body: "Welcome back to Garbage Collection Monitoring System!",

        data: {
          type: "login",
        },

        channelId: "default",
      }),
    });

    const data = await response.json();

    console.log("PUSH NOTIFICATION RESPONSE:", data);

    return data;
  } catch (error) {
    console.error("Failed to send test push notification:", error);

    return null;
  }
}
