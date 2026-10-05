import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type Schedule = {
  id: number;
  collection_date: string;
  collection_time: string;
  area: string;
  waste_type: string;
  assigned_personnel_id: number | null;
  assigned_personnel_name: string | null;
  status: string;
  notes: string | null;
};

type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status?: string;
};

export default function AdminScreen() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const [saving, setSaving] = useState(false);

  // FORM
  const [collectionDate, setCollectionDate] = useState(new Date());
  const [collectionTime, setCollectionTime] = useState("7:00 AM - 10:00 AM");

  const [area, setArea] = useState("Zone 1");
  const [wasteType, setWasteType] = useState("General Waste");

  const [assignedPersonnelId, setAssignedPersonnelId] = useState<number | null>(
    null,
  );

  const [status, setStatus] = useState("Scheduled");
  const [notes, setNotes] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);

  const areas = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5"];

  const wasteTypes = [
    "General Waste",
    "Recyclable Waste",
    "Non-Biodegradable Waste",
  ];

  const statuses = ["Scheduled", "In Progress", "Completed", "Cancelled"];

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      await Promise.all([loadSchedules(), loadPersonnel()]);
    } catch (error) {
      console.log("Load admin data error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GET SCHEDULES
  // ==========================================

  const loadSchedules = async () => {
    try {
      const response = await fetch(`${API_URL}/schedules`);

      const data = await response.json();

      if (data.success) {
        setSchedules(data.schedules || []);
      } else {
        Alert.alert("Error", data.message || "Failed to load schedules.");
      }
    } catch (error) {
      console.log("Load schedules error:", error);

      Alert.alert("Connection Error", "Unable to connect to the backend.");
    }
  };

  // ==========================================
  // GET PERSONNEL
  // ==========================================

  const loadPersonnel = async () => {
    try {
      const response = await fetch(`${API_URL}/personnel`);

      if (!response.ok) {
        const text = await response.text();
        console.error("Personnel API error:", response.status, text);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("PERSONNEL API RESPONSE:", data);

      if (data.success) {
        setPersonnel(data.personnel || []);
      } else {
        setPersonnel([]);
      }
    } catch (error) {
      console.error("Load personnel error:", error);
      setPersonnel([]);
    }
  };

  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadData();

    setRefreshing(false);
  };

  // ==========================================
  // RESIDENT MANAGEMENT NAVIGATION
  // ==========================================

  const openResidentManagement = () => {
    router.push("/resident-management");
  };

  // ==========================================
  // PERSONNEL MANAGEMENT NAVIGATION
  // ==========================================

  const openPersonnelManagement = () => {
    router.push("/personnel-management");
  };

  // ==========================================
  // OPEN CREATE MODAL
  // ==========================================

  const openCreateModal = () => {
    setEditingSchedule(null);

    setCollectionDate(new Date());
    setCollectionTime("7:00 AM - 10:00 AM");
    setArea("Zone 1");
    setWasteType("General Waste");
    setAssignedPersonnelId(null);
    setStatus("Scheduled");
    setNotes("");

    setShowModal(true);
  };

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);

    const parsedDate = new Date(`${schedule.collection_date}T00:00:00`);

    setCollectionDate(isNaN(parsedDate.getTime()) ? new Date() : parsedDate);

    setCollectionTime(schedule.collection_time);
    setArea(schedule.area);
    setWasteType(schedule.waste_type);

    setAssignedPersonnelId(schedule.assigned_personnel_id);

    setStatus(schedule.status);
    setNotes(schedule.notes || "");

    setShowModal(true);
  };

  // ==========================================
  // DATE
  // ==========================================

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (selectedDate) {
      setCollectionDate(selectedDate);
    }
  };

  const formattedDate = collectionDate.toISOString().split("T")[0];

  const displayDate = collectionDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // ==========================================
  // CREATE / UPDATE
  // ==========================================

  const saveSchedule = async () => {
    if (!collectionTime.trim()) {
      Alert.alert("Missing Information", "Please enter the collection time.");
      return;
    }

    if (!area) {
      Alert.alert("Missing Information", "Please select an area.");
      return;
    }

    if (!wasteType) {
      Alert.alert("Missing Information", "Please select a waste type.");
      return;
    }

    try {
      setSaving(true);

      let adminId: number | null = null;

      const storedUser = await AsyncStorage.getItem("loggedInUser");

      if (storedUser) {
        const user = JSON.parse(storedUser);

        adminId = Number(user.id);
      }

      const body = {
        collectionDate: formattedDate,
        collectionTime: collectionTime.trim(),
        area,
        wasteType,
        assignedPersonnelId,
        status,
        notes: notes.trim(),
        createdBy: adminId,
      };

      const url = editingSchedule
        ? `${API_URL}/schedules/${editingSchedule.id}`
        : `${API_URL}/schedules`;

      const method = editingSchedule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save schedule.");
      }

      Alert.alert(
        "Success",
        editingSchedule
          ? "Schedule updated successfully!"
          : "Schedule created successfully!",
      );

      setShowModal(false);

      await loadSchedules();
    } catch (error: any) {
      console.log("Save schedule error:", error);

      Alert.alert("Error", error.message || "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE
  // ==========================================

  const deleteSchedule = (schedule: Schedule) => {
    Alert.alert(
      "Delete Schedule",
      `Are you sure you want to delete the schedule for ${schedule.area}?`,
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
                `${API_URL}/schedules/${schedule.id}`,
                {
                  method: "DELETE",
                },
              );

              const data = await response.json();

              if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to delete schedule.");
              }

              Alert.alert("Deleted", "Schedule deleted successfully.");

              await loadSchedules();
            } catch (error: any) {
              console.log("Delete error:", error);

              Alert.alert(
                "Error",
                error.message || "Failed to delete schedule.",
              );
            }
          },
        },
      ],
    );
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("loggedInUser");

          router.replace("/login");
        },
      },
    ]);
  };

  // ==========================================
  // COUNTS
  // ==========================================

  const totalSchedules = schedules.length;

  const scheduledCount = schedules.filter(
    (item) => item.status === "Scheduled",
  ).length;

  const inProgressCount = schedules.filter(
    (item) => item.status === "In Progress",
  ).length;

  const completedCount = schedules.filter(
    (item) => item.status === "Completed",
  ).length;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#198754" />

        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
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
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>

            <Text style={styles.headerSubtitle}>
              Garbage Collection Management
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* WELCOME */}

        <View style={styles.welcomeCard}>
          <View>
            <Text style={styles.welcomeSmall}>Welcome, Administrator</Text>

            <Text style={styles.welcomeTitle}>
              Manage Collection Operations
            </Text>

            <Text style={styles.welcomeDescription}>
              Create and manage garbage collection schedules, areas, and
              assigned personnel.
            </Text>
          </View>
        </View>

        {/* ==========================================
            RESIDENT MANAGEMENT
        ========================================== */}

        <TouchableOpacity
          style={styles.managementButton}
          activeOpacity={0.8}
          onPress={openResidentManagement}
        >
          <View style={styles.managementIcon}>
            <Ionicons name="people" size={27} color="#198754" />
          </View>

          <View style={styles.managementTextContainer}>
            <Text style={styles.managementTitle}>Resident Management</Text>

            <Text style={styles.managementSubtitle}>
              Manage resident accounts
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={24} color="#64748B" />
        </TouchableOpacity>

        {/* ==========================================
            PERSONNEL MANAGEMENT
        ========================================== */}

        <TouchableOpacity
          style={styles.managementButton}
          activeOpacity={0.8}
          onPress={openPersonnelManagement}
        >
          <View style={styles.managementIcon}>
            <Ionicons name="people-circle" size={27} color="#198754" />
          </View>

          <View style={styles.managementTextContainer}>
            <Text style={styles.managementTitle}>Personnel Management</Text>

            <Text style={styles.managementSubtitle}>
              Manage garbage collection personnel
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={24} color="#64748B" />
        </TouchableOpacity>

        {/* STATISTICS */}

        <Text style={styles.sectionTitle}>Collection Overview</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="calendar-outline" size={23} color="#198754" />
            </View>

            <Text style={styles.statNumber}>{totalSchedules}</Text>

            <Text style={styles.statLabel}>Total Schedules</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="time-outline" size={23} color="#198754" />
            </View>

            <Text style={styles.statNumber}>{scheduledCount}</Text>

            <Text style={styles.statLabel}>Scheduled</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="bicycle-outline" size={23} color="#198754" />
            </View>

            <Text style={styles.statNumber}>{inProgressCount}</Text>

            <Text style={styles.statLabel}>In Progress</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={23}
                color="#198754"
              />
            </View>

            <Text style={styles.statNumber}>{completedCount}</Text>

            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* ADD SCHEDULE */}

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={openCreateModal}
        >
          <Ionicons name="add-circle-outline" size={23} color="#FFFFFF" />

          <Text style={styles.addButtonText}>Create Collection Schedule</Text>
        </TouchableOpacity>

        {/* SCHEDULE LIST */}

        <View style={styles.scheduleHeader}>
          <View>
            <Text style={styles.sectionTitle}>Collection Schedules</Text>

            <Text style={styles.sectionSubtitle}>
              Manage upcoming garbage collection activities
            </Text>
          </View>

          <TouchableOpacity onPress={loadSchedules}>
            <Ionicons name="refresh" size={22} color="#198754" />
          </TouchableOpacity>
        </View>

        {schedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={34} color="#198754" />
            </View>

            <Text style={styles.emptyTitle}>No schedules yet</Text>

            <Text style={styles.emptyText}>
              Create your first collection schedule to get started.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openCreateModal}
            >
              <Text style={styles.emptyButtonText}>Create Schedule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          schedules.map((schedule) => (
            <View key={schedule.id} style={styles.scheduleCard}>
              {/* CARD TOP */}

              <View style={styles.scheduleTop}>
                <View style={styles.areaIcon}>
                  <Ionicons name="location-outline" size={22} color="#198754" />
                </View>

                <View style={styles.scheduleMain}>
                  <Text style={styles.areaName}>{schedule.area}</Text>

                  <Text style={styles.wasteType}>{schedule.waste_type}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    schedule.status === "Completed" && styles.statusCompleted,
                    schedule.status === "In Progress" && styles.statusProgress,
                    schedule.status === "Cancelled" && styles.statusCancelled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      schedule.status === "Completed" &&
                        styles.statusTextCompleted,
                      schedule.status === "In Progress" &&
                        styles.statusTextProgress,
                      schedule.status === "Cancelled" &&
                        styles.statusTextCancelled,
                    ]}
                  >
                    {schedule.status}
                  </Text>
                </View>
              </View>

              {/* DATE */}

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color="#64748B" />

                <Text style={styles.infoText}>{schedule.collection_date}</Text>
              </View>

              {/* TIME */}

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={18} color="#64748B" />

                <Text style={styles.infoText}>{schedule.collection_time}</Text>
              </View>

              {/* PERSONNEL */}

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color="#64748B" />

                <Text style={styles.infoText}>
                  {schedule.assigned_personnel_name || "No personnel assigned"}
                </Text>
              </View>

              {/* NOTES */}

              {schedule.notes ? (
                <View style={styles.notesBox}>
                  <Ionicons
                    name="document-text-outline"
                    size={17}
                    color="#64748B"
                  />

                  <Text style={styles.notesText}>{schedule.notes}</Text>
                </View>
              ) : null}

              {/* ACTIONS */}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(schedule)}
                >
                  <Ionicons name="create-outline" size={18} color="#198754" />

                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteSchedule(schedule)}
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
          CREATE / EDIT MODAL
      ========================================== */}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingSchedule ? "Edit Schedule" : "Create Schedule"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Enter collection schedule details
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={25} color="#334155" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              {/* DATE */}

              <Text style={styles.inputLabel}>Collection Date</Text>

              <TouchableOpacity
                style={styles.inputBox}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#198754" />

                <Text style={styles.inputText}>{displayDate}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={collectionDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                />
              )}

              {/* TIME */}

              <Text style={styles.inputLabel}>Collection Time</Text>

              <TextInput
                style={styles.textInput}
                value={collectionTime}
                onChangeText={setCollectionTime}
                placeholder="Example: 7:00 AM - 10:00 AM"
                placeholderTextColor="#94A3B8"
              />

              {/* AREA */}

              <Text style={styles.inputLabel}>Collection Area</Text>

              <View style={styles.optionWrap}>
                {areas.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.optionButton,
                      area === item && styles.optionButtonSelected,
                    ]}
                    onPress={() => setArea(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        area === item && styles.optionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* WASTE TYPE */}

              <Text style={styles.inputLabel}>Waste Type</Text>

              <View style={styles.optionWrap}>
                {wasteTypes.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.optionButton,
                      wasteType === item && styles.optionButtonSelected,
                    ]}
                    onPress={() => setWasteType(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        wasteType === item && styles.optionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* PERSONNEL */}

              <Text style={styles.inputLabel}>Assign Personnel</Text>

              {personnel.length === 0 ? (
                <View style={styles.noPersonnelBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#64748B"
                  />

                  <Text style={styles.noPersonnelText}>
                    No personnel accounts found yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.optionWrap}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      assignedPersonnelId === null &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => setAssignedPersonnelId(null)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        assignedPersonnelId === null &&
                          styles.optionTextSelected,
                      ]}
                    >
                      Unassigned
                    </Text>
                  </TouchableOpacity>

                  {personnel.map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      style={[
                        styles.personButton,
                        assignedPersonnelId === person.id &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => setAssignedPersonnelId(person.id)}
                    >
                      <Ionicons
                        name="person-outline"
                        size={17}
                        color={
                          assignedPersonnelId === person.id
                            ? "#FFFFFF"
                            : "#198754"
                        }
                      />

                      <Text
                        style={[
                          styles.optionText,
                          assignedPersonnelId === person.id &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {person.full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* STATUS */}

              <Text style={styles.inputLabel}>Status</Text>

              <View style={styles.optionWrap}>
                {statuses.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.optionButton,
                      status === item && styles.optionButtonSelected,
                    ]}
                    onPress={() => setStatus(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        status === item && styles.optionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* NOTES */}

              <Text style={styles.inputLabel}>Notes</Text>

              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes..."
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
              />

              {/* SAVE */}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveSchedule}
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
                      {editingSchedule ? "Update Schedule" : "Create Schedule"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
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

  // HEADER

  header: {
    backgroundColor: "#198754",
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#DDF5E7",
    fontSize: 12,
    marginTop: 3,
  },

  logoutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // WELCOME

  welcomeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  welcomeSmall: {
    color: "#64748B",
    fontSize: 13,
  },

  welcomeTitle: {
    color: "#0F172A",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 5,
  },

  welcomeDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  // ==========================================
  // MANAGEMENT
  // ==========================================

  managementButton: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  managementIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
  },

  managementTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  managementTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },

  managementSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  // SECTIONS

  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 22,
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },

  sectionSubtitle: {
    marginHorizontal: 16,
    marginTop: 3,
    color: "#64748B",
    fontSize: 12,
  },

  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 18,
  },

  // STATS

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    marginTop: 10,
  },

  statCard: {
    width: "50%",
    padding: 7,
  },

  statCardInner: {
    backgroundColor: "#FFFFFF",
  },

  statIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },

  statLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },

  // ADD

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

  // SCHEDULE CARD

  scheduleCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  scheduleTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  areaIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
  },

  scheduleMain: {
    flex: 1,
    marginLeft: 11,
  },

  areaName: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },

  wasteType: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#EAF7EF",
  },

  statusText: {
    color: "#198754",
    fontSize: 10,
    fontWeight: "800",
  },

  statusCompleted: {
    backgroundColor: "#DCFCE7",
  },

  statusProgress: {
    backgroundColor: "#FEF3C7",
  },

  statusCancelled: {
    backgroundColor: "#FEE2E2",
  },

  statusTextCompleted: {
    color: "#15803D",
  },

  statusTextProgress: {
    color: "#B45309",
  },

  statusTextCancelled: {
    color: "#DC2626",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  infoText: {
    color: "#475569",
    fontSize: 13,
    marginLeft: 9,
    flex: 1,
  },

  notesBox: {
    marginTop: 12,
    padding: 11,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
  },

  notesText: {
    flex: 1,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
  },

  actionRow: {
    flexDirection: "row",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 13,
  },

  editButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#EAF7EF",
    marginRight: 6,
  },

  editText: {
    color: "#198754",
    fontWeight: "700",
    marginLeft: 5,
  },

  deleteButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    marginLeft: 6,
  },

  deleteText: {
    color: "#DC3545",
    fontWeight: "700",
    marginLeft: 5,
  },

  // EMPTY

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

  // MODAL

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "92%",
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

  inputLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 13,
  },

  inputBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  inputText: {
    color: "#334155",
    fontSize: 14,
    marginLeft: 9,
  },

  textInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 11,
    minHeight: 48,
    paddingHorizontal: 13,
    color: "#334155",
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },

  notesInput: {
    height: 90,
    paddingTop: 13,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  optionButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },

  personButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  optionButtonSelected: {
    backgroundColor: "#198754",
    borderColor: "#198754",
  },

  optionText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },

  optionTextSelected: {
    color: "#FFFFFF",
  },

  noPersonnelBox: {
    padding: 13,
    borderRadius: 11,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
  },

  noPersonnelText: {
    color: "#64748B",
    fontSize: 12,
    marginLeft: 8,
  },

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
