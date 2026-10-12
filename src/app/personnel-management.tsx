import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "http://192.168.1.227:3000";

type Personnel = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
};

export default function PersonnelManagementScreen() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(
    null,
  );

  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [searchText, setSearchText] = useState("");

  // ==========================================
  // LOAD PERSONNEL
  // ==========================================

  const loadPersonnel = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/personnel`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load personnel.");
      }

      setPersonnel(data.personnel || []);
    } catch (error: any) {
      console.log("Load personnel error:", error);

      Alert.alert(
        "Connection Error",
        error?.message || "Unable to connect to the backend.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPersonnel();
  }, [loadPersonnel]);

  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh = () => {
    setRefreshing(true);
    loadPersonnel();
  };

  // ==========================================
  // OPEN ADD MODAL
  // ==========================================

  const openAddModal = () => {
    setEditingPersonnel(null);

    setFullName("");
    setEmail("");
    setPassword("");

    setShowModal(true);
  };

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  const openEditModal = (person: Personnel) => {
    setEditingPersonnel(person);

    setFullName(person.full_name);
    setEmail(person.email);
    setPassword("");

    setShowModal(true);
  };

  // ==========================================
  // CLOSE MODAL
  // ==========================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingPersonnel(null);

    setFullName("");
    setEmail("");
    setPassword("");
  };

  // ==========================================
  // SAVE PERSONNEL
  // ==========================================

  const savePersonnel = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      Alert.alert(
        "Missing Information",
        "Please enter the personnel's full name.",
      );
      return;
    }

    if (!cleanEmail) {
      Alert.alert("Missing Information", "Please enter the personnel's email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!editingPersonnel && password.length < 6) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 6 characters.",
      );
      return;
    }

    try {
      setSaving(true);

      const isEditing = editingPersonnel !== null;

      const url = isEditing
        ? `${API_URL}/personnel/${editingPersonnel.id}`
        : `${API_URL}/personnel`;

      const method = isEditing ? "PUT" : "POST";

      const body = isEditing
        ? {
            fullName: cleanName,
            email: cleanEmail,
          }
        : {
            fullName: cleanName,
            email: cleanEmail,
            password,
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save personnel account.");
      }

      Alert.alert(
        "Success",
        isEditing
          ? "Personnel account updated successfully!"
          : "Personnel account created successfully!",
      );

      setShowModal(false);
      setEditingPersonnel(null);
      setFullName("");
      setEmail("");
      setPassword("");

      await loadPersonnel();
    } catch (error: any) {
      console.log("Save personnel error:", error);

      Alert.alert(
        "Error",
        error?.message || "Failed to save personnel account.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ENABLE / DISABLE
  // ==========================================

  const togglePersonnelStatus = (person: Personnel) => {
    const isActive = person.status === "Active";

    const newStatus = isActive ? "Disabled" : "Active";

    const actionText = isActive ? "disable" : "enable";

    Alert.alert(
      `${isActive ? "Disable" : "Enable"} Personnel`,
      `Are you sure you want to ${actionText} ${person.full_name}'s account?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: isActive ? "Disable" : "Enable",
          style: isActive ? "destructive" : "default",
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_URL}/personnel/${person.id}/status`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    status: newStatus,
                  }),
                },
              );

              const data = await response.json();

              if (!response.ok || !data.success) {
                throw new Error(
                  data.message || "Failed to update personnel status.",
                );
              }

              Alert.alert(
                "Success",
                `Personnel account ${actionText}d successfully.`,
              );

              await loadPersonnel();
            } catch (error: any) {
              console.log("Update personnel status error:", error);

              Alert.alert(
                "Error",
                error?.message || "Failed to update account status.",
              );
            }
          },
        },
      ],
    );
  };

  // ==========================================
  // DELETE PERSONNEL
  // ==========================================

  const deletePersonnel = (person: Personnel) => {
    Alert.alert(
      "Delete Personnel",
      `Are you sure you want to permanently delete ${person.full_name}'s account?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/personnel/${person.id}`, {
                method: "DELETE",
              });

              const data = await response.json();

              if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to delete personnel.");
              }

              Alert.alert("Deleted", "Personnel account deleted successfully.");

              await loadPersonnel();
            } catch (error: any) {
              console.log("Delete personnel error:", error);

              Alert.alert(
                "Error",
                error?.message || "Failed to delete personnel.",
              );
            }
          },
        },
      ],
    );
  };

  // ==========================================
  // SEARCH
  // ==========================================

  const filteredPersonnel = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) {
      return personnel;
    }

    return personnel.filter(
      (person) =>
        person.full_name.toLowerCase().includes(search) ||
        person.email.toLowerCase().includes(search),
    );
  }, [personnel, searchText]);

  // ==========================================
  // COUNTS
  // ==========================================

  const totalPersonnel = personnel.length;

  const activePersonnel = personnel.filter(
    (person) => person.status === "Active",
  ).length;

  const disabledPersonnel = personnel.filter(
    (person) => person.status === "Disabled",
  ).length;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#198754" />

        <Text style={styles.loadingText}>Loading personnel...</Text>
      </SafeAreaView>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ======================================
            HEADER
        ====================================== */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerIcon}>
            <Ionicons name="briefcase" size={27} color="#FFFFFF" />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Personnel Management</Text>

            <Text style={styles.headerSubtitle}>Manage personnel accounts</Text>
          </View>
        </View>

        {/* ======================================
            INTRO CARD
        ====================================== */}

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="briefcase-outline" size={30} color="#198754" />
          </View>

          <View style={styles.introTextContainer}>
            <Text style={styles.introTitle}>Personnel Accounts</Text>

            <Text style={styles.introDescription}>
              Add, edit, enable, disable, and remove collection personnel
              accounts from the system.
            </Text>
          </View>
        </View>

        {/* ======================================
            STATISTICS
        ====================================== */}

        <Text style={styles.sectionTitle}>Personnel Overview</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="briefcase-outline" size={22} color="#198754" />
            </View>

            <Text style={styles.statNumber}>{totalPersonnel}</Text>

            <Text style={styles.statLabel}>Total Personnel</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#198754"
              />
            </View>

            <Text style={styles.statNumber}>{activePersonnel}</Text>

            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.disabledStatIcon]}>
              <Ionicons name="close-circle-outline" size={22} color="#DC3545" />
            </View>

            <Text style={styles.statNumber}>{disabledPersonnel}</Text>

            <Text style={styles.statLabel}>Disabled</Text>
          </View>
        </View>

        {/* ======================================
            ADD PERSONNEL
        ====================================== */}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />

          <Text style={styles.addButtonText}>Add Personnel</Text>
        </TouchableOpacity>

        {/* ======================================
            SEARCH
        ====================================== */}

        <Text style={styles.sectionTitle}>Personnel</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#64748B" />

          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search personnel name or email..."
            placeholderTextColor="#94A3B8"
          />

          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* ======================================
            PERSONNEL LIST
        ====================================== */}

        {filteredPersonnel.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="briefcase-outline" size={35} color="#198754" />
            </View>

            <Text style={styles.emptyTitle}>
              {searchText ? "No personnel found" : "No personnel yet"}
            </Text>

            <Text style={styles.emptyText}>
              {searchText
                ? "Try searching with a different name or email."
                : "Create your first personnel account to get started."}
            </Text>

            {!searchText && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openAddModal}
              >
                <Text style={styles.emptyButtonText}>Add Personnel</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredPersonnel.map((person) => (
            <View key={person.id} style={styles.personCard}>
              {/* PERSONNEL TOP */}

              <View style={styles.personTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {person.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.personMain}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {person.full_name}
                  </Text>

                  <Text style={styles.personEmail} numberOfLines={1}>
                    {person.email}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    person.status === "Disabled" && styles.statusDisabled,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      person.status === "Disabled" && styles.statusDotDisabled,
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      person.status === "Disabled" && styles.statusTextDisabled,
                    ]}
                  >
                    {person.status}
                  </Text>
                </View>
              </View>

              {/* ROLE */}

              <View style={styles.personInfoRow}>
                <Ionicons name="briefcase-outline" size={17} color="#64748B" />

                <Text style={styles.personInfoText}>Collection Personnel</Text>
              </View>

              {/* ID */}

              <View style={styles.personInfoRow}>
                <Ionicons name="id-card-outline" size={17} color="#64748B" />

                <Text style={styles.personInfoText}>
                  Personnel ID: {person.id}
                </Text>
              </View>

              {/* ACTIONS */}

              <View style={styles.actionRow}>
                {/* EDIT */}

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(person)}
                >
                  <Ionicons name="create-outline" size={18} color="#198754" />

                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                {/* ENABLE / DISABLE */}

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    person.status === "Disabled" && styles.enableButton,
                  ]}
                  onPress={() => togglePersonnelStatus(person)}
                >
                  <Ionicons
                    name={
                      person.status === "Active"
                        ? "ban-outline"
                        : "checkmark-circle-outline"
                    }
                    size={18}
                    color={person.status === "Active" ? "#B45309" : "#198754"}
                  />

                  <Text
                    style={[
                      styles.statusButtonText,
                      person.status === "Disabled" && styles.enableButtonText,
                    ]}
                  >
                    {person.status === "Active" ? "Disable" : "Enable"}
                  </Text>
                </TouchableOpacity>

                {/* DELETE */}

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deletePersonnel(person)}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC3545" />

                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ==========================================
          ADD / EDIT MODAL
      ========================================== */}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContainer}>
            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingPersonnel ? "Edit Personnel" : "Add Personnel"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {editingPersonnel
                    ? "Update personnel account information"
                    : "Create a new personnel account"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Ionicons name="close" size={25} color="#334155" />
              </TouchableOpacity>
            </View>

            {/* MODAL CONTENT */}

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              {/* FULL NAME */}

              <Text style={styles.inputLabel}>Full Name</Text>

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#198754" />

                <TextInput
                  style={styles.modalInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>

              {/* EMAIL */}

              <Text style={styles.inputLabel}>Email Address</Text>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#198754" />

                <TextInput
                  style={styles.modalInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* PASSWORD */}

              {!editingPersonnel && (
                <>
                  <Text style={styles.inputLabel}>Password</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#198754"
                    />

                    <TextInput
                      style={styles.modalInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </>
              )}

              {/* ROLE */}

              <Text style={styles.inputLabel}>Account Role</Text>

              <View style={styles.roleBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#198754"
                />

                <View style={{ flex: 1, marginLeft: 9 }}>
                  <Text style={styles.roleTitle}>Personnel</Text>

                  <Text style={styles.roleDescription}>
                    This account will have Personnel access only.
                  </Text>
                </View>
              </View>

              {/* SAVE */}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={savePersonnel}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={21}
                      color="#FFFFFF"
                    />

                    <Text style={styles.saveButtonText}>
                      {editingPersonnel
                        ? "Update Personnel"
                        : "Create Personnel"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* CANCEL */}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <View style={{ height: 25 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F6",
  },

  scrollContent: {
    paddingBottom: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F8F6",
  },

  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 15,
  },

  // ==========================================
  // HEADER
  // ==========================================

  header: {
    backgroundColor: "#198754",
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#DDF5E7",
    fontSize: 12,
    marginTop: 3,
  },

  // ==========================================
  // INTRO
  // ==========================================

  introCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 17,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  introIcon: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
  },

  introTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  introTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },

  introDescription: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  // ==========================================
  // SECTION
  // ==========================================

  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 22,
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },

  // ==========================================
  // STATS
  // ==========================================

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    marginTop: 10,
  },

  statCard: {
    width: "33.33%",
    padding: 6,
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  disabledStatIcon: {
    backgroundColor: "#FFF1F2",
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },

  statLabel: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },

  // ==========================================
  // ADD BUTTON
  // ==========================================

  addButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#198754",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 8,
  },

  // ==========================================
  // SEARCH
  // ==========================================

  searchBox: {
    marginHorizontal: 16,
    marginTop: 11,
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    color: "#334155",
    fontSize: 14,
    minHeight: 48,
  },

  // ==========================================
  // PERSONNEL CARD
  // ==========================================

  personCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  personTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#198754",
    fontSize: 20,
    fontWeight: "800",
  },

  personMain: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  personName: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },

  personEmail: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    flexDirection: "row",
    alignItems: "center",
  },

  statusDisabled: {
    backgroundColor: "#FEE2E2",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 10,
    backgroundColor: "#16A34A",
    marginRight: 5,
  },

  statusDotDisabled: {
    backgroundColor: "#DC2626",
  },

  statusText: {
    color: "#15803D",
    fontSize: 10,
    fontWeight: "800",
  },

  statusTextDisabled: {
    color: "#DC2626",
  },

  personInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  personInfoText: {
    color: "#64748B",
    fontSize: 12,
    marginLeft: 8,
  },

  // ==========================================
  // ACTIONS
  // ==========================================

  actionRow: {
    flexDirection: "row",
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  editButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#EAF7EF",
    marginRight: 4,
  },

  editText: {
    color: "#198754",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },

  statusButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    marginHorizontal: 4,
  },

  statusButtonText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },

  enableButton: {
    backgroundColor: "#EAF7EF",
  },

  enableButtonText: {
    color: "#198754",
  },

  deleteButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    marginLeft: 4,
  },

  deleteText: {
    color: "#DC3545",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },

  // ==========================================
  // EMPTY
  // ==========================================

  emptyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 20,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 13,
  },

  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 5,
  },

  emptyButton: {
    backgroundColor: "#198754",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 15,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // ==========================================
  // MODAL
  // ==========================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "90%",
  },

  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "800",
  },

  modalSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  modalContent: {
    padding: 20,
  },

  // ==========================================
  // INPUTS
  // ==========================================

  inputLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 13,
  },

  inputContainer: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  modalInput: {
    flex: 1,
    color: "#334155",
    fontSize: 14,
    marginLeft: 9,
    minHeight: 48,
  },

  // ==========================================
  // ROLE
  // ==========================================

  roleBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#EAF7EF",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  roleTitle: {
    color: "#198754",
    fontSize: 14,
    fontWeight: "800",
  },

  roleDescription: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },

  // ==========================================
  // SAVE
  // ==========================================

  saveButton: {
    marginTop: 22,
    backgroundColor: "#198754",
    borderRadius: 13,
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 7,
  },

  cancelButton: {
    marginTop: 10,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#64748B",
    fontWeight: "700",
  },
});
