
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
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

const API_URL = "http://192.168.1.227:3000";

type UserRole = "Admin" | "Personnel" | "Resident";
type DashboardRoute =
  | "/admin"
  | "/personnel-management"
  | "/dashboard";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Error modal state
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("Login Failed");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorType, setErrorType] = useState<
    "connection" | "login"
  >("login");

  // Success modal state
  const [successModalVisible, setSuccessModalVisible] =
    useState(false);
  const [successTitle, setSuccessTitle] =
    useState("Login Successful");
  const [successMessage, setSuccessMessage] = useState("");
  const [successRoute, setSuccessRoute] =
    useState<DashboardRoute>("/dashboard");

  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorType("login");
    setErrorModalVisible(true);
  };

  const showSuccess = (
    title: string,
    message: string,
    destination: DashboardRoute
  ) => {
    setSuccessTitle(title);
    setSuccessMessage(message);
    setSuccessRoute(destination);
    setSuccessModalVisible(true);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showError(
        "Missing Information",
        "Please enter your email address and password to continue."
      );
      return;
    }

    try {
      setLoading(true);

      // LOGIN REQUEST
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      // READ SERVER RESPONSE
      const text = await response.text();

      console.log("LOGIN SERVER STATUS:", response.status);
      console.log("LOGIN SERVER RESPONSE:", text);

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `The server returned an invalid response (${response.status}).`
        );
      }

      // VALIDATE LOGIN
      if (!response.ok || !data.success) {
        throw new Error(
          data?.message || "Invalid email or password."
        );
      }

      // CHECK USER DATA
      if (!data.user || !data.user.id) {
        throw new Error(
          "Login succeeded, but user information is missing."
        );
      }

      // NORMALIZE USER ROLE
      const rawRole = String(data.user.role || "")
        .trim()
        .toLowerCase();

      let userRole: UserRole = "Resident";

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

      // CHECK ACCOUNT STATUS
      const userStatus = String(
        data.user.status || "Active"
      )
        .trim()
        .toLowerCase();

      if (userStatus === "disabled") {
        showError(
          "Account Disabled",
          "Your account has been disabled. Please contact the administrator."
        );
        return;
      }

      // SAVE USER SESSION
      const loggedInUser = {
        id: Number(data.user.id),
        fullName:
          data.user.fullName || data.user.full_name || "",
        email: data.user.email || email.trim(),
        role: userRole,
        status: data.user.status || "Active",
      };

      await AsyncStorage.setItem(
        "loggedInUser",
        JSON.stringify(loggedInUser)
      );

      console.log("LOGGED-IN USER:", loggedInUser);

      // PUSH NOTIFICATION REGISTRATION
      // Notification errors should not prevent login.
      try {
        console.log("REGISTERING FOR PUSH NOTIFICATIONS...");

        const pushToken =
          await registerForPushNotificationsAsync();

        if (pushToken) {
          console.log("PUSH TOKEN RECEIVED:", pushToken);

          const notificationResult =
            await sendTestPushNotification(pushToken);

          console.log(
            "TEST PUSH RESULT:",
            notificationResult
          );
        } else {
          console.log(
            "No push token received. Test skipped."
          );
        }
      } catch (notificationError) {
        console.log(
          "Push notification setup failed:",
          notificationError
        );
      }

      // CLEAR LOGIN FORM
      setEmail("");
      setPassword("");

      // ROLE-BASED CUSTOM SUCCESS MODAL
      if (loggedInUser.role === "Admin") {
        showSuccess(
          "Login Successful",
          `Welcome, ${loggedInUser.fullName}!`,
          "/admin"
        );
      } else if (loggedInUser.role === "Personnel") {
        showSuccess(
          "Login Successful",
          `Welcome, ${loggedInUser.fullName}!\n\nYou are logged in as Collection Personnel.`,
          "/personnel-management"
        );
      } else {
        showSuccess(
          "Login Successful",
          `Welcome back, ${loggedInUser.fullName}!\n\nYou are logged in as Resident.`,
          "/dashboard"
        );
      }
    } catch (error: unknown) {
      console.log("LOGIN ERROR:", error);

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.";

      if (message.includes("Network request failed")) {
        setErrorType("connection");
        setErrorTitle("Connection Error");
        setErrorMessage(
          "We couldn't connect to the server. Check that your backend is running and your phone is connected to the same Wi-Fi network."
        );
        setErrorModalVisible(true);
      } else {
        showError(
          "Login Unsuccessful",
          message ||
            "Please check your credentials and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* HEADER */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>♻</Text>
        </View>

        <Text style={styles.title}>Welcome Back</Text>

        <Text style={styles.subtitle}>
          Sign in to your Garbage Collection account
        </Text>

        {/* EMAIL */}
        <Text style={styles.label}>Email Address</Text>

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
          returnKeyType="next"
        />

        {/* PASSWORD */}
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
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />

        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* REGISTER */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.replace("/register")}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.registerText}>
            Don't have an account?{" "}
            <Text style={styles.registerHighlight}>
              Register
            </Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Garbage Collection Scheduling and Monitoring System
        </Text>
      </View>

      {/* CUSTOM SUCCESS MODAL */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successIcon}>✓</Text>
            </View>

            <Text style={styles.successTitle}>
              {successTitle}
            </Text>

            <Text style={styles.successDescription}>
              {successMessage}
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              activeOpacity={0.8}
              onPress={() => {
                setSuccessModalVisible(false);
                router.replace(successRoute);
              }}
            >
              <Text style={styles.successButtonText}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CUSTOM ERROR MODAL */}
      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorCard}>
            <View
              style={[
                styles.errorIconCircle,
                errorType === "connection"
                  ? styles.connectionIcon
                  : styles.loginErrorIcon,
              ]}
            >
              <Text
                style={[
                  styles.errorIcon,
                  errorType === "connection"
                    ? styles.connectionIconText
                    : styles.loginErrorIconText,
                ]}
              >
                {errorType === "connection" ? "!" : "×"}
              </Text>
            </View>

            <Text style={styles.errorTitle}>
              {errorTitle}
            </Text>

            <Text style={styles.errorDescription}>
              {errorMessage}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.errorButton,
                pressed && styles.errorButtonPressed,
              ]}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.errorButtonText}>
                Got it
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },

  logoCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#E6F5EF",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  logoIcon: {
    fontSize: 37,
    color: "#087F5B",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#102A43",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DCE4EC",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#102A43",
    backgroundColor: "#FFFFFF",
    fontSize: 14,
  },

  loginButton: {
    height: 52,
    backgroundColor: "#087F5B",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },

  disabledButton: {
    opacity: 0.65,
  },

  loginText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  registerButton: {
    paddingVertical: 16,
  },

  registerText: {
    textAlign: "center",
    fontSize: 13,
    color: "#64748B",
  },

  registerHighlight: {
    color: "#087F5B",
    fontWeight: "800",
  },

  footerText: {
    fontSize: 10,
    lineHeight: 15,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },

  // SHARED MODAL BACKGROUND
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },

  // SUCCESS MODAL
  successCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
  },

  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E6F5EF",
    borderWidth: 1,
    borderColor: "#C5E8D9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  successIcon: {
    fontSize: 36,
    fontWeight: "700",
    color: "#087F5B",
  },

  successTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#102A43",
    textAlign: "center",
    marginBottom: 12,
  },

  successDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },

  successButton: {
    width: "100%",
    backgroundColor: "#087F5B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  successButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ERROR MODAL
  errorCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
  },

  errorIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  connectionIcon: {
    backgroundColor: "#FEF3C7",
  },

  loginErrorIcon: {
    backgroundColor: "#FEE2E2",
  },

  errorIcon: {
    fontSize: 36,
    fontWeight: "700",
  },

  connectionIconText: {
    color: "#B45309",
  },

  loginErrorIconText: {
    color: "#B91C1C",
  },

  errorTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#102A43",
    textAlign: "center",
    marginBottom: 10,
  },

  errorDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },

  errorButton: {
    width: "100%",
    backgroundColor: "#087F5B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  errorButtonPressed: {
    opacity: 0.8,
  },

  errorButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
