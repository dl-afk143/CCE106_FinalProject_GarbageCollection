import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { getMyReports } from "../services/api";

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
  red: "#D64545",
};

type Report = {
  id: number;
  user_id: number;
  issue: string;
  description: string;
  photo: string | null;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
  collection_date: string | null;
  collection_time: string | null;
  waste_type: string | null;
  status: string;
  created_at: string;
};

export default function MyReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem("loggedInUser");

      if (!storedUser) {
        router.replace("/login");
        return;
      }

      const user = JSON.parse(storedUser);

      if (!user?.id) {
        router.replace("/login");
        return;
      }

      const data = await getMyReports(Number(user.id));

      setReports(data || []);
    } catch (error) {
      console.error("MY REPORTS ERROR:", error);
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const getStatusStyle = (status: string) => {
    const value = status.toLowerCase();

    if (value === "resolved" || value === "completed") {
      return {
        backgroundColor: C.greenSoft,
        color: C.green,
      };
    }

    if (value === "rejected" || value === "cancelled") {
      return {
        backgroundColor: C.redSoft,
        color: C.red,
      };
    }

    return {
      backgroundColor: C.blueSoft,
      color: C.blue,
    };
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Date unavailable";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={styles.loadingText}>Loading your reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.green}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/dashboard")}
          >
            <Ionicons name="arrow-back" size={23} color={C.ink} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>My Reports</Text>
            <Text style={styles.subtitle}>
              Track the collection issues you submitted
            </Text>
          </View>
        </View>

        {/* REPORT COUNT */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="document-text-outline" size={25} color={C.green} />
          </View>

          <View style={styles.summaryText}>
            <Text style={styles.summaryNumber}>{reports.length}</Text>
            <Text style={styles.summaryLabel}>
              {reports.length === 1 ? "Report submitted" : "Reports submitted"}
            </Text>
          </View>
        </View>

        {/* EMPTY STATE */}
        {reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={42}
                color={C.green}
              />
            </View>

            <Text style={styles.emptyTitle}>No reports yet</Text>

            <Text style={styles.emptyText}>
              You haven't submitted any collection issue reports yet.
            </Text>

            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => router.push("/report")}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={19} color="#FFFFFF" />

              <Text style={styles.reportButtonText}>Report an Issue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Your submitted reports</Text>

            {reports.map((report) => {
              const statusStyle = getStatusStyle(report.status);

              return (
                <TouchableOpacity
                  key={report.id}
                  style={styles.reportCard}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/my-reports/[id]",
                      params: { id: String(report.id) },
                    })
                  }
                >
                  <View style={styles.reportHeader}>
                    <View style={styles.reportIcon}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={23}
                        color={C.green}
                      />
                    </View>

                    <View style={styles.reportHeaderText}>
                      <Text style={styles.reportNumber}>
                        Report #{report.id}
                      </Text>

                      <Text style={styles.reportIssue} numberOfLines={2}>
                        {report.issue}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={21}
                      color={C.muted}
                    />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={17}
                      color={C.muted}
                    />

                    <Text style={styles.infoText}>
                      {report.collection_date || formatDate(report.created_at)}
                    </Text>
                  </View>

                  {report.area && (
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="location-outline"
                        size={17}
                        color={C.muted}
                      />

                      <Text style={styles.infoText}>{report.area}</Text>
                    </View>
                  )}

                  {report.waste_type && (
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color={C.muted}
                      />

                      <Text style={styles.infoText}>{report.waste_type}</Text>
                    </View>
                  )}

                  <View style={styles.bottomRow}>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: statusStyle.backgroundColor },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: statusStyle.color },
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusText,
                          { color: statusStyle.color },
                        ]}
                      >
                        {report.status || "Reported"}
                      </Text>
                    </View>

                    <Text style={styles.detailsText}>View details</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
    paddingBottom: 35,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.muted,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 25,
    fontWeight: "800",
    color: C.ink,
  },

  subtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 3,
  },

  summaryCard: {
    backgroundColor: C.greenDark,
    borderRadius: 18,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryText: {
    marginLeft: 14,
  },

  summaryNumber: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },

  summaryLabel: {
    color: "#CDEFE0",
    fontSize: 13,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
    marginBottom: 11,
  },

  reportCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 12,
  },

  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  reportIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  reportHeaderText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  reportNumber: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "600",
  },

  reportIssue: {
    fontSize: 16,
    color: C.ink,
    fontWeight: "800",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: C.line,
    marginVertical: 14,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  infoText: {
    fontSize: 13,
    color: C.ink,
    marginLeft: 8,
    flex: 1,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  detailsText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.green,
  },

  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.ink,
  },

  emptyText: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 20,
  },

  reportButton: {
    backgroundColor: C.green,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 7,
  },
});
