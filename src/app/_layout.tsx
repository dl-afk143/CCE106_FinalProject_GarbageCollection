import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { registerForPushNotificationsAsync } from "../services/notification";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
  );
}
