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

const API_URL = "http://192.168.1.28:3000";

type Personnel = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

export default function PersonnelManagementScreen() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(
    null,
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [saving, setSaving] = useState(false);

  // =====================================================
  // LOAD PERSONNEL
  // =====================================================

  const loadPersonnel = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/personnel`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load personnel");
      }

      setPersonnel(data.personnel || []);
    } catch (error) {
      console.error("Load personnel error:", error);

      Alert.alert(
        "Connection Error",
        "Unable to load personnel. Make sure your backend server is running.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPersonnel();
  }, [loadPersonnel]);

  // =====================================================
  // REFRESH
  // =====================================================

  const onRefresh = () => {
    setRefreshing(true);
    loadPersonnel();
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredPersonnel = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return personnel;
    }

    return personnel.filter(
      (person) =>
        person.full_name.toLowerCase().includes(keyword) ||
        person.email.toLowerCase().includes(keyword),
    );
  }, [personnel, search]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalPersonnel = personnel.length;

  const activePersonnel = personnel.filter(
    (person) => person.status === "Active",
  ).length;

  const disabledPersonnel = personnel.filter(
    (person) => person.status === "Disabled",
  ).length;

  // =====================================================
  // OPEN ADD MODAL
  // =====================================================

  const openAddModal = () => {
    setEditingPersonnel(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setModalVisible(true);
  };

  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  const openEditModal = (person: Personnel) => {
    setEditingPersonnel(person);
    setFullName(person.full_name);
    setEmail(person.email);
    setPassword("");
    setModalVisible(true);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    setEditingPersonnel(null);
    setFullName("");
    setEmail("");
    setPassword("");
  };

  // =====================================================
  // EMAIL VALIDATION
  // =====================================================

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  // =====================================================
  // SAVE PERSONNEL
  // =====================================================

  const savePersonnel = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      Alert.alert("Required", "Please enter the personnel's full name.");
      return;
    }

    if (!cleanEmail) {
      Alert.alert("Required", "Please enter an email address.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // Password is required only when creating
    // a new personnel account.
    if (!editingPersonnel && password.length < 6) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 6 characters.",
      );
      return;
    }

    setSaving(true);

    try {
      let response: Response;

      // =================================================
      // EDIT PERSONNEL
      // =================================================

      if (editingPersonnel) {
        response = await fetch(`${API_URL}/personnel/${editingPersonnel.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: cleanName,
            email: cleanEmail,
          }),
        });
      }

      // =================================================
      // CREATE PERSONNEL
      // =================================================
      else {
        response = await fetch(`${API_URL}/personnel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: cleanName,
            email: cleanEmail,
            password,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save personnel");
      }

      Alert.alert(
        "Success",
        editingPersonnel
          ? "Personnel information updated successfully."
          : "Personnel account created successfully.",
      );

      closeModal();

      await loadPersonnel();
    } catch (error: any) {
      console.error("Save personnel error:", error);

      Alert.alert(
        "Error",
        error?.message || "Something went wrong while saving personnel.",
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // CHANGE STATUS
  // =====================================================

  const toggleStatus = (person: Personnel) => {
    const newStatus = person.status === "Active" ? "Disabled" : "Active";

    const action = newStatus === "Active" ? "enable" : "disable";

    Alert.alert(
      `${newStatus === "Active" ? "Enable" : "Disable"} Personnel`,
      `Are you sure you want to ${action} ${person.full_name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: newStatus === "Active" ? "Enable" : "Disable",
          style: newStatus === "Active" ? "default" : "destructive",

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
                  data.message || "Failed to update personnel status",
                );
              }

              await loadPersonnel();
            } catch (error: any) {
              console.error("Status update error:", error);

              Alert.alert(
                "Error",
                error?.message || "Unable to update personnel status.",
              );
            }
          },
        },
      ],
    );
  };

  // =====================================================
  // DELETE PERSONNEL
  // =====================================================

  const deletePersonnel = (person: Personnel) => {
    Alert.alert(
      "Delete Personnel",
      `Are you sure you want to permanently delete ${person.full_name}?`,
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
              const response = await fetch(
                `${API_URL}/personnel/${person.id}`,
                {
                  method: "DELETE",
                },
              );

              const data = await response.json();

              if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to delete personnel");
              }

              Alert.alert("Deleted", "Personnel account has been deleted.");

              await loadPersonnel();
            } catch (error: any) {
              console.error("Delete personnel error:", error);

              Alert.alert(
                "Error",
                error?.message || "Unable to delete personnel.",
              );
            }
          },
        },
      ],
    );
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return "Unknown";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#198754" />

          <Text style={styles.loadingText}>Loading personnel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Personnel Header Icon */}
        <View style={styles.headerIcon}>
          <Ionicons name="briefcase" size={27} color="#2E8B57" />
        </View>

        {/* Header Text */}
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Personnel Management</Text>

          <Text style={styles.headerSubtitle}>Manage collection personnel</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#198754"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* STATISTICS */}
        <View style={styles.statsRow}>
          {/* TOTAL */}
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="people" size={22} color="#198754" />
            </View>

            <Text style={styles.statNumber}>{totalPersonnel}</Text>

            <Text style={styles.statLabel}>Total</Text>
          </View>

          {/* ACTIVE */}
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor: "#EAF7EF",
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={22} color="#198754" />
            </View>

            <Text style={styles.statNumber}>{activePersonnel}</Text>

            <Text style={styles.statLabel}>Active</Text>
          </View>

          {/* DISABLED */}
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor: "#FFF1F1",
                },
              ]}
            >
              <Ionicons name="ban" size={22} color="#DC3545" />
            </View>

            <Text style={styles.statNumber}>{disabledPersonnel}</Text>

            <Text style={styles.statLabel}>Disabled</Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={21} color="#888" />

          <TextInput
            style={styles.searchInput}
            placeholder="Search personnel..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={21} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* SECTION HEADER */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Collection Personnel</Text>

            <Text style={styles.sectionSubtitle}>
              {filteredPersonnel.length} personnel found
            </Text>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={18} color="#FFFFFF" />

            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* PERSONNEL LIST */}
        {filteredPersonnel.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={42} color="#198754" />
            </View>

            <Text style={styles.emptyTitle}>
              {search ? "No personnel found" : "No personnel yet"}
            </Text>

            <Text style={styles.emptyText}>
              {search
                ? "Try searching with a different name or email."
                : "Add your first collection personnel account."}
            </Text>

            {!search && (
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={openAddModal}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />

                <Text style={styles.emptyAddButtonText}>Add Personnel</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredPersonnel.map((person) => (
            <View key={person.id} style={styles.personCard}>
              {/* PERSON HEADER */}
              <View style={styles.personTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {person.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{person.full_name}</Text>

                  <Text style={styles.personEmail}>{person.email}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    person.status === "Active"
                      ? styles.activeBadge
                      : styles.disabledBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      person.status === "Active"
                        ? styles.activeDot
                        : styles.disabledDot,
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      person.status === "Active"
                        ? styles.activeText
                        : styles.disabledText,
                    ]}
                  >
                    {person.status}
                  </Text>
                </View>
              </View>

              {/* DETAILS */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={17}
                    color="#198754"
                  />

                  <Text style={styles.detailText}>Personnel</Text>
                </View>

                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={17} color="#777" />

                  <Text style={styles.detailText}>
                    {formatDate(person.created_at)}
                  </Text>
                </View>
              </View>

              {/* ACTION BUTTONS */}
              <View style={styles.actionRow}>
                {/* EDIT */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(person)}
                >
                  <Ionicons name="create-outline" size={18} color="#198754" />

                  <Text style={styles.editActionText}>Edit</Text>
                </TouchableOpacity>

                {/* ENABLE / DISABLE */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => toggleStatus(person)}
                >
                  <Ionicons
                    name={
                      person.status === "Active"
                        ? "ban-outline"
                        : "checkmark-circle-outline"
                    }
                    size={18}
                    color={person.status === "Active" ? "#DC3545" : "#198754"}
                  />

                  <Text
                    style={[
                      styles.actionText,
                      {
                        color:
                          person.status === "Active" ? "#DC3545" : "#198754",
                      },
                    ]}
                  >
                    {person.status === "Active" ? "Disable" : "Enable"}
                  </Text>
                </TouchableOpacity>

                {/* DELETE */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deletePersonnel(person)}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC3545" />

                  <Text style={styles.deleteActionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      <Modal
        visible={modalVisible}
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
              <View>
                <Text style={styles.modalTitle}>
                  {editingPersonnel ? "Edit Personnel" : "Add Personnel"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {editingPersonnel
                    ? "Update personnel information"
                    : "Create a collection personnel account"}
                </Text>
              </View>

              <TouchableOpacity onPress={closeModal} disabled={saving}>
                <Ionicons name="close" size={26} color="#555" />
              </TouchableOpacity>
            </View>

            {/* FULL NAME */}
            <Text style={styles.inputLabel}>Full Name</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#888" />

              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            {/* EMAIL */}
            <Text style={styles.inputLabel}>Email Address</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#888" />

              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
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
                  <Ionicons name="lock-closed-outline" size={20} color="#888" />

                  <TextInput
                    style={styles.input}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            {/* ROLE */}
            <Text style={styles.inputLabel}>Role</Text>

            <View style={styles.roleBox}>
              <Ionicons name="shield-checkmark" size={20} color="#198754" />

              <Text style={styles.roleText}>Personnel</Text>

              <Text style={styles.roleLocked}>Fixed</Text>
            </View>

            {/* SAVE */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={savePersonnel}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={
                      editingPersonnel ? "save-outline" : "person-add-outline"
                    }
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text style={styles.saveButtonText}>
                    {editingPersonnel ? "Save Changes" : "Create Personnel"}
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8F6",
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E7E7",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#222",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },

  // ===================================================
  // SCROLL
  // ===================================================

  scrollContent: {
    padding: 16,
  },

  // ===================================================
  // STATISTICS
  // ===================================================

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5EAE7",
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAF7EF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
  },

  statLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },

  // ===================================================
  // SEARCH
  // ===================================================

  searchContainer: {
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E0E5E2",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#222",
  },

  // ===================================================
  // SECTION
  // ===================================================

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },

  addButton: {
    backgroundColor: "#198754",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // ===================================================
  // PERSONNEL CARD
  // ===================================================

  personCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E3E8E5",
  },

  personTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EAF7EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#198754",
  },

  personInfo: {
    flex: 1,
  },

  personName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
  },

  personEmail: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  // ===================================================
  // STATUS
  // ===================================================

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  activeBadge: {
    backgroundColor: "#EAF7EF",
  },

  disabledBadge: {
    backgroundColor: "#FFF0F0",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  activeDot: {
    backgroundColor: "#198754",
  },

  disabledDot: {
    backgroundColor: "#DC3545",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  activeText: {
    color: "#198754",
  },

  disabledText: {
    color: "#DC3545",
  },

  // ===================================================
  // DETAILS
  // ===================================================

  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    gap: 20,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  detailText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#666",
  },

  // ===================================================
  // ACTION BUTTONS
  // ===================================================

  actionRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8,
  },

  actionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    backgroundColor: "#F4F8F5",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },

  editActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#198754",
  },

  actionText: {
    fontSize: 12,
    fontWeight: "700",
  },

  deleteButton: {
    backgroundColor: "#FFF4F4",
  },

  deleteActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC3545",
  },

  // ===================================================
  // EMPTY STATE
  // ===================================================

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 35,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E3E8E5",
  },

  emptyIcon: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: "#EAF7EF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
  },

  emptyText: {
    textAlign: "center",
    color: "#777",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },

  emptyAddButton: {
    backgroundColor: "#198754",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 6,
  },

  emptyAddButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // ===================================================
  // MODAL
  // ===================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 22,
    paddingBottom: Platform.OS === "ios" ? 35 : 22,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#222",
  },

  modalSubtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  // ===================================================
  // INPUTS
  // ===================================================

  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 7,
    marginTop: 10,
  },

  inputContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DDE3DF",
    borderRadius: 11,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFCFB",
  },

  input: {
    flex: 1,
    marginLeft: 9,
    fontSize: 14,
    color: "#222",
  },

  // ===================================================
  // ROLE
  // ===================================================

  roleBox: {
    height: 50,
    borderRadius: 11,
    backgroundColor: "#EAF7EF",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBE8D6",
  },

  roleText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 14,
    fontWeight: "700",
    color: "#198754",
  },

  roleLocked: {
    fontSize: 11,
    color: "#777",
  },

  // ===================================================
  // SAVE BUTTON
  // ===================================================

  saveButton: {
    height: 50,
    backgroundColor: "#198754",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 22,
  },

  disabledButton: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // ===================================================
  // CANCEL
  // ===================================================

  cancelButton: {
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },

  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
