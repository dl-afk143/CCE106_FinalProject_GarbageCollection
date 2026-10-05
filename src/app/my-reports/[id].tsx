import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { getMyReports } from "../../services/api";

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

const statuses = ["Reported", "Assigned", "En route", "Resolved"];

export default function ReportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [id]);

  async function loadReport() {
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

      const reports = await getMyReports(Number(user.id));

      const foundReport = reports.find(
        (item: Report) => String(item.id) === String(id),
      );

      setReport(foundReport || null);
    } catch (error) {
      console.error("REPORT DETAILS ERROR:", error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  const getStatusIndex = (status: string) => {
    const index = statuses.findIndex(
      (item) => item.toLowerCase() === status?.toLowerCase(),
    );

    return index === -1 ? 0 : index;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#087F5B" />
        <Text style={styles.loadingText}>Loading report...</Text>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#087F5B" />

          <Text style={styles.emptyTitle}>Report Not Found</Text>

          <Text style={styles.emptyText}>
            We couldn't find this report in your submitted reports.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/my-reports")}
          >
            <Text style={styles.backButtonText}>Back to My Reports</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = getStatusIndex(report.status);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backIcon}
            onPress={() => router.replace("/my-reports")}
          >
            <Ionicons name="arrow-back" size={24} color="#102A43" />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>Report Details</Text>
            <Text style={styles.headerSubtitle}>Collection issue report</Text>
          </View>
        </View>

        {/* STATUS CARD */}
        <View style={styles.statusCard}>
          <Text style={styles.reportNumber}>Report #{report.id}</Text>

          <Text style={styles.issueTitle}>{report.issue}</Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {report.status || "Reported"}
            </Text>
          </View>

          {/* PROGRESS */}
          <View style={styles.progressContainer}>
            {statuses.map((status, index) => {
              const completed = index <= currentStatus;

              return (
                <View key={status} style={styles.progressItem}>
                  <View
                    style={[
                      styles.progressCircle,
                      completed && styles.progressCircleActive,
                    ]}
                  >
                    {completed ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.progressNumber}>{index + 1}</Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.progressText,
                      completed && styles.progressTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* REPORT INFORMATION */}
        <Text style={styles.sectionTitle}>Report Information</Text>

        <View style={styles.infoCard}>
          <InfoRow icon="warning-outline" label="Issue" value={report.issue} />

          <InfoRow
            icon="trash-outline"
            label="Waste Type"
            value={report.waste_type || "Not specified"}
          />

          <InfoRow
            icon="location-outline"
            label="Area"
            value={report.area || "Not specified"}
          />

          <InfoRow
            icon="calendar-outline"
            label="Collection Date"
            value={report.collection_date || "Not specified"}
          />

          <InfoRow
            icon="time-outline"
            label="Collection Time"
            value={report.collection_time || "Not specified"}
          />
        </View>

        {/* DESCRIPTION */}
        <Text style={styles.sectionTitle}>Description</Text>

        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>
            {report.description || "No description provided."}
          </Text>
        </View>

        {/* PHOTO */}
        {report.photo && (
          <>
            <Text style={styles.sectionTitle}>Attached Photo</Text>

            <View style={styles.photoCard}>
              <Image
                source={{ uri: report.photo }}
                style={styles.photo}
                resizeMode="cover"
              />
            </View>
          </>
        )}

        {/* LOCATION */}
        {report.latitude !== null && report.longitude !== null && (
          <>
            <Text style={styles.sectionTitle}>Reported Location</Text>

            <View style={styles.locationCard}>
              <Ionicons name="location" size={25} color="#087F5B" />

              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>GPS Location</Text>

                <Text style={styles.locationText}>
                  Latitude: {report.latitude}
                </Text>

                <Text style={styles.locationText}>
                  Longitude: {report.longitude}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color="#087F5B" />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F5",
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F5",
  },

  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#102A43",
  },

  headerSubtitle: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 13,
  },

  statusCard: {
    backgroundColor: "#0B3D2E",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },

  reportNumber: {
    color: "#BFE8D5",
    fontSize: 12,
    fontWeight: "700",
  },

  issueTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: 12,
  },

  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E3F6EE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusBadgeText: {
    color: "#087F5B",
    fontSize: 12,
    fontWeight: "800",
  },

  progressContainer: {
    marginTop: 24,
  },

  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  progressCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#6CA88E",
    alignItems: "center",
    justifyContent: "center",
  },

  progressCircleActive: {
    backgroundColor: "#087F5B",
    borderColor: "#FFFFFF",
  },

  progressNumber: {
    color: "#BFE8D5",
    fontSize: 11,
    fontWeight: "700",
  },

  progressText: {
    marginLeft: 10,
    color: "#BFE8D5",
    fontSize: 13,
  },

  progressTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102A43",
    marginBottom: 10,
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    marginBottom: 22,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E3F6EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: "#64748B",
    fontSize: 12,
  },

  infoValue: {
    color: "#102A43",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },

  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },

  descriptionText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
  },

  photoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 22,
  },

  photo: {
    width: "100%",
    height: 230,
  },

  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  locationInfo: {
    marginLeft: 12,
  },

  locationTitle: {
    color: "#102A43",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  locationText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#102A43",
    marginTop: 16,
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },

  backButton: {
    backgroundColor: "#087F5B",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 20,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
