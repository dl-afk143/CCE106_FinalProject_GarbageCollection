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

import { API_URL, getMyReports } from "../../services/api";

// Safety fallback: if API_URL ever comes through as undefined,
// the schedules request still goes to the backend.
const BASE_URL = API_URL || "http://192.168.1.227:3000";

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
    label: "Report Issue",
    icon: "camera-outline",
    bg: C.greenSoft,
    fg: C.green,
    onPress: () => router.push("/report"),
  },
  {
    label: "Collection Schedule",
    icon: "calendar-outline",
    bg: C.blueSoft,
    fg: C.blue,
    onPress: () => router.push("/collection-schedule"),
  },
  {
    label: "My Reports",
    icon: "document-text-outline",
    bg: C.amberSoft,
    fg: C.amber,
    onPress: () => router.push("/my-reports"),
  },
  {
    label: "Profile Settings",
    icon: "leaf-outline",
    bg: C.greenSoft,
    fg: C.green,
    onPress: () => router.push("/profile-settings"),
  },
];

const STATS = [
  { value: "92%", label: "Collection rate" },
  { value: "148", label: "Pickups" },
  { value: "24", label: "Recycled" },
];

function formatReportDate(dateValue?: string) {
  if (!dateValue) return "Date unavailable";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return dateValue;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatScheduleDate(dateValue?: string) {
  if (!dateValue) {
    return { day: "--", date: "--", fullDate: "Date unavailable" };
  }

  // Handle MySQL DATE values without UTC timezone shifting.
  const parts = dateValue.slice(0, 10).split("-").map(Number);

  if (parts.length !== 3 || parts.some((part) => !part)) {
    return { day: "--", date: "--", fullDate: dateValue };
  }

  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  return {
    day: date.toLocaleDateString("en-US", { weekday: "short" }),
    date: String(date.getDate()),
    fullDate: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

function getStatusColor(status: string) {
  const value = (status || "").toLowerCase();

  if (
    value.includes("resolved") ||
    value.includes("completed") ||
    value.includes("complete")
  ) {
    return { bg: C.greenSoft, text: C.green };
  }

  if (
    value.includes("assigned") ||
    value.includes("progress") ||
    value.includes("en route")
  ) {
    return { bg: C.blueSoft, text: C.blue };
  }

  if (
    value.includes("rejected") ||
    value.includes("cancelled") ||
    value.includes("failed")
  ) {
    return { bg: C.redSoft, text: C.red };
  }

  return { bg: C.amberSoft, text: C.amber };
}

function getReportStep(status: string) {
  const value = (status || "").toLowerCase();

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

function getWasteStyle(wasteType: string) {
  const value = (wasteType || "").toLowerCase();

  if (value.includes("recycl")) {
    return {
      icon: "sync-outline" as IconName,
      bg: C.greenSoft,
      fg: C.green,
    };
  }

  if (value.includes("organic")) {
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

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [scheduleError, setScheduleError] = useState("");

  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // IMPORTANT: Hooks must stay directly inside HomeScreen.
  // Do not move this function inside loadDashboard.
  const loadSchedules = useCallback(async () => {
    try {
      setScheduleError("");

      console.log("SCHEDULES URL:", `${BASE_URL}/schedules`);

      const response = await fetch(`${BASE_URL}/schedules`);

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data: unknown = await response.json();

      let scheduleList: CollectionSchedule[] = [];

      if (Array.isArray(data)) {
        scheduleList = data as CollectionSchedule[];
      } else if (
        data !== null &&
        typeof data === "object" &&
        "schedules" in data &&
        Array.isArray(data.schedules)
      ) {
        scheduleList = data.schedules as CollectionSchedule[];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingSchedules = scheduleList
        .filter((item) => {
          const status = (item.status || "Scheduled").toLowerCase();

          if (
            status === "cancelled" ||
            status === "canceled" ||
            status === "completed"
          ) {
            return false;
          }

          if (!item.collection_date) return false;

          const parts = item.collection_date
            .slice(0, 10)
            .split("-")
            .map(Number);

          if (
            parts.length !== 3 ||
            parts.some((part) => !part)
          ) {
            return false;
          }

          const scheduleDate = new Date(
            parts[0],
            parts[1] - 1,
            parts[2],
          );

          scheduleDate.setHours(0, 0, 0, 0);

          return scheduleDate >= today;
        })
        .sort((a, b) =>
          a.collection_date.localeCompare(b.collection_date),
        );

      setSchedules(upcomingSchedules);
    } catch (error) {
      console.error("LOAD SCHEDULES ERROR:", error);
      setScheduleError(
        "Unable to load collection schedules. Please try again.",
      );
    }
  }, []);

  // Load the resident, notifications, and latest report.
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

      // Load schedules without breaking the rest of the dashboard
      // if the schedules endpoint is temporarily unavailable.
      await loadSchedules();

      const notificationKey = `gcms_notifications_${loggedInUser.id}`;
      const savedNotifications = await AsyncStorage.getItem(
        notificationKey,
      );

      let nextNotifications: AppNotification[] = [];

      if (savedNotifications !== null) {
        try {
          const parsed: unknown = JSON.parse(savedNotifications);

          if (Array.isArray(parsed)) {
            nextNotifications = parsed.filter(
              (item): item is AppNotification =>
                item !== null &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.title === "string" &&
                typeof item.message === "string" &&
                typeof item.time === "string" &&
                typeof item.icon === "string" &&
                typeof item.read === "boolean",
            );
          }
        } catch {
          nextNotifications = [];
        }
      } else {
        nextNotifications = [
          {
            id: `welcome-${loggedInUser.id}`,
            title: "Welcome to GCMS",
            message:
              "You'll find updates about your collection reports and schedules here.",
            time: "Just now",
            icon: "notifications-outline",
            read: false,
          },
        ];
      }

      // Load the resident's reports.
      const reports = await getMyReports(Number(loggedInUser.id));

      if (reports && reports.length > 0) {
        const latest = reports[0] as Report;

        setLatestReport(latest);

        const currentStatus = latest.status || "Reported";
        const statusKey =
          `gcms_report_status_${loggedInUser.id}_${latest.id}`;

        const previousStatus = await AsyncStorage.getItem(statusKey);

        if (previousStatus && previousStatus !== currentStatus) {
          const notificationId =
            `report-${latest.id}-${previousStatus}-${currentStatus}`;

          const alreadyExists = nextNotifications.some(
            (item) => item.id === notificationId,
          );

          if (!alreadyExists) {
            nextNotifications = [
              {
                id: notificationId,
                title: `Report #${latest.id} Updated`,
                message:
                  `Your report status changed from ${previousStatus} to ${currentStatus}.`,
                time: "Just now",
                icon: "document-text-outline",
                read: false,
              },
              ...nextNotifications,
            ];
          }
        }

        await AsyncStorage.setItem(statusKey, currentStatus);
      } else {
        setLatestReport(null);
      }

      setNotifications(nextNotifications);

      await AsyncStorage.setItem(
        notificationKey,
        JSON.stringify(nextNotifications),
      );
    } catch (error) {
      console.error("DASHBOARD ERROR:", error);
      setLatestReport(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadSchedules]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDashboard();
  }, [loadDashboard]);

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const markNotificationAsRead = async (id: string) => {
    const updatedNotifications = notifications.map((notification) =>
      notification.id === id
        ? { ...notification, read: true }
        : notification,
    );

    setNotifications(updatedNotifications);

    if (user?.id) {
      try {
        await AsyncStorage.setItem(
          `gcms_notifications_${user.id}`,
          JSON.stringify(updatedNotifications),
        );
      } catch (error) {
        console.error("FAILED TO SAVE NOTIFICATION:", error);
      }
    }
  };

  const markAllNotificationsAsRead = async () => {
    const updatedNotifications = notifications.map((notification) => ({
      ...notification,
      read: true,
    }));

    setNotifications(updatedNotifications);

    if (user?.id) {
      try {
        await AsyncStorage.setItem(
          `gcms_notifications_${user.id}`,
          JSON.stringify(updatedNotifications),
        );
      } catch (error) {
        console.error("FAILED TO SAVE NOTIFICATIONS:", error);
      }
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("loggedInUser");
    router.replace("/login");
  };

  const displayName = user?.fullName
    ? user.fullName.split(" ")[0]
    : "Resident";

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
              {user?.role?.toLowerCase() === "user" ||
              user?.role?.toLowerCase() === "resident"
                ? "Resident"
                : user?.role || "Resident"}
            </Text>
          </View>

          <TouchableOpacity
            style={s.bell}
            accessibilityLabel="Notifications"
            onPress={() => setNotificationsVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={C.ink}
            />

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
                    <Text style={s.noNotificationTitle}>
                      No notifications
                    </Text>
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
                      onPress={() =>
                        markNotificationAsRead(notification.id)
                      }
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
          <Text style={s.heroTitle}>
            {schedules.length > 0
              ? schedules[0].waste_type || "Scheduled collection"
              : "No upcoming pickup"}
          </Text>
          <Text style={s.heroSub}>
            {schedules.length > 0
              ? `${formatScheduleDate(schedules[0].collection_date).fullDate} · ${
                  schedules[0].collection_time || "Time not specified"
                }`
              : "There are no upcoming collection schedules."}
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
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={s.action}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View
                style={[
                  s.actionIcon,
                  { backgroundColor: action.bg },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={22}
                  color={action.fg}
                />
              </View>
              <Text style={s.actionLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* UPCOMING PICKUPS FROM THE DATABASE */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Upcoming pickups</Text>
          <TouchableOpacity onPress={() => router.push("/collection-schedule")}>
            <Text style={s.link}>Full calendar</Text>
          </TouchableOpacity>
        </View>

        {scheduleError ? (
          <View style={s.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={C.red}
            />
            <View style={s.errorContent}>
              <Text style={s.errorTitle}>Schedule unavailable</Text>
              <Text style={s.errorText}>{scheduleError}</Text>
              <TouchableOpacity
                onPress={() => void loadSchedules()}
                style={s.retryButton}
              >
                <Text style={s.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : schedules.length > 0 ? (
          <View style={s.card}>
            {schedules.slice(0, 3).map((schedule, index) => {
              const wasteStyle = getWasteStyle(schedule.waste_type);
              const dateInfo = formatScheduleDate(
                schedule.collection_date,
              );

              return (
                <View
                  key={schedule.id}
                  style={[
                    s.row,
                    index > 0 && s.rowBorder,
                  ]}
                >
                  <View
                    style={[
                      s.rowIcon,
                      { backgroundColor: wasteStyle.bg },
                    ]}
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
                      <Text style={s.schedulePersonnel}>
                        Assigned: {schedule.assigned_personnel_name}
                      </Text>
                    ) : null}
                    <Text style={s.scheduleStatus}>
                      Status: {schedule.status || "Scheduled"}
                    </Text>
                  </View>

                  <View style={s.dateBox}>
                    <Text style={s.dateDay}>{dateInfo.day}</Text>
                    <Text style={s.dateNum}>{dateInfo.date}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.emptyReportCard}>
            <View style={s.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={28}
                color={C.green}
              />
            </View>
            <Text style={s.emptyTitle}>No upcoming pickups</Text>
            <Text style={s.emptyText}>
              There are no upcoming collection schedules available right now.
            </Text>
          </View>
        )}

        {/* MY REPORT STATUS */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Your latest report</Text>
        </View>

        {latestReport ? (
          <View style={s.card}>
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
                  { backgroundColor: statusStyle.bg },
                ]}
              >
                <Text
                  style={[
                    s.etaText,
                    { color: statusStyle.text },
                  ]}
                >
                  {reportStatus}
                </Text>
              </View>
            </View>

            <View style={s.reportInfo}>
              <View style={s.reportInfoItem}>
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color={C.green}
                />
                <Text style={s.reportInfoText} numberOfLines={1}>
                  {latestReport.waste_type}
                </Text>
              </View>

              <View style={s.reportInfoItem}>
                <Ionicons
                  name="location-outline"
                  size={17}
                  color={C.green}
                />
                <Text style={s.reportInfoText} numberOfLines={1}>
                  {latestReport.area}
                </Text>
              </View>
            </View>

            <View style={s.tracker}>
              {["Reported", "Assigned", "En route", "Resolved"].map(
                (label, index, steps) => {
                  const done = index < currentStep;
                  const active = index === currentStep;

                  return (
                    <View key={label} style={s.step}>
                      <View style={s.stepLineRow}>
                        <View
                          style={[
                            s.stepLine,
                            index === 0 && s.stepLineHidden,
                            index <= currentStep && s.stepLineOn,
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
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color="#FFFFFF"
                            />
                          )}
                          {active && <View style={s.stepActiveCore} />}
                        </View>

                        <View
                          style={[
                            s.stepLine,
                            index === steps.length - 1 &&
                              s.stepLineHidden,
                            index < currentStep && s.stepLineOn,
                          ]}
                        />
                      </View>

                      <Text
                        style={[
                          s.stepText,
                          (done || active) && s.stepTextOn,
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                },
              )}
            </View>

            {latestReport.description ? (
              <View style={s.descriptionBox}>
                <Ionicons
                  name="chatbubble-outline"
                  size={17}
                  color={C.muted}
                />
                <Text style={s.descriptionText}>
                  {latestReport.description}
                </Text>
              </View>
            ) : null}
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
              <Ionicons
                name="camera-outline"
                size={18}
                color="#FFFFFF"
              />
              <Text style={s.reportButtonText}>Report an issue</Text>
            </TouchableOpacity>
          </View>
        )}



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
    shadowOffset: { width: 0, height: 8 },
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
    flex: 1,
  },
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
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
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
  schedulePersonnel: {
    fontSize: 11,
    color: C.green,
    marginTop: 4,
  },
  scheduleStatus: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  dateBox: {
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
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
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
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