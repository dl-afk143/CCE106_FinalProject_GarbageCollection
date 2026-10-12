import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const API_URL = "http://192.168.1.227:3000";

type StoredUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status?: string;
};

export default function ProfileSettings() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem("loggedInUser");
        if (!saved) {
          router.replace("/login");
          return;
        }

        const stored: StoredUser = JSON.parse(saved);
        setUser(stored);
        setFullName(stored.fullName || "");
        setEmail(stored.email || "");

        // Refresh from the server so we show the latest saved values.
        const response = await fetch(`${API_URL}/users/${stored.id}/profile`);
        const data = await response.json();
        if (response.ok && data.success) {
          setFullName(data.user.fullName);
          setEmail(data.user.email);
        }
      } catch (err) {
        console.log("PROFILE LOAD ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      Alert.alert("Missing information", "Full name and email are required.");
      return;
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        Alert.alert("Current password needed", "Enter your current password.");
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert("Weak password", "New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert("Passwords don't match", "Confirm your new password again.");
        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/users/${user.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert("Could not save", data.message || "Please try again.");
        return;
      }

      // Keep the stored login in sync so the dashboard shows the new name.
      const updated: StoredUser = {
        ...user,
        fullName: data.user.fullName,
        email: data.user.email,
      };
      await AsyncStorage.setItem("loggedInUser", JSON.stringify(updated));
      setUser(updated);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.log("PROFILE SAVE ERROR:", err);
      Alert.alert("Connection error", "Could not reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="#198754" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerIcon}>
          <Ionicons name="person-circle" size={28} color="#FFFFFF" />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Profile Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your account</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#198754" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Personal information</Text>

              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor="#98A5A0"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#98A5A0"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Role</Text>
              <View style={[styles.input, styles.locked]}>
                <Text style={styles.lockedText}>Resident</Text>
                <Ionicons name="lock-closed" size={14} color="#98A5A0" />
              </View>
              <Text style={styles.hint}>
                Your role and account status can only be changed by an admin.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Change password</Text>
                <TouchableOpacity onPress={() => setShowPasswords((v) => !v)}>
                  <Ionicons
                    name={showPasswords ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#5F6F68"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Leave blank to keep your current password.</Text>

              <Text style={styles.label}>Current password</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
                placeholder="Current password"
                placeholderTextColor="#98A5A0"
              />

              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
                placeholder="At least 6 characters"
                placeholderTextColor="#98A5A0"
              />

              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPasswords}
                autoCapitalize="none"
                placeholder="Repeat new password"
                placeholderTextColor="#98A5A0"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7F5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    backgroundColor: "#198754",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: { flex: 1 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  headerSubtitle: { color: "#DDF5E7", fontSize: 12, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E3EAE6",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#172B24" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5F6F68",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D5DFDA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#172B24",
    backgroundColor: "#FAFCFB",
  },
  locked: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EEF2F0",
  },
  lockedText: { fontSize: 15, color: "#5F6F68" },
  hint: { fontSize: 12, color: "#7A8A83", marginTop: 8 },
  saveButton: {
    backgroundColor: "#198754",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
