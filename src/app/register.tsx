import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const API_URL = "http://192.168.1.28:3000";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Error", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Password Error", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Registration Failed",
          data.message || "Unable to create account.",
        );
        return;
      }

      Alert.alert(
        "Registration Successful",
        "Your account has been created successfully.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/login"),
          },
        ],
      );
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      Alert.alert(
        "Connection Error",
        "Cannot connect to the server. Make sure your backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as a resident</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" />

            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Email</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" />

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.label}>Password</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" />

            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" />

            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? "Creating Account..." : "Register"}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>

            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.loginLink}> Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },

  header: {
    alignItems: "center",
    marginBottom: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1B5E20",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#666",
  },

  form: {
    width: "100%",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 7,
    marginTop: 12,
  },

  inputContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FAFAFA",
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#222",
  },

  registerButton: {
    height: 52,
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },

  disabled: {
    opacity: 0.6,
  },

  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },

  loginText: {
    color: "#666",
    fontSize: 14,
  },

  loginLink: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "bold",
  },
});
