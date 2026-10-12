
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Keep this address the same as the API_URL in your admin.tsx.
const API_URL = "http://192.168.1.227:3000";

type CollectionRecord = {
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

const COLORS = {
  primary: "#087F5B",
  primaryDark: "#066548",
  primaryLight: "#E7F5EF",
  background: "#F4F7F5",
  white: "#FFFFFF",
  text: "#172B24",
  muted: "#66766F",
  border: "#DFE8E3",
  blue: "#245DA8",
  blueLight: "#EAF2FF",
  amber: "#986300",
  amberLight: "#FFF4D9",
  red: "#C83D45",
  redLight: "#FFF0F0",
};

const FILTERS = [
  "All",
  "Completed",
  "In Progress",
  "Scheduled",
  "Cancelled",
];

function formatDate(value: string) {
  if (!value) return "Date not recorded";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case "completed":
      return {
        backgroundColor: COLORS.primaryLight,
        color: COLORS.primaryDark,
        icon: "checkmark-circle-outline" as const,
      };

    case "in progress":
      return {
        backgroundColor: COLORS.amberLight,
        color: COLORS.amber,
        icon: "sync-outline" as const,
      };

    case "cancelled":
      return {
        backgroundColor: COLORS.redLight,
        color: COLORS.red,
        icon: "close-circle-outline" as const,
      };

    default:
      return {
        backgroundColor: COLORS.blueLight,
        color: COLORS.blue,
        icon: "calendar-outline" as const,
      };
  }
}

export default function CollectionHistoryScreen() {
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const loadHistory = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);

    try {
      const response = await fetch(`${API_URL}/schedules`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to retrieve collection history.",
        );
      }

      setRecords(Array.isArray(data.schedules) ? data.schedules : []);
    } catch (error) {
      console.error("Collection history error:", error);

      Alert.alert(
        "Unable to Load History",
        error instanceof Error
          ? error.message
          : "Check your backend connection and API address.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(true);
  }, [loadHistory]);

  const counts = useMemo(
    () => ({
      total: records.length,
      completed: records.filter(
        (item) => item.status?.toLowerCase() === "completed",
      ).length,
      progress: records.filter(
        (item) => item.status?.toLowerCase() === "in progress",
      ).length,
      cancelled: records.filter(
        (item) => item.status?.toLowerCase() === "cancelled",
      ).length,
    }),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records
      .filter((item) => {
        const matchesFilter =
          selectedFilter === "All" ||
          item.status?.toLowerCase() === selectedFilter.toLowerCase();

        const searchableText = [
          item.area,
          item.waste_type,
          item.assigned_personnel_name,
          item.status,
          item.notes,
          item.collection_date,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesFilter && searchableText.includes(query);
      })
      .sort((a, b) => {
        const dateA = String(a.collection_date || "").slice(0, 10);
        const dateB = String(b.collection_date || "").slice(0, 10);

        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return Number(b.id) - Number(a.id);
      });
  }, [records, search, selectedFilter]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#198754"
        />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>Loading collection history</Text>
        <Text style={styles.loadingSubtitle}>
          Retrieving records from the database...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#198754"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadHistory();
            }}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back to admin dashboard"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerIcon}>
            <Ionicons name="time" size={27} color="#FFFFFF" />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Collection History</Text>

            <Text style={styles.headerSubtitle}>
              Review collection records
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.infoBanner}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="document-text-outline"
                size={23}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Collection records</Text>
              <Text style={styles.infoDescription}>
                View recorded schedules, assigned personnel, statuses, and
                administrative notes.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.sectionSubtitle}>
            Summary of records currently available
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: COLORS.blueLight },
                ]}
              >
                <Ionicons
                  name="layers-outline"
                  size={20}
                  color={COLORS.blue}
                />
              </View>
              <Text style={styles.statValue}>{counts.total}</Text>
              <Text style={styles.statLabel}>Total records</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: COLORS.primaryLight },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.statValue}>{counts.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: COLORS.amberLight },
                ]}
              >
                <Ionicons
                  name="sync-outline"
                  size={20}
                  color={COLORS.amber}
                />
              </View>
              <Text style={styles.statValue}>{counts.progress}</Text>
              <Text style={styles.statLabel}>In progress</Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: COLORS.redLight },
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={COLORS.red}
                />
              </View>
              <Text style={styles.statValue}>{counts.cancelled}</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Previous collections</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredRecords.length}{" "}
                {filteredRecords.length === 1 ? "record" : "records"} found
              </Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={20}
              color={COLORS.muted}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search zone, waste type, personnel..."
              placeholderTextColor="#8B9891"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={19}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((filter) => {
              const active = selectedFilter === filter;

              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedFilter(filter)}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      active && styles.filterTextActive,
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filteredRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="file-tray-outline"
                  size={32}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptyDescription}>
                {records.length === 0
                  ? "Collection schedules from your database will appear here when they are created."
                  : "Try a different search term or status filter."}
              </Text>
              {(search.length > 0 || selectedFilter !== "All") && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSearch("");
                    setSelectedFilter("All");
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredRecords.map((record) => {
              const badge = getStatusStyle(record.status || "Scheduled");

              return (
                <View key={record.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.recordIcon}>
                      <Ionicons
                        name="location-outline"
                        size={22}
                        color={COLORS.primary}
                      />
                    </View>

                    <View style={styles.recordHeading}>
                      <Text style={styles.recordArea}>
                        {record.area || "Area not recorded"}
                      </Text>
                      <Text style={styles.recordWaste}>
                        {record.waste_type || "Waste type not recorded"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={17}
                      color={COLORS.muted}
                    />
                    <Text style={styles.detailLabel}>Collection date</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(record.collection_date)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="time-outline"
                      size={17}
                      color={COLORS.muted}
                    />
                    <Text style={styles.detailLabel}>Scheduled time</Text>
                    <Text style={styles.detailValue}>
                      {record.collection_time || "Not recorded"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="person-outline"
                      size={17}
                      color={COLORS.muted}
                    />
                    <Text style={styles.detailLabel}>Assigned personnel</Text>
                    <Text style={styles.detailValue}>
                      {record.assigned_personnel_name || "Not assigned"}
                    </Text>
                  </View>

                  <View style={styles.outcomeBox}>
                    <Text style={styles.outcomeLabel}>RECORDED OUTCOME</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: badge.backgroundColor },
                      ]}
                    >
                      <Ionicons
                        name={badge.icon}
                        size={15}
                        color={badge.color}
                      />
                      <Text style={[styles.statusText, { color: badge.color }]}>
                        {record.status || "Scheduled"}
                      </Text>
                    </View>

                    {record.notes?.trim() ? (
                      <Text style={styles.outcomeNotes}>
                        {record.notes.trim()}
                      </Text>
                    ) : (
                      <Text style={styles.noNotes}>
                        No additional outcome notes recorded.
                      </Text>
                    )}
                  </View>

                  <Text style={styles.recordId}>
                    Record #{record.id}
                  </Text>
                </View>
              );
            })
          )}

          <Text style={styles.footer}>
            Data is retrieved from your collection schedules API. Pull down to
            refresh.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 18,
  },
  loadingSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 7,
    textAlign: "center",
  },
  content: {
    paddingBottom: 28,
  },
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
  body: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 14,
    marginBottom: 24,
    gap: 12,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  infoDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 13,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 13,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "40%",
    minHeight: 125,
    padding: 14,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: "800",
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    minHeight: 49,
    paddingHorizontal: 12,
    gap: 9,
    marginBottom: 13,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 11,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 5,
  },
  filterChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  filterTextActive: {
    color: COLORS.white,
  },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 13,
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  recordIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  recordHeading: {
    flex: 1,
  },
  recordArea: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  recordWaste: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 12,
    flex: 1,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
    flex: 1.2,
    textAlign: "right",
  },
  outcomeBox: {
    marginTop: 3,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "flex-start",
  },
  outcomeLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  outcomeNotes: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  noNotes: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
    fontStyle: "italic",
  },
  recordId: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 12,
    textAlign: "right",
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    marginTop: 14,
    alignItems: "center",
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
  },
  clearButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
  },
  clearButtonText: {
    color: COLORS.primaryDark,
    fontWeight: "800",
    fontSize: 12,
  },
  footer: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 14,
    paddingHorizontal: 12,
  },
});
