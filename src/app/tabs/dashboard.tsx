import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getMyReports } from "../../services/api";

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

type User = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

type Report = {
  id: number;
  user_id?: number;
  issue: string;
  description: string;
  photo: string | null;
  latitude: number;
  longitude: number;
  area: string;
  collection_date: string;
  collection_time: string;
  waste_type: string;
  status: string;
  created_at: string;
};

type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: IconName;
  read: boolean;
};

const QUICK_ACTIONS: {
  label: string;
  icon: IconName;
  bg: string;
  fg: string;
  onPress?: () => void;
}[] = [
  {
    label: "Report issue",
    icon: "camera-outline",
    bg: C.greenSoft,
    fg: C.green,
    onPress: () => router.push("/report"),
  },
  {
    label: "Truck Schedule",
    icon: "calendar-outline",
    bg: C.blueSoft,
    fg: C.blue,
    onPress: () => router.push("/truckschedule"),
  },
  {
    label: "Monitor",
    icon: "document-text-outline",
    bg: C.amberSoft,
    fg: C.amber,
    onPress: () => router.push("/monitoring"),
  },
  {
    label: "Sorting guide",
    icon: "leaf-outline",
    bg: C.greenSoft,
    fg: C.green,
  },
];

const UPCOMING: {
  type: string;
  note: string;
  day: string;
  date: string;
  icon: IconName;
  bg: string;
  fg: string;
}[] = [
  {
    type: "General waste",
    note: "By 7:00 AM · Black bin",
    day: "Fri",
    date: "24",
    icon: "trash-outline",
    bg: C.blueSoft,
    fg: C.blue,
  },
  {
    type: "Recyclables",
    note: "Paper, glass and metals",
    day: "Tue",
    date: "28",
    icon: "sync-outline",
    bg: C.greenSoft,
    fg: C.green,
  },
];

const STATS = [
  { value: "92%", label: "Collection rate" },
  { value: "148", label: "Pickups" },
  { value: "24", label: "Recycled" },
];

function formatReportDate(dateValue: string) {
  if (!dateValue) {
    return "Date unavailable";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusColor(status: string) {
  const value = status.toLowerCase();

  if (
    value.includes("resolved") ||
    value.includes("completed") ||
    value.includes("complete")
  ) {
    return {
      bg: C.greenSoft,
      text: C.green,
    };
  }

  if (
    value.includes("assigned") ||
    value.includes("progress") ||
    value.includes("en route")
  ) {
    return {
      bg: C.blueSoft,
      text: C.blue,
    };
  }

  if (
    value.includes("rejected") ||
    value.includes("cancelled") ||
    value.includes("failed")
  ) {
    return {
      bg: C.redSoft,
      text: C.red,
    };
  }

  return {
    bg: C.amberSoft,
    text: C.amber,
  };
}

function getReportStep(status: string) {
  const value = status.toLowerCase();

  if (
    value.includes("resolved") ||
    value.includes("completed") ||
    value.includes("complete")
  ) {
    return 3;
  }

  if (
    value.includes("en route") ||
    value.includes("in progress") ||
    value.includes("processing")
  ) {
    return 2;
  }

  if (value.includes("assigned")) {
    return 1;
  }

  return 0;
}

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // NOTIFICATIONS
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "login",
      title: "Login Successful",
      message: "Welcome back to Garbage Collection Monitoring System.",
      time: "Just now",
      icon: "log-in-outline",
      read: false,
    },
  ]);

  const loadDashboard = useCallback(async () => {
    try {
      const savedUser = await AsyncStorage.getItem("loggedInUser");

      if (!savedUser) {
        router.replace("/login");
        return;
      }

      let loggedInUser: User;

      try {
        loggedInUser = JSON.parse(savedUser);
      } catch {
        await AsyncStorage.removeItem("loggedInUser");
        router.replace("/login");
        return;
      }

      if (!loggedInUser?.id) {
        await AsyncStorage.removeItem("loggedInUser");
        router.replace("/login");
        return;
      }

      setUser(loggedInUser);

      const reports = await getMyReports(Number(loggedInUser.id));

      if (reports && reports.length > 0) {
        setLatestReport(reports[0]);
      } else {
        setLatestReport(null);
      }
    } catch (error) {
      console.error("DASHBOARD ERROR:", error);
      setLatestReport(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
            }
          : notification,
      ),
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      })),
    );
  };

  const addNotification = (
    title: string,
    message: string,
    icon: IconName = "notifications-outline",
  ) => {
    setNotifications((current) => [
      {
        id: `${Date.now()}`,
        title,
        message,
        time: "Just now",
        icon,
        read: false,
      },
      ...current,
    ]);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("loggedInUser");
    router.replace("/login");
  };

  const displayName = user?.fullName ? user.fullName.split(" ")[0] : "Resident";

  const reportStatus = latestReport?.status || "Reported";
  const statusStyle = getStatusColor(reportStatus);
  const currentStep = getReportStep(reportStatus);

  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.green} />

        <Text style={s.loadingText}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
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
        {/* HEADER */}
        <View style={s.header}>
          <Image
            source={require("@/assets/images/trash.png")}
            style={s.logo}
            resizeMode="contain"
          />

          <View style={s.headerText}>
            <Text style={s.greeting}>Hello, {displayName}</Text>

            <Text style={s.zone}>
              {user?.role === "user" ? "Resident" : "Residential user"}
            </Text>
          </View>

          {/* NOTIFICATION BUTTON */}
          <TouchableOpacity
            style={s.bell}
            accessibilityLabel="Notifications"
            onPress={() => setNotificationsVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={C.ink} />

            {unreadCount > 0 && (
              <View style={s.bellDot}>
                <Text style={s.bellDotText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* NOTIFICATION POPUP */}
        <Modal
          visible={notificationsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNotificationsVisible(false)}
        >
          <TouchableOpacity
            style={s.notificationOverlay}
            activeOpacity={1}
            onPress={() => setNotificationsVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={s.notificationPanel}
              onPress={(event) => event.stopPropagation()}
            >
              {/* NOTIFICATION HEADER */}
              <View style={s.notificationHeader}>
                <View>
                  <Text style={s.notificationTitle}>Notifications</Text>

                  <Text style={s.notificationSubtitle}>
                    {unreadCount > 0
                      ? `${unreadCount} unread notification${
                          unreadCount > 1 ? "s" : ""
                        }`
                      : "You're all caught up"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={markAllNotificationsAsRead}
                  disabled={unreadCount === 0}
                >
                  <Text
                    style={[
                      s.markAllText,
                      unreadCount === 0 && s.markAllDisabled,
                    ]}
                  >
                    Mark all read
                  </Text>
                </TouchableOpacity>
              </View>

              {/* NOTIFICATION LIST */}
              <ScrollView
                style={s.notificationList}
                showsVerticalScrollIndicator={false}
              >
                {notifications.length === 0 ? (
                  <View style={s.noNotifications}>
                    <View style={s.noNotificationIcon}>
                      <Ionicons
                        name="notifications-off-outline"
                        size={28}
                        color={C.muted}
                      />
                    </View>

                    <Text style={s.noNotificationTitle}>No notifications</Text>

                    <Text style={s.noNotificationText}>
                      You don't have any notifications yet.
                    </Text>
                  </View>
                ) : (
                  notifications.map((notification) => (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        s.notificationItem,
                        !notification.read && s.unreadNotification,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => markNotificationAsRead(notification.id)}
                    >
                      <View style={s.notificationIcon}>
                        <Ionicons
                          name={notification.icon}
                          size={20}
                          color={C.green}
                        />
                      </View>

                      <View style={s.notificationContent}>
                        <View style={s.notificationTitleRow}>
                          <Text
                            style={[
                              s.notificationItemTitle,
                              !notification.read &&
                                s.notificationItemTitleUnread,
                            ]}
                            numberOfLines={1}
                          >
                            {notification.title}
                          </Text>

                          {!notification.read && (
                            <View style={s.unreadIndicator} />
                          )}
                        </View>

                        <Text style={s.notificationMessage}>
                          {notification.message}
                        </Text>

                        <Text style={s.notificationTime}>
                          {notification.time}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* NEXT PICKUP */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View style={s.livePill}>
              <View style={s.liveDot} />

              <Text style={s.livePillText}>Collection service</Text>
            </View>

            <Text style={s.heroRoute}>Resident</Text>
          </View>

          <Text style={s.heroLabel}>Next pickup</Text>

          <Text style={s.heroTitle}>Organic waste</Text>

          <Text style={s.heroSub}>
            Today by 2:00 PM · Put out your organic bin
          </Text>

          <View style={s.heroFooter}>
            <Ionicons name="time-outline" size={16} color="#BFEBD9" />

            <Text style={s.heroFooterText}>
              Keep your waste ready for collection
            </Text>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={s.actionsRow}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={s.action}
              onPress={a.onPress}
              activeOpacity={0.7}
            >
              <View
                style={[
                  s.actionIcon,
                  {
                    backgroundColor: a.bg,
                  },
                ]}
              >
                <Ionicons name={a.icon} size={22} color={a.fg} />
              </View>

              <Text style={s.actionLabel} numberOfLines={2}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* UPCOMING PICKUPS */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Upcoming pickups</Text>

          <TouchableOpacity>
            <Text style={s.link}>Full calendar</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          {UPCOMING.map((u, i) => (
            <View key={u.type} style={[s.row, i > 0 && s.rowBorder]}>
              <View
                style={[
                  s.rowIcon,
                  {
                    backgroundColor: u.bg,
                  },
                ]}
              >
                <Ionicons name={u.icon} size={22} color={u.fg} />
              </View>

              <View style={s.rowText}>
                <Text style={s.rowTitle}>{u.type}</Text>

                <Text style={s.rowNote}>{u.note}</Text>
              </View>

              <View style={s.dateBox}>
                <Text style={s.dateDay}>{u.day}</Text>

                <Text style={s.dateNum}>{u.date}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* MY REPORT STATUS */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Your latest report</Text>

          <TouchableOpacity onPress={() => router.push("/my-reports")}>
            <Text style={s.link}>View all</Text>
          </TouchableOpacity>
        </View>

        {latestReport ? (
          <View style={s.card}>
            {/* REPORT TOP */}
            <View style={s.reportTop}>
              <View style={s.rowText}>
                <Text style={s.rowNote}>REPORT #{latestReport.id}</Text>

                <Text style={s.rowTitle} numberOfLines={2}>
                  {latestReport.issue}
                </Text>

                <Text style={s.reportDate}>
                  {formatReportDate(latestReport.collection_date)}
                </Text>
              </View>

              <View
                style={[
                  s.etaPill,
                  {
                    backgroundColor: statusStyle.bg,
                  },
                ]}
              >
                <Text
                  style={[
                    s.etaText,
                    {
                      color: statusStyle.text,
                    },
                  ]}
                >
                  {reportStatus}
                </Text>
              </View>
            </View>

            {/* REPORT DETAILS */}
            <View style={s.reportInfo}>
              <View style={s.reportInfoItem}>
                <Ionicons name="trash-outline" size={17} color={C.green} />

                <Text style={s.reportInfoText} numberOfLines={1}>
                  {latestReport.waste_type}
                </Text>
              </View>

              <View style={s.reportInfoItem}>
                <Ionicons name="location-outline" size={17} color={C.green} />

                <Text style={s.reportInfoText} numberOfLines={1}>
                  {latestReport.area}
                </Text>
              </View>
            </View>

            {/* REPORT TRACKER */}
            <View style={s.tracker}>
              {["Reported", "Assigned", "En route", "Resolved"].map(
                (label, i, steps) => {
                  const done = i < currentStep;
                  const active = i === currentStep;

                  return (
                    <View key={label} style={s.step}>
                      <View style={s.stepLineRow}>
                        <View
                          style={[
                            s.stepLine,
                            i === 0 && s.stepLineHidden,
                            i <= currentStep && s.stepLineOn,
                          ]}
                        />

                        <View
                          style={[
                            s.stepDot,
                            done && s.stepDone,
                            active && s.stepActive,
                          ]}
                        >
                          {done && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}

                          {active && <View style={s.stepActiveCore} />}
                        </View>

                        <View
                          style={[
                            s.stepLine,
                            i === steps.length - 1 && s.stepLineHidden,
                            i < currentStep && s.stepLineOn,
                          ]}
                        />
                      </View>

                      <Text
                        style={[s.stepText, (done || active) && s.stepTextOn]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                },
              )}
            </View>

            {/* DESCRIPTION */}
            {latestReport.description ? (
              <View style={s.descriptionBox}>
                <Ionicons name="chatbubble-outline" size={17} color={C.muted} />

                <Text style={s.descriptionText}>
                  {latestReport.description}
                </Text>
              </View>
            ) : null}

            {/* VIEW REPORT */}
            <TouchableOpacity
              style={s.viewReportButton}
              activeOpacity={0.7}
              onPress={() => router.push("/my-reports")}
            >
              <Text style={s.viewReportText}>View report details</Text>

              <Ionicons name="arrow-forward" size={17} color={C.green} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.emptyReportCard}>
            <View style={s.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={28}
                color={C.green}
              />
            </View>

            <Text style={s.emptyTitle}>No reports yet</Text>

            <Text style={s.emptyText}>
              You have not submitted any collection reports yet.
            </Text>

            <TouchableOpacity
              style={s.reportButton}
              activeOpacity={0.8}
              onPress={() => router.push("/report")}
            >
              <Ionicons name="camera-outline" size={18} color="#FFFFFF" />

              <Text style={s.reportButtonText}>Report an issue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ZONE STATS */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Zone 1 this month</Text>

          <Text style={s.muted}>September 2026</Text>
        </View>

        <View style={[s.card, s.statsCard]}>
          {STATS.map((st, i) => (
            <View key={st.label} style={[s.stat, i > 0 && s.statBorder]}>
              <Text style={s.statValue}>{st.value}</Text>

              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={s.logoutButton}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={C.red} />

          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
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
    paddingBottom: 32,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 16,
  },

  logo: {
    width: 44,
    height: 44,
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: C.ink,
  },

  zone: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },

  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },

  bellDot: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#E5484D",
    borderWidth: 1.5,
    borderColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },

  bellDotText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },

  /* NOTIFICATIONS */
  notificationOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 70,
    paddingRight: 18,
  },

  notificationPanel: {
    width: 350,
    maxWidth: "92%",
    maxHeight: 430,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },

  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },

  notificationTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
  },

  notificationSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
  },

  markAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.green,
  },

  markAllDisabled: {
    color: C.muted,
  },

  notificationList: {
    maxHeight: 350,
  },

  notificationItem: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },

  unreadNotification: {
    backgroundColor: "#F0FAF6",
  },

  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationContent: {
    flex: 1,
    marginLeft: 11,
  },

  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationItemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: C.ink,
  },

  notificationItemTitleUnread: {
    fontWeight: "800",
  },

  notificationMessage: {
    fontSize: 12,
    lineHeight: 17,
    color: C.muted,
    marginTop: 3,
  },

  notificationTime: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 5,
  },

  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5484D",
    marginLeft: 8,
  },

  noNotifications: {
    alignItems: "center",
    paddingVertical: 35,
    paddingHorizontal: 20,
  },

  noNotificationIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  noNotificationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.ink,
    marginTop: 12,
  },

  noNotificationText: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    marginTop: 5,
  },

  /* HERO */
  hero: {
    backgroundColor: C.greenDark,
    borderRadius: 20,
    padding: 20,
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ADE9B",
    marginRight: 6,
  },

  livePillText: {
    color: "#E3F6EE",
    fontSize: 12,
    fontWeight: "600",
  },

  heroRoute: {
    color: "#9FD8C0",
    fontSize: 12,
  },

  heroLabel: {
    color: "#9FD8C0",
    fontSize: 13,
    marginTop: 18,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 2,
  },

  heroSub: {
    color: "#CDEFE0",
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },

  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },

  heroFooterText: {
    color: "#E3F6EE",
    fontSize: 13,
    marginLeft: 6,
  },

  /* QUICK ACTIONS */
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },

  action: {
    width: "23%",
    alignItems: "center",
  },

  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  actionLabel: {
    fontSize: 12,
    color: C.ink,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 7,
  },

  /* SECTIONS */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
  },

  link: {
    fontSize: 13,
    fontWeight: "700",
    color: C.green,
  },

  muted: {
    fontSize: 12,
    color: C.muted,
  },

  /* CARD */
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
  },

  /* LIST ROWS */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },

  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: C.line,
    marginTop: 12,
    paddingTop: 16,
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

  dateBox: {
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  dateDay: {
    fontSize: 11,
    color: C.muted,
  },

  dateNum: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
  },

  /* REPORT */
  reportTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  reportDate: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
  },

  etaPill: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },

  etaText: {
    fontSize: 12,
    fontWeight: "700",
  },

  reportInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },

  reportInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "50%",
    marginRight: 18,
  },

  reportInfoText: {
    fontSize: 12,
    color: C.muted,
    marginLeft: 6,
    maxWidth: 130,
  },

  /* REPORT TRACKER */
  tracker: {
    flexDirection: "row",
    marginTop: 20,
  },

  step: {
    flex: 1,
    alignItems: "center",
  },

  stepLineRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: C.line,
  },

  stepLineOn: {
    backgroundColor: C.green,
  },

  stepLineHidden: {
    backgroundColor: "transparent",
  },

  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },

  stepDone: {
    backgroundColor: C.green,
    borderColor: C.green,
  },

  stepActive: {
    borderColor: C.green,
  },

  stepActiveCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.green,
  },

  stepText: {
    fontSize: 11,
    color: C.muted,
    marginTop: 6,
  },

  stepTextOn: {
    color: C.ink,
    fontWeight: "700",
  },

  descriptionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },

  descriptionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
    marginLeft: 8,
  },

  viewReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },

  viewReportText: {
    color: C.green,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 6,
  },

  /* EMPTY REPORT */
  emptyReportCard: {
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

  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.green,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },

  reportButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },

  /* STATS */
  statsCard: {
    flexDirection: "row",
    paddingHorizontal: 0,
  },

  stat: {
    flex: 1,
    alignItems: "center",
  },

  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: C.line,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: C.green,
  },

  statLabel: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
    textAlign: "center",
  },

  /* LOGOUT */
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    paddingVertical: 12,
  },

  logoutText: {
    color: C.red,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
});
