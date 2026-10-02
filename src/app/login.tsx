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

const API_URL = "http://192.168.1.28:3000";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password.",
      );
      return;
    }

    try {
      setLoading(true);

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

      const text = await response.text();

      console.log("LOGIN SERVER STATUS:", response.status);
      console.log("LOGIN SERVER RESPONSE:", text);

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned invalid response (${response.status}).`,
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      Alert.alert("Login Successful", "Welcome back!", [
        {
          text: "OK",
          onPress: () => router.replace("/tabs/dashboard"),
        },
      ]);

      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Login error:", error);

      Alert.alert(
        "Login Failed",
        error instanceof Error
          ? error.message
          : "Unable to login. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>

        <Text style={styles.subtitle}>
          Sign in to your Garbage Collection account
        </Text>

        <Text style={styles.label}>Email</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/register")}
          disabled={loading}
        >
          <Text style={styles.registerText}>
            Don't have an account? Register
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
