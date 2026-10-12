import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "http://192.168.1.227:3000";

type Report = {
  id: number;
  user_id: number;
  resident_name: string | null;
  resident_email: string | null;
  issue: string;
  description: string;
  photo: string | null;
  place_name: string | null;
  place_address: string | null;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
  collection_date: string | null;
  collection_time: string | null;
  waste_type: string | null;
  status: string;
  created_at: string;
};

type Filter = "All" | "Reported" | "In Progress" | "Completed";

type ApiResponse = {
  success?: boolean;
  message?: string;
  reports?: Report[];
};

const GREEN = "#087F5B";

async function readApiResponse(response: Response): Promise<ApiResponse> {
  const responseText = await response.text();

  let data: ApiResponse;

  try {
    data = JSON.parse(responseText) as ApiResponse;
  } catch {
    console.error(
      "Non-JSON API response:",
      response.status,
      responseText.slice(0, 500),
    );

    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}). Check the backend URL and API route.`,
    );
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed with HTTP ${response.status}.`,
    );
  }

  return data;
}

function formatDate(value: string | null) {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusColor(status: string) {
  switch (status.trim().toLowerCase()) {
    case "completed":
    case "resolved":
      return { backgroundColor: "#E4F6EC", color: "#087F5B" };
    case "in progress":
      return { backgroundColor: "#FFF2D8", color: "#996400" };
    case "cancelled":
    case "rejected":
      return { backgroundColor: "#FDECEC", color: "#C83D45" };
    default:
      return { backgroundColor: "#EAF2FF", color: "#245DA8" };
  }
}

export default function ResidentReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/reports`, {
        headers: { Accept: "application/json" },
      });

      const data = await readApiResponse(response);

      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (error) {
      console.error("Load resident reports error:", error);

      Alert.alert(
        "Unable to load reports",
        error instanceof Error
          ? error.message
          : "Check your backend connection and try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    if (filter === "All") return reports;

    return reports.filter(
      (report) =>
        report.status?.trim().toLowerCase() === filter.toLowerCase(),
    );
  }, [reports, filter]);

  const counts = useMemo(
    () => ({
      all: reports.length,
      reported: reports.filter(
        (report) => report.status?.trim().toLowerCase() === "reported",
      ).length,
      progress: reports.filter(
        (report) => report.status?.trim().toLowerCase() === "in progress",
      ).length,
      completed: reports.filter((report) =>
        ["completed", "resolved"].includes(
          report.status?.trim().toLowerCase(),
        ),
      ).length,
    }),
    [reports],
  );

  const updateStatus = (report: Report, nextStatus: string) => {
    if (updatingId !== null) return;

    const action =
      nextStatus === "In Progress"
        ? "start working on"
        : "mark as completed";

    Alert.alert(
      "Update report",
      `Are you sure you want to ${action} report #${report.id}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setUpdatingId(report.id);

            try {
              const response = await fetch(
                `${API_URL}/reports/${report.id}/status`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                  },
                  body: JSON.stringify({ status: nextStatus }),
                },
              );

              const data = await readApiResponse(response);

              setReports((current) =>
                current.map((item) =>
                  item.id === report.id
                    ? { ...item, status: nextStatus }
                    : item,
                ),
              );

              Alert.alert(
                "Success",
                data.message ||
                  `Report #${report.id} is now ${nextStatus}.`,
              );
            } catch (error) {
              console.error("Update report status error:", error);

              Alert.alert(
                "Update failed",
                error instanceof Error
                  ? error.message
                  : "Please check your connection and try again.",
              );
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  const refreshReports = () => {
    setRefreshing(true);
    void loadReports();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading resident reports...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#198754" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshReports}
            tintColor={GREEN}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerIcon}>
            <Ionicons name="document-text" size={27} color="#FFFFFF" />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>Resident Reports</Text>

            <Text style={styles.subtitle}>Review submitted issues</Text>
          </View>
        </View>

        <View style={styles.body}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="document-text-outline" size={25} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryNumber}>{counts.all}</Text>
            <Text style={styles.summaryLabel}>Total resident reports</Text>
          </View>
          <Ionicons name="people-outline" size={25} color="#A4B9AE" />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#245DA8" }]}>
              {counts.reported}
            </Text>
            <Text style={styles.statLabel}>Reported</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#996400" }]}>
              {counts.progress}
            </Text>
            <Text style={styles.statLabel}>In progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: GREEN }]}>
              {counts.completed}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Submitted issues</Text>
        <Text style={styles.sectionSubtitle}>
          Review each report and update its status.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(["All", "Reported", "In Progress", "Completed"] as Filter[]).map(
            (item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setFilter(item)}
                style={[
                  styles.filterButton,
                  filter === item && styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === item && styles.filterTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        {filteredReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={40} color="#8AA196" />
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptyText}>
              Reports submitted by residents will appear here.
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => {
            const badge = getStatusColor(report.status || "Reported");
            const normalized = (report.status || "Reported")
              .trim()
              .toLowerCase();

            return (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportTop}>
                  <View style={styles.issueIcon}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={23}
                      color={GREEN}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.issueTitle}>
                      {report.issue || "Collection issue"}
                    </Text>
                    <Text style={styles.reportNumber}>
                      Report #{report.id}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: badge.backgroundColor },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: badge.color }]}>
                      {report.status || "Reported"}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.fieldLabel}>Resident</Text>
                <Text style={styles.fieldValue}>
                  {report.resident_name || `Resident #${report.user_id}`}
                </Text>
                {!!report.resident_email && (
                  <Text style={styles.secondaryText}>
                    {report.resident_email}
                  </Text>
                )}

                <Text style={styles.fieldLabel}>Description</Text>
                <Text style={styles.description}>
                  {report.description || "No description provided."}
                </Text>

                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={17} color={GREEN} />
                  <Text style={styles.detailText}>
                    {report.place_name ||
                      report.area ||
                      "Location not provided"}
                  </Text>
                </View>

                {!!report.place_address && (
                  <Text style={styles.addressText}>
                    {report.place_address}
                  </Text>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={17} color={GREEN} />
                  <Text style={styles.detailText}>
                    Reported: {formatDate(report.created_at)}
                  </Text>
                </View>

                {!!report.collection_date && (
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={17} color={GREEN} />
                    <Text style={styles.detailText}>
                      Collection: {formatDate(report.collection_date)}
                      {report.collection_time
                        ? ` · ${report.collection_time}`
                        : ""}
                    </Text>
                  </View>
                )}

                {!!report.waste_type && (
                  <View style={styles.detailRow}>
                    <Ionicons name="trash-outline" size={17} color={GREEN} />
                    <Text style={styles.detailText}>{report.waste_type}</Text>
                  </View>
                )}

                {!!report.photo &&
                  (report.photo.startsWith("data:image/") ||
                    report.photo.startsWith("https://") ||
                    report.photo.startsWith("http://")) && (
                    <Image
                      source={{ uri: report.photo }}
                      style={styles.reportImage}
                      resizeMode="cover"
                    />
                  )}

                {normalized !== "completed" &&
                  normalized !== "resolved" &&
                  normalized !== "cancelled" &&
                  normalized !== "rejected" && (
                    <View style={styles.actions}>
                      {normalized === "reported" && (
                        <TouchableOpacity
                          style={styles.progressButton}
                          disabled={updatingId !== null}
                          onPress={() => updateStatus(report, "In Progress")}
                        >
                          {updatingId === report.id ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons
                                name="play-outline"
                                size={17}
                                color="#FFFFFF"
                              />
                              <Text style={styles.actionText}>
                                Start handling
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {normalized === "in progress" && (
                        <TouchableOpacity
                          style={styles.completeButton}
                          disabled={updatingId !== null}
                          onPress={() => updateStatus(report, "Completed")}
                        >
                          {updatingId === report.id ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={18}
                                color="#FFFFFF"
                              />
                              <Text style={styles.actionText}>
                                Mark completed
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
              </View>
            );
          })
        )}

        <Text style={styles.footer}>
          Pull down to refresh the latest resident reports.
        </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7F5" },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#F4F7F5",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, color: "#66766F", fontSize: 13 },
  content: { paddingBottom: 35 },
  body: { paddingHorizontal: 16, paddingTop: 16 },
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
  headerText: { flex: 1, marginLeft: 12 },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#DDF5E7", fontSize: 12, marginTop: 3 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#DFE8E3",
    padding: 17,
    gap: 13,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E7F5EF",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryNumber: { color: "#172B24", fontSize: 25, fontWeight: "800" },
  summaryLabel: { color: "#66766F", fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 9, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DFE8E3",
    padding: 12,
  },
  statNumber: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, color: "#66766F", marginTop: 4 },
  sectionTitle: {
    color: "#172B24",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 26,
  },
  sectionSubtitle: {
    color: "#66766F",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  filters: { gap: 8, paddingVertical: 15 },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE8E3",
  },
  filterButtonActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { color: "#42534B", fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: "#FFFFFF" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#DFE8E3",
    padding: 28,
    marginTop: 4,
  },
  emptyTitle: {
    color: "#172B24",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  emptyText: {
    color: "#66766F",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 6,
  },
  reportCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE8E3",
    borderRadius: 17,
    padding: 15,
    marginBottom: 13,
  },
  reportTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  issueIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#E7F5EF",
    alignItems: "center",
    justifyContent: "center",
  },
  issueTitle: { color: "#172B24", fontSize: 14, fontWeight: "800" },
  reportNumber: { color: "#66766F", fontSize: 11, marginTop: 4 },
  statusBadge: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { fontSize: 10, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#DFE8E3", marginVertical: 14 },
  fieldLabel: {
    color: "#66766F",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 11,
    marginBottom: 4,
  },
  fieldValue: { color: "#172B24", fontSize: 13, fontWeight: "700" },
  secondaryText: { color: "#66766F", fontSize: 11, marginTop: 3 },
  description: { color: "#42534B", fontSize: 12, lineHeight: 19 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  detailText: { flex: 1, color: "#42534B", fontSize: 12, lineHeight: 18 },
  addressText: {
    color: "#66766F",
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 25,
    marginTop: 3,
  },
  reportImage: {
    width: "100%",
    height: 190,
    borderRadius: 12,
    marginTop: 14,
    backgroundColor: "#EEF2F0",
  },
  actions: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#DFE8E3",
    paddingTop: 13,
  },
  progressButton: {
    minHeight: 43,
    borderRadius: 11,
    backgroundColor: "#245DA8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  completeButton: {
    minHeight: 43,
    borderRadius: 11,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  actionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  footer: {
    textAlign: "center",
    color: "#66766F",
    fontSize: 11,
    marginTop: 12,
  },
});
