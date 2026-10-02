import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <Image
              source={require("@/assets/images/trash.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <View>
              <Text style={styles.brandName}>Garbage Collection</Text>
              <Text style={styles.brandSub}>
                Scheduling & Monitoring System
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notification}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* GREETING */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Hello, Resident!</Text>

          <Text style={styles.location}>Zone 1 • Residential Area</Text>

          <View style={styles.statusBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.statusText}>LIVE STATUS</Text>
          </View>
        </View>

        {/* PICKUP ALERT */}
        <View style={styles.alertCard}>
          <View style={styles.alertIconBox}>
            <Text style={styles.alertIcon}>♻</Text>
          </View>

          <View style={styles.alertContent}>
            <View style={styles.alertTitleRow}>
              <Text style={styles.alertTitle}>PICKUP ALERT</Text>
              <Text style={styles.alertToday}> • Today</Text>
            </View>

            <Text style={styles.alertDescription}>
              Organic waste collection by 2:00 PM
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </View>

        {/* REPORT WASTE ISSUE */}
        <View style={styles.reportCard}>
          <View style={styles.responseBadge}>
            <Text style={styles.responseText}>⚡ Avg response: 3.5 hrs</Text>
          </View>

          <View style={styles.reportHeader}>
            <View style={styles.reportTextContainer}>
              <Text style={styles.reportTitle}>Report a Waste Issue</Text>

              <Text style={styles.reportDescription}>
                Spotted illegal dumping, damaged cans, or missed curbside
                pickups?
              </Text>
            </View>

            <Text style={styles.recycleLarge}>♻</Text>
          </View>

          <TouchableOpacity style={styles.reportButton}>
            <Text style={styles.cameraIcon}>▣</Text>
            <Text style={styles.reportButtonText}>Snap & Report Now</Text>
          </TouchableOpacity>
        </View>

        {/* CURBSIDE PICKUPS */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>▣</Text>
            <Text style={styles.sectionTitle}>Curbside Pickups</Text>
          </View>

          <TouchableOpacity>
            <Text style={styles.fullCalendar}>Full calendar →</Text>
          </TouchableOpacity>
        </View>

        {/* ORGANIC WASTE */}
        <View style={styles.pickupCard}>
          <View style={[styles.pickupIcon, styles.greenIcon]}>
            <Text style={styles.pickupIconText}>♻</Text>
          </View>

          <View style={styles.pickupInfo}>
            <View style={styles.pickupTitleRow}>
              <Text style={styles.pickupTitle}>Organic Waste</Text>

              <View style={styles.todayBadge}>
                <Text style={styles.todayText}>Today</Text>
              </View>
            </View>

            <Text style={styles.pickupDescription}>
              Estimated 2:00 PM • Organic Bin
            </Text>
          </View>

          <View style={styles.pickupStatus}>
            <Text style={styles.dispatched}>Dispatched</Text>
            <Text style={styles.route}>Route #24</Text>
          </View>
        </View>

        {/* GENERAL WASTE */}
        <View style={styles.pickupCard}>
          <View style={[styles.pickupIcon, styles.blueIcon]}>
            <Text style={styles.pickupIconText}>▣</Text>
          </View>

          <View style={styles.pickupInfo}>
            <Text style={styles.pickupTitle}>General Waste</Text>

            <Text style={styles.pickupDescription}>By 7:00 AM • Black Bin</Text>
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.dateDay}>Fri,</Text>
            <Text style={styles.dateNumber}>24</Text>
          </View>

          <View style={styles.scheduledBadge}>
            <Text style={styles.scheduledText}>Scheduled</Text>
          </View>
        </View>

        {/* RECYCLABLES */}
        <View style={styles.pickupCard}>
          <View style={[styles.pickupIcon, styles.lightBlueIcon]}>
            <Text style={styles.pickupIconText}>♻</Text>
          </View>

          <View style={styles.pickupInfo}>
            <Text style={styles.pickupTitle}>Recyclables</Text>

            <Text style={styles.pickupDescription}>Paper, Glass & Metals</Text>
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.dateDay}>Tue,</Text>
            <Text style={styles.dateNumber}>28</Text>
          </View>

          <View style={styles.scheduledBadge}>
            <Text style={styles.scheduledText}>Scheduled</Text>
          </View>
        </View>

        {/* ACTIVE COLLECTION */}
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <View>
              <Text style={styles.incidentNumber}>#INC-4491</Text>
              <Text style={styles.activeTitle}>Overflowing Public Bin</Text>
            </View>

            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>ETA 45m</Text>
            </View>
          </View>

          {/* TRACKING LINE */}
          <View style={styles.trackingContainer}>
            <View style={styles.trackingLine} />

            <View style={styles.step}>
              <View style={styles.completedCircle}>
                <Text style={styles.check}>✓</Text>
              </View>
              <Text style={styles.stepText}>Logged</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.completedCircle}>
                <Text style={styles.check}>⌁</Text>
              </View>
              <Text style={styles.stepText}>Assigned</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.completedCircle}>
                <Text style={styles.check}>⌁</Text>
              </View>
              <Text style={styles.stepText}>En Route</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.pendingCircle}>
                <Text style={styles.pendingText}>○</Text>
              </View>
              <Text style={styles.stepText}>Resolved</Text>
            </View>
          </View>

          {/* LOCATION */}
          <View style={styles.locationBar}>
            <Text style={styles.locationIcon}>➤</Text>

            <Text style={styles.locationText}>5th Ave & Pine Street</Text>

            <TouchableOpacity>
              <Text style={styles.viewLive}>View Live</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* WARD IMPACT */}
        <View style={styles.impactHeader}>
          <View style={styles.impactTitleContainer}>
            <Text style={styles.impactIcon}>⌁</Text>
            <Text style={styles.impactTitle}>Zone 1 Impact</Text>
          </View>

          <Text style={styles.impactDate}>September 2026</Text>
        </View>

        <View style={styles.impactCard}>
          <View style={styles.impactItem}>
            <Text style={styles.impactNumber}>92%</Text>
            <Text style={styles.impactLabel}>Collection Rate</Text>
          </View>

          <View style={styles.impactDivider} />

          <View style={styles.impactItem}>
            <Text style={styles.impactNumber}>148</Text>
            <Text style={styles.impactLabel}>Pickups</Text>
          </View>

          <View style={styles.impactDivider} />

          <View style={styles.impactItem}>
            <Text style={styles.impactNumber}>24</Text>
            <Text style={styles.impactLabel}>Recycled</Text>
          </View>
        </View>

        {/* BOTTOM SPACE */}
        <View style={{ height: 25 }} />
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  scrollContent: {
    paddingBottom: 20,
  },

  /* HEADER */
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  logo: {
    width: 46,
    height: 46,
    marginRight: 9,
  },

  brandName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#12372A",
  },

  brandSub: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F3",
    justifyContent: "center",
    alignItems: "center",
  },

  notification: {
    fontSize: 19,
  },

  /* GREETING */
  greetingSection: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },

  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: "#102A43",
  },

  location: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  statusBadge: {
    position: "absolute",
    right: 18,
    bottom: 18,
    backgroundColor: "#E5F8F0",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2CB67D",
    marginRight: 5,
  },

  statusText: {
    color: "#087F5B",
    fontSize: 9,
    fontWeight: "800",
  },

  /* ALERT */
  alertCard: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#DCE6FF",
    flexDirection: "row",
    alignItems: "center",
  },

  alertIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  alertIcon: {
    fontSize: 23,
    color: "#087F5B",
  },

  alertContent: {
    flex: 1,
    marginLeft: 10,
  },

  alertTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  alertTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#087F5B",
  },

  alertToday: {
    fontSize: 10,
    color: "#475569",
  },

  alertDescription: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  arrow: {
    fontSize: 24,
    color: "#64748B",
  },

  /* REPORT */
  reportCard: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 17,
    borderRadius: 17,
    backgroundColor: "#00875A",
    overflow: "hidden",
  },

  responseBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#087F5B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  responseText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  reportHeader: {
    flexDirection: "row",
    marginTop: 13,
  },

  reportTextContainer: {
    flex: 1,
  },

  reportTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  reportDescription: {
    color: "#D9F7E9",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  recycleLarge: {
    fontSize: 48,
    color: "#35A77C",
    marginLeft: 5,
  },

  reportButton: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  cameraIcon: {
    color: "#087F5B",
    fontSize: 17,
    marginRight: 7,
  },

  reportButtonText: {
    color: "#087F5B",
    fontSize: 12,
    fontWeight: "800",
  },

  /* SECTION */
  sectionHeader: {
    marginHorizontal: 18,
    marginTop: 20,
    marginBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionIcon: {
    color: "#087F5B",
    fontSize: 21,
    marginRight: 8,
  },

  sectionTitle: {
    color: "#102A43",
    fontSize: 20,
    fontWeight: "800",
  },

  fullCalendar: {
    color: "#087F5B",
    fontSize: 9,
    fontWeight: "800",
  },

  /* PICKUP CARDS */
  pickupCard: {
    marginHorizontal: 18,
    marginBottom: 9,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 75,
  },

  pickupIcon: {
    width: 43,
    height: 43,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },

  greenIcon: {
    backgroundColor: "#D6F8E9",
  },

  blueIcon: {
    backgroundColor: "#E0E8FF",
  },

  lightBlueIcon: {
    backgroundColor: "#DCEEFF",
  },

  pickupIconText: {
    fontSize: 21,
    color: "#087F5B",
  },

  pickupInfo: {
    flex: 1,
    marginLeft: 11,
  },

  pickupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  pickupTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102A43",
  },

  todayBadge: {
    marginLeft: 6,
    backgroundColor: "#8DE8C4",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },

  todayText: {
    color: "#087F5B",
    fontSize: 8,
    fontWeight: "800",
  },

  pickupDescription: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 15,
  },

  pickupStatus: {
    alignItems: "flex-end",
    marginLeft: 7,
  },

  dispatched: {
    color: "#087F5B",
    fontSize: 8,
    fontWeight: "900",
  },

  route: {
    color: "#64748B",
    fontSize: 8,
    marginTop: 2,
  },

  dateContainer: {
    alignItems: "center",
    marginHorizontal: 7,
  },

  dateDay: {
    fontSize: 8,
    color: "#64748B",
  },

  dateNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: "#102A43",
  },

  scheduledBadge: {
    backgroundColor: "#DCE6FF",
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 15,
  },

  scheduledText: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "800",
  },

  /* ACTIVE COLLECTION */
  activeCard: {
    marginHorizontal: 18,
    marginTop: 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
  },

  activeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  incidentNumber: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "800",
  },

  activeTitle: {
    color: "#102A43",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },

  etaBadge: {
    backgroundColor: "#DCE6FF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  etaText: {
    color: "#475569",
    fontSize: 8,
    fontWeight: "800",
  },

  trackingContainer: {
    height: 65,
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },

  trackingLine: {
    position: "absolute",
    height: 3,
    backgroundColor: "#00875A",
    left: 13,
    right: 13,
    top: 13,
  },

  step: {
    alignItems: "center",
    width: 55,
    zIndex: 2,
  },

  completedCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#087F5B",
    justifyContent: "center",
    alignItems: "center",
  },

  pendingCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },

  check: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  pendingText: {
    color: "#94A3B8",
    fontSize: 13,
  },

  stepText: {
    marginTop: 5,
    color: "#334155",
    fontSize: 8,
    fontWeight: "700",
  },

  locationBar: {
    backgroundColor: "#F0F5FF",
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  locationIcon: {
    color: "#087F5B",
    fontSize: 16,
    marginRight: 7,
  },

  locationText: {
    flex: 1,
    color: "#334155",
    fontSize: 10,
  },

  viewLive: {
    color: "#087F5B",
    fontSize: 9,
    fontWeight: "800",
  },

  /* IMPACT */
  impactHeader: {
    marginHorizontal: 18,
    marginTop: 20,
    marginBottom: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  impactTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  impactIcon: {
    color: "#087F5B",
    fontSize: 22,
    marginRight: 7,
  },

  impactTitle: {
    color: "#102A43",
    fontSize: 20,
    fontWeight: "800",
  },

  impactDate: {
    color: "#64748B",
    fontSize: 9,
  },

  impactCard: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingVertical: 17,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  impactItem: {
    alignItems: "center",
    flex: 1,
  },

  impactNumber: {
    color: "#087F5B",
    fontSize: 20,
    fontWeight: "900",
  },

  impactLabel: {
    color: "#64748B",
    fontSize: 9,
    marginTop: 3,
  },

  impactDivider: {
    width: 1,
    height: 35,
    backgroundColor: "#E2E8F0",
  },

  /* BOTTOM NAV */
  bottomNav: {
    height: 68,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },

  navIconActive: {
    color: "#087F5B",
    fontSize: 21,
  },

  navIcon: {
    color: "#94A3B8",
    fontSize: 21,
  },

  navTextActive: {
    color: "#087F5B",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 3,
  },

  navText: {
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 3,
  },
});
