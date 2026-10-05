import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  registerForPushNotificationsAsync,
  sendTestPushNotification,
} from "../services/notification";

const API_URL = "http://192.168.1.28:3000";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // ==========================================
    // CHECK EMPTY FIELDS
    // ==========================================

    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password.",
      );
      return;
    }

    try {
      setLoading(true);

      // ==========================================
      // LOGIN REQUEST
      // ==========================================

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      // ==========================================
      // READ SERVER RESPONSE
      // ==========================================

      const text = await response.text();

      console.log("LOGIN SERVER STATUS:", response.status);
      console.log("LOGIN SERVER RESPONSE:", text);

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`,
        );
      }

      // ==========================================
      // SERVER LOGIN ERROR
      // ==========================================

      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Invalid email or password.");
      }

      // ==========================================
      // CHECK USER DATA
      // ==========================================

      if (!data.user || !data.user.id) {
        throw new Error("Login succeeded, but user information is missing.");
      }

      const rawRole = String(data.user.role || "")
        .trim()
        .toLowerCase();

      let userRole = "Resident";

      if (rawRole === "admin") {
        userRole = "Admin";
      } else if (rawRole === "personnel") {
        userRole = "Personnel";
      } else if (
        rawRole === "resident" ||
        rawRole === "residential" ||
        rawRole === "user"
      ) {
        userRole = "Resident";
      }

      // ==========================================
      // CHECK ACCOUNT STATUS
      // ==========================================

      const userStatus = String(data.user.status || "Active")
        .trim()
        .toLowerCase();

      if (userStatus === "disabled") {
        Alert.alert(
          "Account Disabled",
          "Your account has been disabled. Please contact the administrator.",
        );

        return;
      }

      // ==========================================
      // SAVE LOGGED-IN USER
      // ==========================================

      const loggedInUser = {
        id: Number(data.user.id),
        fullName: data.user.fullName || data.user.full_name || "",
        email: data.user.email || email.trim(),
        role: userRole,
        status: data.user.status || "Active",
      };

      await AsyncStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

      console.log("====================================");
      console.log("LOGGED-IN USER:", loggedInUser);
      console.log("USER ROLE:", loggedInUser.role);
      console.log("USER STATUS:", loggedInUser.status);
      console.log("====================================");

      // ==========================================
      // PUSH NOTIFICATION REGISTRATION
      // ==========================================

      console.log("REGISTERING FOR PUSH NOTIFICATIONS...");

      try {
        const pushToken = await registerForPushNotificationsAsync();

        if (pushToken) {
          console.log("PUSH TOKEN RECEIVED:", pushToken);

          const notificationResult = await sendTestPushNotification(pushToken);

          console.log("TEST PUSH RESULT:", notificationResult);
        } else {
          console.log("No push token received. Notification test skipped.");
        }
      } catch (notificationError) {
        // Notification failure should NOT prevent login.
        console.log("Push notification setup failed:", notificationError);
      }

      // ==========================================
      // CLEAR LOGIN FORM
      // ==========================================

      setEmail("");
      setPassword("");

      // ==========================================
      // ROLE-BASED NAVIGATION
      // ==========================================

      if (loggedInUser.role === "Admin") {
        // ========================================
        // ADMIN
        // ========================================

        Alert.alert(
          "Admin Login Successful",
          `Welcome, ${loggedInUser.fullName}!`,
          [
            {
              text: "Continue",
              onPress: () => {
                router.replace("/admin");
              },
            },
          ],
        );
      } else if (loggedInUser.role === "Personnel") {
        // ========================================
        // PERSONNEL
        // ========================================

        Alert.alert(
          "Personnel Login Successful",
          `Welcome, ${loggedInUser.fullName}!`,
          [
            {
              text: "Continue",
              onPress: () => {
                router.replace("/personnel-management");
              },
            },
          ],
        );
      } else {
        // ========================================
        // RESIDENT
        // ========================================

        Alert.alert(
          "Login Successful",
          `Welcome back, ${loggedInUser.fullName}!`,
          [
            {
              text: "Continue",
              onPress: () => {
                router.replace("/dashboard");
              },
            },
          ],
        );
      }
    } finally {
      // ==========================================
      // STOP LOADING
      // ==========================================

      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* ==========================================
            TITLE
        ========================================== */}

        <Text style={styles.title}>Welcome Back</Text>

        <Text style={styles.subtitle}>
          Sign in to your Garbage Collection account
        </Text>

        {/* ==========================================
            EMAIL
        ========================================== */}

        <Text style={styles.label}>Email</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        {/* ==========================================
            PASSWORD
        ========================================== */}

        <Text style={styles.label}>Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          onSubmitEditing={handleLogin}
        />

        {/* ==========================================
            LOGIN BUTTON
        ========================================== */}

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* ==========================================
            REGISTER
        ========================================== */}

        <TouchableOpacity
          onPress={() => router.replace("/register")}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.registerText}>
            Don't have an account? Register
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#102A43",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#102A43",
    backgroundColor: "#FFFFFF",
  },

  loginButton: {
    height: 52,
    backgroundColor: "#087F5B",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },

  disabledButton: {
    opacity: 0.7,
  },

  loginText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  registerText: {
    textAlign: "center",
    marginTop: 18,
    fontSize: 12,
    color: "#087F5B",
    fontWeight: "700",
  },
});
