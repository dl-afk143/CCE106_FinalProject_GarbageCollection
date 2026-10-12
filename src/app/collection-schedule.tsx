import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Defined here on purpose: importing API_URL from services/api was
// coming through as undefined in this project.
const API_URL = "http://192.168.1.227:3000";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

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

type CollectionSchedule = {
  id: number;
  collection_date: string;
  collection_time: string;
  area: string;
  waste_type: string;
  assigned_personnel_name?: string | null;
  status: string;
  notes?: string | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
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

// Builds a "YYYY-MM-DD" key from year, month (0-11) and day.
function makeKey(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

// Converts whatever the API sends for a date into a "YYYY-MM-DD" key.
// Handles plain dates ("2026-10-13") and ISO timestamps
// ("2026-10-12T16:00:00.000Z") using the phone's local time.
function toDateKey(value?: string | null) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return makeKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatLongDate(key: string) {
  const parts = key.split("-").map(Number);

  if (parts.length !== 3 || parts.some((part) => !part)) return key;

  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusStyle(status: string) {
  const value = (status || "").toLowerCase();

  if (value.includes("complete")) {
    return { bg: C.greenSoft, text: C.green, dot: C.green };
  }

  if (value.includes("progress")) {
    return { bg: C.blueSoft, text: C.blue, dot: C.blue };
  }

  if (value.includes("cancel")) {
    return { bg: C.redSoft, text: C.red, dot: C.red };
  }

  return { bg: C.amberSoft, text: C.amber, dot: C.amber };
}

function getWasteStyle(wasteType: string) {
  const value = (wasteType || "").toLowerCase();

  if (value.includes("recycl")) {
    return {
      icon: "sync-outline" as IconName,
      bg: C.greenSoft,
      fg: C.green,
    };
  }

  if (value.includes("organic") || value.includes("bio")) {
    return {
      icon: "leaf-outline" as IconName,
      bg: C.greenSoft,
      fg: C.green,
    };
  }

  return {
    icon: "trash-outline" as IconName,
    bg: C.blueSoft,
    fg: C.blue,
  };
}

export default function TruckScheduleScreen() {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const todayKey = makeKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSchedules = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/schedules`);

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data: unknown = await response.json();

      let list: CollectionSchedule[] = [];

      if (Array.isArray(data)) {
        list = data as CollectionSchedule[];
      } else if (
        data !== null &&
        typeof data === "object" &&
        "schedules" in data &&
        Array.isArray(data.schedules)
      ) {
        list = data.schedules as CollectionSchedule[];
      }

      setSchedules(list);
    } catch (err) {
      console.error("CALENDAR LOAD ERROR:", err);
      setError("Unable to load the collection calendar. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadSchedules();
  }, [loadSchedules]);

  // Group schedules by date key so each calendar cell can look them up.
  const schedulesByDate = useMemo(() => {
    const map: Record<string, CollectionSchedule[]> = {};

    schedules.forEach((item) => {
      const key = toDateKey(item.collection_date);

      if (!key) return;

      if (!map[key]) map[key] = [];
      map[key].push(item);
    });

    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) =>
        (a.collection_time || "").localeCompare(b.collection_time || ""),
      );
    });

    return map;
  }, [schedules]);

  // Build the month grid: leading blanks, then each day of the month.
  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: (number | null)[] = [];

    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [viewYear, viewMonth]);

  const monthCount = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-`;

    return schedules.filter((item) =>
      toDateKey(item.collection_date).startsWith(prefix),
    ).length;
  }, [schedules, viewYear, viewMonth]);

  const selectedSchedules = schedulesByDate[selectedKey] || [];

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedKey(todayKey);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.green} />
        <Text style={s.loadingText}>Loading calendar...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["left", "right", "bottom"]}>
      <StatusBar backgroundColor="#198754" barStyle="light-content" />

      {/* HEADER */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={s.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={s.headerIcon}>
          <Ionicons name="calendar" size={26} color="#FFFFFF" />
        </View>

        <View style={s.headerText}>
          <Text style={s.title}>Collection calendar</Text>
          <Text style={s.subtitle}>
            {monthCount} collection{monthCount === 1 ? "" : "s"} in{" "}
            {MONTHS[viewMonth]}
          </Text>
        </View>

        <TouchableOpacity
          style={s.todayButton}
          onPress={goToToday}
          activeOpacity={0.8}
        >
          <Text style={s.todayText}>Today</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.green}
          />
        }
      >

        {error ? (
          <View style={s.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={C.red}
            />
            <View style={s.errorContent}>
              <Text style={s.errorTitle}>Calendar unavailable</Text>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={() => {
                  setLoading(true);
                  void loadSchedules();
                }}
                style={s.retryButton}
              >
                <Text style={s.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* MONTH CARD */}
        <View style={s.card}>
          <View style={s.monthRow}>
            <TouchableOpacity
              style={s.monthArrow}
              onPress={goToPreviousMonth}
              activeOpacity={0.7}
              accessibilityLabel="Previous month"
            >
              <Ionicons name="chevron-back" size={20} color={C.ink} />
            </TouchableOpacity>

            <Text style={s.monthTitle}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>

            <TouchableOpacity
              style={s.monthArrow}
              onPress={goToNextMonth}
              activeOpacity={0.7}
              accessibilityLabel="Next month"
            >
              <Ionicons name="chevron-forward" size={20} color={C.ink} />
            </TouchableOpacity>
          </View>

          <View style={s.weekRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={s.weekday}>
                {day}
              </Text>
            ))}
          </View>

          <View style={s.grid}>
            {calendarCells.map((day, index) => {
              if (day === null) {
                return <View key={`blank-${index}`} style={s.cell} />;
              }

              const key = makeKey(viewYear, viewMonth, day);
              const daySchedules = schedulesByDate[key] || [];
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;

              return (
                <TouchableOpacity
                  key={key}
                  style={s.cell}
                  activeOpacity={0.7}
                  onPress={() => setSelectedKey(key)}
                >
                  <View
                    style={[
                      s.dayCircle,
                      isToday && s.dayCircleToday,
                      isSelected && s.dayCircleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        s.dayText,
                        isToday && s.dayTextToday,
                        isSelected && s.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>

                  <View style={s.dotRow}>
                    {daySchedules.slice(0, 3).map((item) => (
                      <View
                        key={item.id}
                        style={[
                          s.dot,
                          { backgroundColor: getStatusStyle(item.status).dot },
                        ]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* LEGEND */}
          <View style={s.legend}>
            {[
              { label: "Scheduled", color: C.amber },
              { label: "In progress", color: C.blue },
              { label: "Completed", color: C.green },
              { label: "Cancelled", color: C.red },
            ].map((item) => (
              <View key={item.label} style={s.legendItem}>
                <View
                  style={[s.legendDot, { backgroundColor: item.color }]}
                />
                <Text style={s.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* SELECTED DAY */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{formatLongDate(selectedKey)}</Text>
        </View>

        {selectedSchedules.length > 0 ? (
          selectedSchedules.map((schedule) => {
            const wasteStyle = getWasteStyle(schedule.waste_type);
            const statusStyle = getStatusStyle(schedule.status);

            return (
              <View key={schedule.id} style={[s.card, s.scheduleCard]}>
                <View
                  style={[s.rowIcon, { backgroundColor: wasteStyle.bg }]}
                >
                  <Ionicons
                    name={wasteStyle.icon}
                    size={22}
                    color={wasteStyle.fg}
                  />
                </View>

                <View style={s.rowText}>
                  <Text style={s.rowTitle} numberOfLines={1}>
                    {schedule.waste_type || "Waste collection"}
                  </Text>
                  <Text style={s.rowNote} numberOfLines={2}>
                    {schedule.collection_time || "Time not specified"}
                    {" · "}
                    {schedule.area || "Area not specified"}
                  </Text>
                  {schedule.assigned_personnel_name ? (
                    <Text style={s.personnel}>
                      Assigned: {schedule.assigned_personnel_name}
                    </Text>
                  ) : null}
                  {schedule.notes ? (
                    <Text style={s.notes} numberOfLines={3}>
                      {schedule.notes}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[s.statusPill, { backgroundColor: statusStyle.bg }]}
                >
                  <Text
                    style={[s.statusText, { color: statusStyle.text }]}
                  >
                    {schedule.status || "Scheduled"}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={28}
                color={C.green}
              />
            </View>
            <Text style={s.emptyTitle}>No collections</Text>
            <Text style={s.emptyText}>
              There are no collection schedules on this day.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.muted,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: "#198754",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 12,
    color: "#DDF5E7",
    marginTop: 2,
  },
  todayButton: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginLeft: 8,
  },
  todayText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.ink,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    height: 52,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 3,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleToday: {
    backgroundColor: C.greenSoft,
  },
  dayCircleSelected: {
    backgroundColor: C.green,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.ink,
  },
  dayTextToday: {
    color: C.green,
    fontWeight: "800",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dotRow: {
    flexDirection: "row",
    height: 6,
    marginTop: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginHorizontal: 1.5,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: C.muted,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.ink,
  },
  scheduleCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.ink,
  },
  rowNote: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  personnel: {
    fontSize: 11,
    color: C.green,
    marginTop: 4,
  },
  notes: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  statusPill: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.ink,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 5,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    marginBottom: 14,
  },
  errorContent: {
    flex: 1,
    marginLeft: 10,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.ink,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
    marginTop: 4,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  retryText: {
    color: C.green,
    fontSize: 13,
    fontWeight: "800",
  },
});
