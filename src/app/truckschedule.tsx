import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  bg: "#F4F6F5",
  card: "#FFFFFF",
  ink: "#102A43",
  muted: "#64748B",
  line: "#E5E9EB",
  green: "#087F5B",
  greenDark: "#0B3D2E",
  greenSoft: "#E3F6EE",
  blueSoft: "#E4ECFF",
  blue: "#3B5BDB",
  amberSoft: "#FFF1D6",
  amber: "#B7791F",
  redSoft: "#FDECEC",
  red: "#C0392B",
};

const API_URL = "http://192.168.1.28:3000";

type Schedule = {
  id: number;
  collection_date: string;
  collection_time: string;
  area: string;
  waste_type: string;
  assigned_personnel_id: number | null;
  status: string;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  assigned_personnel_name?: string | null;
};

function getWasteStyle(wasteType: string) {
  const waste = wasteType.toLowerCase();

  if (waste.includes("biodegradable") || waste.includes("organic")) {
    return {
      icon: "leaf-outline" as keyof typeof Ionicons.glyphMap,
      bg: C.greenSoft,
      fg: C.green,
    };
  }

  if (waste.includes("recyclable")) {
    return {
      icon: "sync-outline" as keyof typeof Ionicons.glyphMap,
      bg: C.blueSoft,
      fg: C.blue,
    };
  }

  return {
    icon: "trash-outline" as keyof typeof Ionicons.glyphMap,
    bg: C.amberSoft,
    fg: C.amber,
  };
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return {
      day: "--",
      date: "--",
      full: "Invalid date",
      month: "",
    };
  }

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return {
    day: dayNames[date.getDay()],
    date: String(date.getDate()).padStart(2, "0"),
    full: date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    month: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
  };
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Completed":
      return {
        backgroundColor: C.greenSoft,
        color: C.green,
        icon: "checkmark-circle" as keyof typeof Ionicons.glyphMap,
      };

    case "In Progress":
      return {
        backgroundColor: C.blueSoft,
        color: C.blue,
        icon: "play-circle" as keyof typeof Ionicons.glyphMap,
      };

    case "Scheduled":
    default:
      return {
        backgroundColor: C.amberSoft,
        color: C.amber,
        icon: "time" as keyof typeof Ionicons.glyphMap,
      };
  }
}

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /*
   * TEMPORARY:
   * This uses Zone 1 because your current resident dashboard
   * is using Zone 1.
   *
   * Later we can connect this to the logged-in resident's
   * actual assigned zone.
   */
  const RESIDENT_ZONE = "Zone 1";

  const loadSchedules = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/schedules`);

      if (!response.ok) {
        const text = await response.text();

        console.error("Schedule API error:", response.status, text);

        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("RESIDENT SCHEDULE RESPONSE:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to load schedules");
      }

      const allSchedules: Schedule[] = data.schedules || [];

      /*
       * Only show schedules for the resident's zone.
       */
      const zoneSchedules = allSchedules.filter(
        (schedule) =>
          schedule.area?.toLowerCase() === RESIDENT_ZONE.toLowerCase(),
      );

      setSchedules(zoneSchedules);
    } catch (err) {
      console.error("Load schedules error:", err);

      setSchedules([]);

      setError(
        "Unable to load the collection schedule. Please check your connection.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSchedules();
  };

  /*
   * Find the next collection.
   *
   * Priority:
   * 1. Scheduled
   * 2. In Progress
   * 3. Completed
   */
  const sortedSchedules = [...schedules].sort(
    (a, b) =>
      new Date(a.collection_date).getTime() -
      new Date(b.collection_date).getTime(),
  );

  const nextSchedule =
    sortedSchedules.find((schedule) => schedule.status === "Scheduled") ||
    sortedSchedules.find((schedule) => schedule.status === "In Progress") ||
    sortedSchedules[0];

  const currentMonth =
    nextSchedule && nextSchedule.collection_date
      ? formatDate(nextSchedule.collection_date).month
      : new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Truck Schedule</Text>

            <Text style={styles.subtitle}>
              Your residential collection schedule
            </Text>
          </View>
        </View>

        {/* CURRENT ZONE */}
        <View style={styles.zoneCard}>
          <View style={styles.zoneIcon}>
            <Ionicons name="location-outline" size={24} color={C.green} />
          </View>

          <View style={styles.zoneInfo}>
            <Text style={styles.zoneLabel}>YOUR COLLECTION AREA</Text>

            <Text style={styles.zoneTitle}>{RESIDENT_ZONE}</Text>

            <Text style={styles.zoneSubtitle}>
              Residential collection route
            </Text>
          </View>

          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />

            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        {/* LOADING */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.green} />

            <Text style={styles.loadingText}>
              Loading collection schedule...
            </Text>
          </View>
        )}

        {/* ERROR */}
        {!loading && error !== "" && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={25} color={C.red} />

            <View style={styles.errorInfo}>
              <Text style={styles.errorTitle}>Schedule unavailable</Text>

              <Text style={styles.errorText}>{error}</Text>
            </View>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadSchedules}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && error === "" && (
          <>
            {/* NEXT COLLECTION */}
            <Text style={styles.sectionTitle}>Next collection</Text>

            {nextSchedule ? (
              <View style={styles.nextCard}>
                <View style={styles.truckCircle}>
                  <Ionicons name="car-outline" size={30} color="#FFFFFF" />
                </View>

                <View style={styles.nextInfo}>
                  <Text style={styles.nextLabel}>NEXT TRUCK</Text>

                  <Text style={styles.nextWaste}>
                    {nextSchedule.waste_type}
                  </Text>

                  <View style={styles.nextRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#BFEBD9"
                    />

                    <Text style={styles.nextText}>
                      {formatDate(nextSchedule.collection_date).full} ·{" "}
                      {nextSchedule.collection_time}
                    </Text>
                  </View>

                  <View style={styles.nextRow}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#BFEBD9"
                    />

                    <Text style={styles.nextText}>
                      {nextSchedule.area} Residential Route
                    </Text>
                  </View>

                  {/* STATUS */}
                  <View style={styles.nextStatus}>
                    <Ionicons
                      name={getStatusStyle(nextSchedule.status).icon}
                      size={15}
                      color={getStatusStyle(nextSchedule.status).color}
                    />

                    <Text
                      style={[
                        styles.nextStatusText,
                        {
                          color: getStatusStyle(nextSchedule.status).color,
                        },
                      ]}
                    >
                      {nextSchedule.status}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={36} color={C.muted} />

                <Text style={styles.emptyTitle}>No collection schedule</Text>

                <Text style={styles.emptyText}>
                  There is currently no collection schedule assigned to{" "}
                  {RESIDENT_ZONE}.
                </Text>
              </View>
            )}

            {/* WASTE TYPES */}
            <Text style={styles.sectionTitle}>Collection types</Text>

            <View style={styles.typesCard}>
              <View style={styles.typeRow}>
                <View
                  style={[
                    styles.typeIcon,
                    {
                      backgroundColor: C.greenSoft,
                    },
                  ]}
                >
                  <Ionicons name="leaf-outline" size={22} color={C.green} />
                </View>

                <View style={styles.typeInfo}>
                  <Text style={styles.typeTitle}>Biodegradable</Text>

                  <Text style={styles.typeDescription}>
                    Food scraps, leaves and other organic waste
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.typeRow}>
                <View
                  style={[
                    styles.typeIcon,
                    {
                      backgroundColor: C.blueSoft,
                    },
                  ]}
                >
                  <Ionicons name="sync-outline" size={22} color={C.blue} />
                </View>

                <View style={styles.typeInfo}>
                  <Text style={styles.typeTitle}>Recyclable</Text>

                  <Text style={styles.typeDescription}>
                    Paper, plastic, glass and metal materials
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.typeRow}>
                <View
                  style={[
                    styles.typeIcon,
                    {
                      backgroundColor: C.amberSoft,
                    },
                  ]}
                >
                  <Ionicons name="trash-outline" size={22} color={C.amber} />
                </View>

                <View style={styles.typeInfo}>
                  <Text style={styles.typeTitle}>General Waste</Text>

                  <Text style={styles.typeDescription}>
                    Non-recyclable household waste
                  </Text>
                </View>
              </View>
            </View>

            {/* WEEKLY SCHEDULE */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Collection schedule</Text>

              <Text style={styles.monthText}>{currentMonth}</Text>
            </View>

            {schedules.length === 0 ? (
              <View style={styles.emptyScheduleCard}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={35}
                  color={C.muted}
                />

                <Text style={styles.emptyTitle}>No schedules found</Text>

                <Text style={styles.emptyText}>
                  No collection schedules have been assigned to {RESIDENT_ZONE}{" "}
                  yet.
                </Text>
              </View>
            ) : (
              schedules.map((item) => {
                const dateInfo = formatDate(item.collection_date);

                const wasteStyle = getWasteStyle(item.waste_type);

                const statusStyle = getStatusStyle(item.status);

                return (
                  <View key={item.id} style={styles.scheduleCard}>
                    {/* DATE */}
                    <View style={styles.dateContainer}>
                      <Text style={styles.dayText}>{dateInfo.day}</Text>

                      <Text style={styles.dateText}>{dateInfo.date}</Text>
                    </View>

                    {/* ICON */}
                    <View
                      style={[
                        styles.scheduleIcon,
                        {
                          backgroundColor: wasteStyle.bg,
                        },
                      ]}
                    >
                      <Ionicons
                        name={wasteStyle.icon}
                        size={23}
                        color={wasteStyle.fg}
                      />
                    </View>

                    {/* INFO */}
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleWaste}>
                        {item.waste_type}
                      </Text>

                      <View style={styles.scheduleDetail}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={C.muted}
                        />

                        <Text style={styles.scheduleText}>
                          {item.collection_time}
                        </Text>
                      </View>

                      <View style={styles.scheduleDetail}>
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color={C.muted}
                        />

                        <Text style={styles.scheduleText}>{item.area}</Text>
                      </View>

                      {/* STATUS BADGE */}
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: statusStyle.backgroundColor,
                          },
                        ]}
                      >
                        <Ionicons
                          name={statusStyle.icon}
                          size={13}
                          color={statusStyle.color}
                        />

                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color: statusStyle.color,
                            },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* REMINDER */}
            <View style={styles.reminderCard}>
              <View style={styles.reminderIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={C.green}
                />
              </View>

              <View style={styles.reminderInfo}>
                <Text style={styles.reminderTitle}>Collection reminder</Text>

                <Text style={styles.reminderText}>
                  Please place your waste outside before your scheduled
                  collection time.
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  content: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: C.ink,
  },

  subtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
  },

  /* ZONE */

  zoneCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  zoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  zoneInfo: {
    flex: 1,
    marginLeft: 12,
  },

  zoneLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: C.muted,
    letterSpacing: 0.5,
  },

  zoneTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
    marginTop: 1,
  },

  zoneSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.greenSoft,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
    marginRight: 5,
  },

  activeText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.green,
  },

  /* LOADING */

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 45,
  },

  loadingText: {
    color: C.muted,
    fontSize: 13,
    marginTop: 10,
  },

  /* ERROR */

  errorCard: {
    marginTop: 20,
    backgroundColor: C.redSoft,
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  errorInfo: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.red,
  },

  errorText: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
    lineHeight: 16,
  },

  retryButton: {
    backgroundColor: C.red,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    marginLeft: 8,
  },

  retryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /* SECTION */

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
    marginTop: 24,
    marginBottom: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
  },

  monthText: {
    fontSize: 12,
    color: C.muted,
  },

  /* NEXT */

  nextCard: {
    backgroundColor: C.greenDark,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  truckCircle: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  nextInfo: {
    flex: 1,
    marginLeft: 15,
  },

  nextLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9FD8C0",
    letterSpacing: 0.6,
  },

  nextWaste: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },

  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  nextText: {
    flex: 1,
    fontSize: 11,
    color: "#CDEFE0",
    marginLeft: 6,
  },

  nextStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  nextStatusText: {
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 5,
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 30,
    alignItems: "center",
  },

  emptyScheduleCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 30,
    alignItems: "center",
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.ink,
    marginTop: 10,
  },

  emptyText: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 5,
  },

  /* TYPES */

  typesCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 15,
  },

  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },

  typeIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  typeInfo: {
    flex: 1,
    marginLeft: 12,
  },

  typeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.ink,
  },

  typeDescription: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 16,
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: C.line,
  },

  /* SCHEDULE */

  scheduleCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  dateContainer: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  dayText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.muted,
  },

  dateText: {
    fontSize: 23,
    fontWeight: "800",
    color: C.ink,
    marginTop: 1,
  },

  scheduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  scheduleInfo: {
    flex: 1,
    marginLeft: 12,
  },

  scheduleWaste: {
    fontSize: 14,
    fontWeight: "800",
    color: C.ink,
    marginBottom: 4,
  },

  scheduleDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  scheduleText: {
    flex: 1,
    fontSize: 11,
    color: C.muted,
    marginLeft: 5,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 7,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },

  /* REMINDER */

  reminderCard: {
    flexDirection: "row",
    backgroundColor: C.greenSoft,
    borderRadius: 18,
    padding: 15,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#CDEFE0",
  },

  reminderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },

  reminderInfo: {
    flex: 1,
    marginLeft: 11,
  },

  reminderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.ink,
  },

  reminderText: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 17,
    marginTop: 3,
  },

  /* REPORT */

  reportButton: {
    height: 50,
    backgroundColor: C.green,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 7,
  },

  bottomSpace: {
    height: 20,
  },
});
