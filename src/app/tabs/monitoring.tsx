import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

export default function MonitoringScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Collection Monitoring</Text>
            <Text style={styles.subtitle}>Track your garbage collection</Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* CURRENT COLLECTION */}
        <View style={styles.mainCard}>
          <Text style={styles.smallWhiteText}>CURRENT COLLECTION</Text>

          <View style={styles.titleRow}>
            <Text style={styles.collectionTitle}>General Waste</Text>

            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>IN PROGRESS</Text>
            </View>
          </View>

          <View style={styles.line} />

          <Text style={styles.whiteText}>Date: September 30, 2026</Text>

          <Text style={styles.whiteText}>Time: 7:00 AM - 10:00 AM</Text>

          <Text style={styles.whiteText}>Area: Zone 1</Text>
        </View>

        {/* COLLECTION PROGRESS */}
        <Text style={styles.sectionTitle}>Collection Progress</Text>

        <View style={styles.card}>
          {/* SCHEDULED */}
          <View style={styles.progressRow}>
            <View style={styles.completedCircle}>
              <Text style={styles.check}>✓</Text>
            </View>

            <View style={styles.progressText}>
              <Text style={styles.progressTitle}>Scheduled</Text>

              <Text style={styles.progressDescription}>
                Collection schedule confirmed
              </Text>
            </View>

            <Text style={styles.doneText}>Done</Text>
          </View>

          <View style={styles.verticalLine} />

          {/* IN PROGRESS */}
          <View style={styles.progressRow}>
            <View style={styles.activeCircle}>
              <View style={styles.activeDot} />
            </View>

            <View style={styles.progressText}>
              <Text style={styles.progressTitle}>In Progress</Text>

              <Text style={styles.progressDescription}>
                Collection personnel are collecting waste
              </Text>
            </View>

            <Text style={styles.currentText}>Current</Text>
          </View>

          <View style={styles.verticalLine} />

          {/* COMPLETED */}
          <View style={styles.progressRow}>
            <View style={styles.pendingCircle}>
              <Text style={styles.number}>3</Text>
            </View>

            <View style={styles.progressText}>
              <Text style={styles.pendingTitle}>Completed</Text>

              <Text style={styles.progressDescription}>
                Waiting for collection completion
              </Text>
            </View>
          </View>
        </View>

        {/* COLLECTION DETAILS */}
        <Text style={styles.sectionTitle}>Collection Details</Text>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Collection Area</Text>

            <Text style={styles.detailValue}>Zone 1</Text>
          </View>

          <View style={styles.detailLine} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Waste Type</Text>

            <Text style={styles.detailValue}>General Waste</Text>
          </View>

          <View style={styles.detailLine} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scheduled Time</Text>

            <Text style={styles.detailValue}>7:00 AM - 10:00 AM</Text>
          </View>

          <View style={styles.detailLine} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Completion</Text>

            <Text style={styles.detailValue}>9:30 AM</Text>
          </View>
        </View>

        {/* LATEST UPDATE */}
        <Text style={styles.sectionTitle}>Latest Update</Text>

        <View style={styles.updateCard}>
          <View style={styles.updateCircle}>
            <Text style={styles.updateCheck}>✓</Text>
          </View>

          <View style={styles.updateContent}>
            <Text style={styles.updateTitle}>Collection is in progress</Text>

            <Text style={styles.updateDescription}>
              Collection personnel have started collecting garbage in Zone 1.
            </Text>

            <Text style={styles.updateTime}>Updated just now</Text>
          </View>
        </View>

        {/* NOTIFICATION NOTICE */}
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Stay Updated</Text>

          <Text style={styles.noticeText}>
            You will receive a notification when the collection status changes
            or the collection is completed.
          </Text>
        </View>

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

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#102A43",
  },

  subtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F7F0",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#087F5B",
    marginRight: 5,
  },

  liveText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#087F5B",
  },

  mainCard: {
    margin: 18,
    padding: 18,
    borderRadius: 17,
    backgroundColor: "#087F5B",
  },

  smallWhiteText: {
    color: "#BDEED9",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },

  collectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  statusBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusBadgeText: {
    color: "#087F5B",
    fontSize: 8,
    fontWeight: "900",
  },

  line: {
    height: 1,
    backgroundColor: "#32A77E",
    marginVertical: 15,
  },

  whiteText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 6,
  },

  sectionTitle: {
    marginHorizontal: 18,
    marginTop: 5,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "800",
    color: "#102A43",
  },

  card: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 55,
  },

  completedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#087F5B",
    justifyContent: "center",
    alignItems: "center",
  },

  check: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  activeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D9F5EA",
    justifyContent: "center",
    alignItems: "center",
  },

  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#087F5B",
  },

  pendingCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },

  number: {
    color: "#94A3B8",
    fontWeight: "800",
  },

  progressText: {
    flex: 1,
    marginLeft: 11,
  },

  progressTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#102A43",
  },

  pendingTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },

  progressDescription: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 3,
  },

  doneText: {
    color: "#087F5B",
    fontSize: 9,
    fontWeight: "800",
  },

  currentText: {
    color: "#087F5B",
    fontSize: 9,
    fontWeight: "900",
  },

  verticalLine: {
    width: 2,
    height: 18,
    backgroundColor: "#D6E8E0",
    marginLeft: 15,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
  },

  detailLabel: {
    color: "#64748B",
    fontSize: 10,
  },

  detailValue: {
    color: "#102A43",
    fontSize: 11,
    fontWeight: "700",
  },

  detailLine: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  updateCard: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  updateCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
  },

  updateCheck: {
    color: "#087F5B",
    fontWeight: "900",
    fontSize: 16,
  },

  updateContent: {
    flex: 1,
    marginLeft: 10,
  },

  updateTitle: {
    color: "#102A43",
    fontSize: 12,
    fontWeight: "800",
  },

  updateDescription: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  updateTime: {
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 5,
  },

  notice: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#E8F7F0",
  },

  noticeTitle: {
    color: "#102A43",
    fontSize: 12,
    fontWeight: "800",
  },

  noticeText: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

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

  navIcon: {
    fontSize: 20,
    color: "#94A3B8",
  },

  activeNavIcon: {
    fontSize: 20,
    color: "#087F5B",
  },

  navText: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 3,
  },

  activeNavText: {
    fontSize: 9,
    color: "#087F5B",
    fontWeight: "800",
    marginTop: 3,
  },
});
