import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker } from "react-native-maps";
import { SafeAreaView as SafeAreaContextView } from "react-native-safe-area-context";
import { submitReport, testBackend } from "../../services/api";

export default function ReportScreen() {
  useEffect(() => {
    testBackend()
      .then((data) => {
        console.log("BACKEND RESPONSE:", data);

        if (data.success) {
          Alert.alert(
            "Connected!",
            "React Native → Node.js → MySQL is working!",
          );
        }
      })
      .catch((error) => {
        console.error("BACKEND ERROR:", error);

        Alert.alert("Connection Failed", "Could not connect to the backend.");
      });
  }, []);

  const [selectedIssue, setSelectedIssue] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState("Zone 1");
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 8, 30));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedWasteType, setSelectedWasteType] = useState("General Waste");

  // ==========================================
  // DEFAULT MAP LOCATION
  // ==========================================

  const [location, setLocation] = useState({
    latitude: 12.8797,
    longitude: 121.774,
  });

  const [submitting, setSubmitting] = useState(false);

  const issues = [
    "Missed Collection",
    "Delayed Collection",
    "Collection Not Completed",
    "Schedule Change",
  ];

  // ==========================================
  // SELECT LOCATION FROM MAP
  // ==========================================

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    setLocation({
      latitude,
      longitude,
    });
  };

  // ==========================================
  // TAKE PHOTO
  // ==========================================

  const handleTakePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Camera Permission",
          "Camera permission is required to take a photo.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Camera error:", error);

      Alert.alert(
        "Camera Error",
        "Unable to open the camera. Please try again.",
      );
    }
  };

  // ==========================================
  // DATE
  // ==========================================

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);

    if (date) {
      setSelectedDate(date);
    }
  };

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // ==========================================
  // SUBMIT REPORT
  // ==========================================

  const handleSubmit = async () => {
    // VALIDATE ISSUE
    if (!selectedIssue) {
      Alert.alert("Missing Information", "Please select a collection issue.");
      return;
    }

    // VALIDATE DESCRIPTION
    if (!description.trim()) {
      Alert.alert(
        "Missing Information",
        "Please describe the collection issue.",
      );
      return;
    }

    try {
      setSubmitting(true);

      // ==========================================
      // CREATE REPORT DATA
      // ==========================================

      const collectionUpdate = {
        issue: selectedIssue,
        description: description.trim(),

        // Save the local photo URI for now.
        // Actual image upload can be added later.
        photo: photo,

        latitude: location.latitude,
        longitude: location.longitude,

        // Use selected area
        area: selectedArea,

        // Use selected date
        collectionDate: formattedDate,

        // Current scheduled collection time
        collectionTime: "7:00 AM - 10:00 AM",

        // Use selected waste type
        wasteType: selectedWasteType,

        status: "Reported",
      };

      console.log("SUBMITTING REPORT:", collectionUpdate);

      // ==========================================
      // SEND TO NODE.JS + MYSQL
      // ==========================================

      const result = await submitReport(collectionUpdate);

      console.log("REPORT RESPONSE:", result);

      // ==========================================
      // SUCCESS
      // ==========================================

      if (result.success) {
        Alert.alert(
          "Report Submitted",
          "Your collection issue has been successfully submitted.",
        );

        // Clear form
        setSelectedIssue("");
        setDescription("");
        setPhoto(null);
      }
    } catch (error) {
      console.error("Report submission error:", error);

      Alert.alert(
        "Submission Failed",
        "Unable to save your collection issue. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <SafeAreaContextView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Collection Update</Text>

            <Text style={styles.headerSubtitle}>
              Report an issue with your scheduled collection
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>!</Text>
          </View>
        </View>

        {/* INFORMATION CARD */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Having a collection issue?</Text>

            <Text style={styles.infoText}>
              Let us know if your scheduled garbage collection was missed,
              delayed, or changed.
            </Text>
          </View>
        </View>

        {/* CURRENT COLLECTION */}

        <Text style={styles.sectionTitle}>Current Collection</Text>

        {/* AREA */}

        <Text style={styles.label}>Collection Area & Date/Time</Text>

        <View style={styles.inputBox}>
          <Text style={styles.inputIcon}>📍</Text>

          <View style={styles.areaPickerContainer}>
            <Picker
              selectedValue={selectedArea}
              onValueChange={(itemValue) => setSelectedArea(itemValue)}
              mode="dropdown"
              style={styles.areaPicker}
              dropdownIconColor="#102A43"
            >
              <Picker.Item label="Zone 1 - Residential Area" value="Zone 1" />
              <Picker.Item label="Zone 2 - Residential Area" value="Zone 2" />
              <Picker.Item label="Zone 3 - Residential Area" value="Zone 3" />
              <Picker.Item label="Zone 4 - Residential Area" value="Zone 4" />
              <Picker.Item label="Zone 5 - Residential Area" value="Zone 5" />
            </Picker>
          </View>
        </View>

        {/* DATE */}

        <TouchableOpacity
          style={styles.inputBox}
          onPress={() => setShowDatePicker(true)}
          disabled={submitting}
        >
          <Text style={styles.inputIcon}>📅</Text>

          <View style={styles.dateContent}>
            <Text style={styles.inputMainText}>{formattedDate}</Text>

            <Text style={styles.inputSubText}>
              Tap to select collection date
            </Text>
          </View>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="calendar"
            onChange={handleDateChange}
          />
        )}

        {/* WASTE TYPE */}

        <Text style={styles.label}>Waste Type</Text>

        <View style={styles.inputBox}>
          <Text style={styles.inputIcon}>♻</Text>

          <Picker
            selectedValue={selectedWasteType}
            onValueChange={(itemValue) => setSelectedWasteType(itemValue)}
            mode="dropdown"
            style={styles.wasteTypePicker}
            dropdownIconColor="#102A43"
          >
            <Picker.Item label="General Waste" value="General Waste" />
            <Picker.Item label="Recyclable Waste" value="Recyclable Waste" />
            <Picker.Item
              label="Non-Biodegradable Waste"
              value="Non-Biodegradable Waste"
            />
          </Picker>
        </View>

        {/* ISSUE */}

        <Text style={styles.sectionTitle}>Collection Issue</Text>

        <Text style={styles.smallDescription}>
          Select the issue that best describes your collection status.
        </Text>

        <View style={styles.issueContainer}>
          {issues.map((issue) => (
            <TouchableOpacity
              key={issue}
              style={[
                styles.issueButton,
                selectedIssue === issue && styles.issueButtonSelected,
              ]}
              onPress={() => setSelectedIssue(issue)}
              disabled={submitting}
            >
              <View
                style={[
                  styles.radio,
                  selectedIssue === issue && styles.radioSelected,
                ]}
              >
                {selectedIssue === issue && <View style={styles.radioDot} />}
              </View>

              <Text
                style={[
                  styles.issueText,
                  selectedIssue === issue && styles.issueTextSelected,
                ]}
              >
                {issue}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* DESCRIPTION */}

        <Text style={styles.label}>Additional Details</Text>

        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe the collection issue..."
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
          editable={!submitting}
        />

        <Text style={styles.helperText}>
          Example: The collection vehicle has not arrived during the scheduled
          collection period.
        </Text>

        {/* PHOTO */}

        <Text style={styles.label}>Photo Evidence</Text>

        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handleTakePhoto}
          disabled={submitting}
        >
          <Text style={styles.cameraIcon}>📷</Text>

          <View style={styles.cameraContent}>
            <Text style={styles.cameraTitle}>
              {photo ? "Photo Captured" : "Take Photo"}
            </Text>

            <Text style={styles.cameraSubtitle}>
              {photo
                ? "Garbage collection issue photo attached"
                : "Take a photo of the collection issue"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* PHOTO PREVIEW */}

        {photo && (
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photo }} style={styles.photoPreview} />

            <TouchableOpacity
              style={styles.retakeButton}
              onPress={handleTakePhoto}
              disabled={submitting}
            >
              <Text style={styles.retakeText}>📷 Retake Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MAP */}

        <Text style={styles.label}>Collection Location</Text>

        <Text style={styles.mapDescription}>
          Tap anywhere on the map to select the exact location of the collection
          issue.
        </Text>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 5,
              longitudeDelta: 5,
            }}
            onPress={handleMapPress}
          >
            <Marker
              coordinate={location}
              title="Collection Issue"
              description="Selected collection location"
            />
          </MapView>
        </View>

        {/* SELECTED LOCATION */}

        <View style={styles.selectedLocationCard}>
          <View style={styles.selectedLocationIcon}>
            <Text style={styles.selectedLocationIconText}>📍</Text>
          </View>

          <View style={styles.selectedLocationContent}>
            <Text style={styles.selectedLocationTitle}>Selected Location</Text>

            <Text style={styles.selectedLocationText}>
              Latitude: {location.latitude.toFixed(6)}
            </Text>

            <Text style={styles.selectedLocationText}>
              Longitude: {location.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        {/* SUBMIT */}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedIssue || !description.trim() || submitting) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedIssue || !description.trim() || submitting}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />

              <Text style={styles.submitText}>Saving Update...</Text>
            </>
          ) : (
            <>
              <Text style={styles.submitIcon}>✓</Text>

              <Text style={styles.submitText}>Submit Collection Update</Text>
            </>
          )}
        </TouchableOpacity>

        {/* WHAT HAPPENS NEXT */}

        <Text style={styles.sectionTitle}>What Happens Next?</Text>

        <View style={styles.processCard}>
          {/* STEP 1 */}

          <View style={styles.processStep}>
            <View style={styles.processCircle}>
              <Text style={styles.processNumber}>1</Text>
            </View>

            <View style={styles.processContent}>
              <Text style={styles.processTitle}>Update Submitted</Text>

              <Text style={styles.processDescription}>
                Your collection issue will be recorded in the system.
              </Text>
            </View>
          </View>

          <View style={styles.processLine} />

          {/* STEP 2 */}

          <View style={styles.processStep}>
            <View style={styles.processCircle}>
              <Text style={styles.processNumber}>2</Text>
            </View>

            <View style={styles.processContent}>
              <Text style={styles.processTitle}>
                Collection Personnel Notified
              </Text>

              <Text style={styles.processDescription}>
                Authorized personnel can review the reported collection issue.
              </Text>
            </View>
          </View>

          <View style={styles.processLine} />

          {/* STEP 3 */}

          <View style={styles.processStep}>
            <View style={styles.processCircle}>
              <Text style={styles.processNumber}>3</Text>
            </View>

            <View style={styles.processContent}>
              <Text style={styles.processTitle}>Collection Status Updated</Text>

              <Text style={styles.processDescription}>
                The collection status can be updated and monitored through the
                system.
              </Text>
            </View>
          </View>
        </View>

        {/* MONITORING NOTICE */}

        <View style={styles.monitoringCard}>
          <View style={styles.monitoringIcon}>
            <Text style={styles.monitoringIconText}>●</Text>
          </View>

          <View style={styles.monitoringContent}>
            <Text style={styles.monitoringTitle}>Monitor Your Collection</Text>

            <Text style={styles.monitoringText}>
              After submitting an update, check the Monitoring tab to view the
              latest collection status.
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaContextView>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#102A43",
  },

  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },

  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  headerIconText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#087F5B",
  },

  /* INFORMATION */

  infoCard: {
    marginHorizontal: 18,
    marginTop: 16,
    padding: 14,
    backgroundColor: "#E8F7F0",
    borderRadius: 15,
    flexDirection: "row",
  },

  infoIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  infoIconText: {
    color: "#087F5B",
    fontSize: 17,
    fontWeight: "900",
  },

  infoContent: {
    flex: 1,
    marginLeft: 10,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#102A43",
  },

  infoText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#64748B",
    marginTop: 3,
  },

  /* SECTION */

  sectionTitle: {
    marginHorizontal: 18,
    marginTop: 22,
    marginBottom: 8,
    fontSize: 19,
    fontWeight: "800",
    color: "#102A43",
  },

  smallDescription: {
    marginHorizontal: 18,
    marginBottom: 10,
    fontSize: 10,
    lineHeight: 15,
    color: "#64748B",
  },

  /* LABEL */

  label: {
    marginHorizontal: 18,
    marginTop: 20,
    marginBottom: 7,
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  /* COLLECTION INFORMATION */

  inputBox: {
    marginHorizontal: 18,
    marginBottom: 12,
    minHeight: 62,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  inputIcon: {
    fontSize: 20,
    marginRight: 11,
  },

  inputMainText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#102A43",
  },

  inputSubText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  /* ISSUE */

  issueContainer: {
    marginHorizontal: 18,
  },

  issueButton: {
    minHeight: 49,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  issueButtonSelected: {
    backgroundColor: "#E8F7F0",
    borderColor: "#087F5B",
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  radioSelected: {
    borderColor: "#087F5B",
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#087F5B",
  },

  issueText: {
    fontSize: 12,
    color: "#475569",
  },

  issueTextSelected: {
    color: "#087F5B",
    fontWeight: "700",
  },

  /* DESCRIPTION */

  descriptionInput: {
    marginHorizontal: 18,
    height: 115,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingTop: 13,
    fontSize: 12,
    color: "#102A43",
  },

  helperText: {
    marginHorizontal: 18,
    marginTop: 6,
    fontSize: 9,
    lineHeight: 14,
    color: "#94A3B8",
  },

  /* CAMERA */

  cameraButton: {
    marginHorizontal: 18,
    minHeight: 65,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  cameraIcon: {
    fontSize: 25,
    marginRight: 12,
  },

  cameraContent: {
    flex: 1,
  },

  cameraTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#102A43",
  },

  cameraSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  photoPreviewContainer: {
    marginHorizontal: 18,
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  photoPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
  },

  retakeButton: {
    marginTop: 8,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
  },

  retakeText: {
    color: "#087F5B",
    fontSize: 11,
    fontWeight: "800",
  },

  /* MAP */

  mapDescription: {
    marginHorizontal: 18,
    marginBottom: 8,
    fontSize: 10,
    lineHeight: 15,
    color: "#64748B",
  },

  mapContainer: {
    marginHorizontal: 18,
    height: 230,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  /* SELECTED LOCATION */

  selectedLocationCard: {
    marginHorizontal: 18,
    marginTop: 10,
    padding: 12,
    backgroundColor: "#E8F7F0",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  selectedLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  selectedLocationIconText: {
    fontSize: 18,
  },

  selectedLocationContent: {
    flex: 1,
    marginLeft: 10,
  },

  selectedLocationTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#102A43",
    marginBottom: 3,
  },

  selectedLocationText: {
    fontSize: 9,
    color: "#64748B",
    lineHeight: 14,
  },

  /* SUBMIT */

  submitButton: {
    marginHorizontal: 18,
    marginTop: 20,
    height: 52,
    borderRadius: 13,
    backgroundColor: "#087F5B",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  submitButtonDisabled: {
    backgroundColor: "#A7CFC0",
  },

  submitIcon: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginRight: 8,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },

  /* PROCESS */

  processCard: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  processStep: {
    flexDirection: "row",
    alignItems: "center",
  },

  processCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
  },

  processNumber: {
    color: "#087F5B",
    fontSize: 12,
    fontWeight: "900",
  },

  processContent: {
    flex: 1,
    marginLeft: 11,
  },

  processTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#102A43",
  },

  processDescription: {
    fontSize: 10,
    color: "#64748B",
    lineHeight: 15,
    marginTop: 3,
  },

  processLine: {
    width: 2,
    height: 20,
    backgroundColor: "#D6E8E0",
    marginLeft: 15,
    marginVertical: 4,
  },

  /* MONITORING */

  monitoringCard: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
  },

  monitoringIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F7F0",
    justifyContent: "center",
    alignItems: "center",
  },

  monitoringIconText: {
    color: "#087F5B",
    fontSize: 12,
  },

  monitoringContent: {
    flex: 1,
    marginLeft: 10,
  },

  monitoringTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#102A43",
  },

  monitoringText: {
    fontSize: 10,
    color: "#64748B",
    lineHeight: 15,
    marginTop: 3,
  },

  /* PICKER */

  areaPickerContainer: {
    flex: 1,
  },

  areaPicker: {
    width: "100%",
    height: 55,
    color: "#102A43",
  },

  /* DATE */

  dateContent: {
    flex: 1,
  },

  /* WASTE TYPE */

  wasteTypePicker: {
    width: "90%",
    height: 55,
    color: "#102A43",
  },
});
