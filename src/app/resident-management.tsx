import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
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

type Resident = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
};

export default function ResidentManagementScreen() {
  const [residents, setResidents] = useState<Resident[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);

  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [searchText, setSearchText] = useState("");

  // ==========================================
  // LOAD RESIDENTS
  // ==========================================

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/users`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load residents.");
      }

      setResidents(data.users || []);
    } catch (error: any) {
      console.log("Load residents error:", error);

      Alert.alert(
        "Connection Error",
        error.message || "Unable to connect to the backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadResidents();

    setRefreshing(false);
  };

  // ==========================================
  // OPEN ADD MODAL
  // ==========================================

  const openAddModal = () => {
    setEditingResident(null);

    setFullName("");
    setEmail("");
    setPassword("");

    setShowModal(true);
  };

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  const openEditModal = (resident: Resident) => {
    setEditingResident(resident);

    setFullName(resident.full_name);
    setEmail(resident.email);
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

    setEditingResident(null);

    setFullName("");
    setEmail("");
    setPassword("");
  };

  // ==========================================
  // SAVE RESIDENT
  // ==========================================

  const saveResident = async () => {
    if (!fullName.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter the resident's full name.",
      );
      return;
    }

    if (!email.trim()) {
      Alert.alert("Missing Information", "Please enter the resident's email.");
      return;
    }

    if (!editingResident && !password.trim()) {
      Alert.alert("Missing Information", "Please enter a password.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      setSaving(true);

      const isEditing = editingResident !== null;

      const url = isEditing
        ? `${API_URL}/users/${editingResident.id}`
        : `${API_URL}/users`;

      const method = isEditing ? "PUT" : "POST";

      const body = isEditing
        ? {
            fullName: fullName.trim(),
            email: email.trim(),
          }
        : {
            fullName: fullName.trim(),
            email: email.trim(),
            password: password.trim(),
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
        throw new Error(data.message || "Failed to save resident account.");
      }

      Alert.alert(
        "Success",
        isEditing
          ? "Resident account updated successfully!"
          : "Resident account created successfully!",
      );

      closeModal();

      await loadResidents();
    } catch (error: any) {
      console.log("Save resident error:", error);

      Alert.alert("Error", error.message || "Failed to save resident account.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ENABLE / DISABLE
  // ==========================================

  const toggleResidentStatus = (resident: Resident) => {
    const isActive = resident.status === "Active";

    const newStatus = isActive ? "Disabled" : "Active";

    const actionText = isActive ? "disable" : "enable";

    Alert.alert(
      `${isActive ? "Disable" : "Enable"} Resident`,
      `Are you sure you want to ${actionText} ${resident.full_name}'s account?`,
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
                `${API_URL}/users/${resident.id}/status`,
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
                  data.message || "Failed to update resident status.",
                );
              }

              Alert.alert(
                "Success",
                `Resident account ${actionText}d successfully.`,
              );

              await loadResidents();
            } catch (error: any) {
              console.log("Update resident status error:", error);

              Alert.alert(
                "Error",
                error.message || "Failed to update account status.",
              );
            }
          },
        },
      ],
    );
  };

  // ==========================================
  // DELETE RESIDENT
  // ==========================================

  const deleteResident = (resident: Resident) => {
    Alert.alert(
      "Delete Resident",
      `Are you sure you want to permanently delete ${resident.full_name}'s account?`,
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
              const response = await fetch(`${API_URL}/users/${resident.id}`, {
                method: "DELETE",
              });

              const data = await response.json();

              if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to delete resident.");
              }

              Alert.alert("Deleted", "Resident account deleted successfully.");

              await loadResidents();
            } catch (error: any) {
              console.log("Delete resident error:", error);

              Alert.alert(
                "Error",
                error.message || "Failed to delete resident.",
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

  const filteredResidents = residents.filter((resident) => {
    const search = searchText.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return (
      resident.full_name.toLowerCase().includes(search) ||
      resident.email.toLowerCase().includes(search)
    );
  });

  // ==========================================
  // COUNTS
  // ==========================================

  const totalResidents = residents.length;

  const activeResidents = residents.filter(
    (resident) => resident.status === "Active",
  ).length;

  const disabledResidents = residents.filter(
    (resident) => resident.status === "Disabled",
  ).length;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#198754" />

        <Text style={styles.loadingText}>Loading residents...</Text>
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
            <Ionicons name="people" size={27} color="#FFFFFF" />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Resident Management</Text>

            <Text style={styles.headerSubtitle}>Manage resident accounts</Text>
          </View>
        </View>

        {/* ======================================
            INTRO CARD
        ====================================== */}

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="people-outline" size={30} color="#198754" />
          </View>

          <View style={styles.introTextContainer}>
            <Text style={styles.introTitle}>Resident Accounts</Text>

            <Text style={styles.introDescription}>
              Add, edit, enable, disable, and remove resident accounts from the
              system.
            </Text>
          </View>
        </View>

        {/* ======================================
            STATISTICS
        ====================================== */}

        <Text style={styles.sectionTitle}>Resident Overview</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="people-outline" size={22} color="#198754" />
            </View>

            <Text style={styles.statNumber}>{totalResidents}</Text>

            <Text style={styles.statLabel}>Total Residents</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#198754"
              />
            </View>

            <Text style={styles.statNumber}>{activeResidents}</Text>

            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.disabledStatIcon]}>
              <Ionicons name="close-circle-outline" size={22} color="#DC3545" />
            </View>

            <Text style={styles.statNumber}>{disabledResidents}</Text>

            <Text style={styles.statLabel}>Disabled</Text>
          </View>
        </View>

        {/* ======================================
            ADD RESIDENT
        ====================================== */}

        {/* ======================================
            SEARCH
        ====================================== */}

        <Text style={styles.sectionTitle}>Residents</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#64748B" />

          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search resident name or email..."
            placeholderTextColor="#94A3B8"
          />

          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* ======================================
            RESIDENT LIST
        ====================================== */}

        {filteredResidents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={35} color="#198754" />
            </View>

            <Text style={styles.emptyTitle}>
              {searchText ? "No residents found" : "No residents yet"}
            </Text>

            <Text style={styles.emptyText}>
              {searchText
                ? "Try searching with a different name or email."
                : "Create your first resident account to get started."}
            </Text>

            {!searchText && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openAddModal}
              >
                <Text style={styles.emptyButtonText}>Add Resident</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredResidents.map((resident) => (
            <View key={resident.id} style={styles.residentCard}>
              {/* RESIDENT TOP */}

              <View style={styles.residentTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {resident.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.residentMain}>
                  <Text style={styles.residentName} numberOfLines={1}>
                    {resident.full_name}
                  </Text>

                  <Text style={styles.residentEmail} numberOfLines={1}>
                    {resident.email}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    resident.status === "Disabled" && styles.statusDisabled,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      resident.status === "Disabled" &&
                        styles.statusDotDisabled,
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      resident.status === "Disabled" &&
                        styles.statusTextDisabled,
                    ]}
                  >
                    {resident.status}
                  </Text>
                </View>
              </View>

              {/* ROLE */}

              <View style={styles.residentInfoRow}>
                <Ionicons name="person-outline" size={17} color="#64748B" />

                <Text style={styles.residentInfoText}>Resident</Text>
              </View>

              {/* ID */}

              <View style={styles.residentInfoRow}>
                <Ionicons name="id-card-outline" size={17} color="#64748B" />

                <Text style={styles.residentInfoText}>
                  Resident ID: {resident.id}
                </Text>
              </View>

              {/* ACTIONS */}

              <View style={styles.actionRow}>
                {/* EDIT */}

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(resident)}
                >
                  <Ionicons name="create-outline" size={18} color="#198754" />

                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                {/* ENABLE / DISABLE */}

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    resident.status === "Disabled" && styles.enableButton,
                  ]}
                  onPress={() => toggleResidentStatus(resident)}
                >
                  <Ionicons
                    name={
                      resident.status === "Active"
                        ? "ban-outline"
                        : "checkmark-circle-outline"
                    }
                    size={18}
                    color={resident.status === "Active" ? "#B45309" : "#198754"}
                  />

                  <Text
                    style={[
                      styles.statusButtonText,
                      resident.status === "Disabled" && styles.enableButtonText,
                    ]}
                  >
                    {resident.status === "Active" ? "Disable" : "Enable"}
                  </Text>
                </TouchableOpacity>

                {/* DELETE */}

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteResident(resident)}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingResident ? "Edit Resident" : "Add Resident"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {editingResident
                    ? "Update resident account information"
                    : "Create a new resident account"}
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

              {!editingResident && (
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
                      placeholder="Enter password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry
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

                <View style={{ flex: 1 }}>
                  <Text style={styles.roleTitle}>Resident</Text>

                  <Text style={styles.roleDescription}>
                    This account will have Resident access only.
                  </Text>
                </View>
              </View>

              {/* SAVE */}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveResident}
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
                      {editingResident ? "Update Resident" : "Create Resident"}
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
        </View>
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
  // RESIDENT CARD
  // ==========================================

  residentCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  residentTop: {
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

  residentMain: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  residentName: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },

  residentEmail: {
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

  residentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  residentInfoText: {
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
