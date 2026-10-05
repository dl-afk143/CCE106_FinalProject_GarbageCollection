import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

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

import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  getPlaceDetails,
  searchPlaces,
  submitReport,
  testBackend,
} from "../../services/api";

/* =========================================================
   COLORS
========================================================= */

const GREEN = "#087F5B";
const GREEN_DARK = "#056B4C";
const GREEN_LIGHT = "#E8F7F1";

const BLUE = "#2563EB";

const RED = "#DC2626";
const RED_LIGHT = "#FEF2F2";

const BACKGROUND = "#F5F7FA";
const TEXT = "#17202A";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const WHITE = "#FFFFFF";

/* =========================================================
   DEFAULT MAP LOCATION
========================================================= */

const DEFAULT_LOCATION = {
  latitude: 12.8797,
  longitude: 121.774,
};

/* =========================================================
   COLLECTION ISSUES
========================================================= */

const issues = [
  {
    label: "Missed Collection",
    description: "The garbage truck did not collect the waste.",
    icon: "alert-circle-outline",
  },
  {
    label: "Delayed Collection",
    description: "Collection arrived later than the scheduled time.",
    icon: "time-outline",
  },
  {
    label: "Collection Not Completed",
    description: "Only some of the waste was collected.",
    icon: "close-circle-outline",
  },
  {
    label: "Schedule Change",
    description: "The collection schedule has changed.",
    icon: "calendar-outline",
  },
];

/* =========================================================
   GOOGLE PLACES TYPES
========================================================= */

type PlaceSuggestion = {
  placePrediction?: {
    placeId?: string;

    text?: {
      text?: string;
    };

    structuredFormat?: {
      mainText?: {
        text?: string;
      };

      secondaryText?: {
        text?: string;
      };
    };
  };
};

type SelectedPlace = {
  placeId: string;
  name: string;
  address: string;
};

/* =========================================================
   SCREEN
========================================================= */

export default function ReportScreen() {
  /* =======================================================
     BASIC REPORT INFORMATION
  ======================================================= */

  const [selectedIssue, setSelectedIssue] = useState("");

  const [description, setDescription] = useState("");

  const [photo, setPhoto] = useState<string | null>(null);

  /* =======================================================
     AREA
  ======================================================= */

  const [selectedArea, setSelectedArea] = useState("Zone 1");

  /* =======================================================
     DATE
  ======================================================= */

  const [selectedDate, setSelectedDate] = useState(new Date(2026, 8, 30));

  const [showDatePicker, setShowDatePicker] = useState(false);

  /* =======================================================
     WASTE TYPE
  ======================================================= */

  const [selectedWasteType, setSelectedWasteType] = useState("General Waste");

  /* =======================================================
     LOCATION
  ======================================================= */

  const [location, setLocation] = useState(DEFAULT_LOCATION);

  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null,
  );

  /* =======================================================
     GOOGLE PLACES SEARCH
  ======================================================= */

  const [placeQuery, setPlaceQuery] = useState("");

  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>(
    [],
  );

  const [searchingPlaces, setSearchingPlaces] = useState(false);

  const [selectingPlace, setSelectingPlace] = useState(false);

  /* =======================================================
     MAP
  ======================================================= */

  const mapRef = useRef<MapView | null>(null);

  /* =======================================================
     SUBMIT
  ======================================================= */

  const [submitting, setSubmitting] = useState(false);

  /* =======================================================
     GOOGLE PLACES SESSION
  ======================================================= */

  const placesSessionToken = useRef(
    `gc-${Date.now()}-${Math.random().toString(36).substring(2)}`,
  );

  /* =========================================================
     CHECK BACKEND
  ========================================================= */

  useEffect(() => {
    async function checkBackend() {
      try {
        await testBackend();

        console.log("BACKEND CONNECTED");
      } catch (error) {
        console.log("BACKEND CONNECTION FAILED:", error);
      }
    }

    checkBackend();
  }, []);

  /* =========================================================
     GOOGLE PLACES AUTOCOMPLETE

     IMPORTANT:
     This does NOT call Google directly.

     React Native
          ↓
     Node.js
          ↓
     Google Places API
  ========================================================= */

  useEffect(() => {
    const query = placeQuery.trim();

    if (query.length < 2) {
      setPlaceSuggestions([]);
      setSearchingPlaces(false);

      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setSearchingPlaces(true);

        const suggestions = await searchPlaces(query);

        if (!cancelled) {
          setPlaceSuggestions(suggestions);
        }
      } catch (error) {
        if (!cancelled) {
          setPlaceSuggestions([]);

          console.log("GOOGLE PLACES SEARCH ERROR:", error);
        }
      } finally {
        if (!cancelled) {
          setSearchingPlaces(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;

      clearTimeout(timer);
    };
  }, [placeQuery]);

  /* =========================================================
     SELECT GOOGLE PLACE
  ========================================================= */

  const handleSelectPlace = async (suggestion: PlaceSuggestion) => {
    const prediction = suggestion.placePrediction;

    const placeId = prediction?.placeId;

    if (!placeId) {
      Alert.alert("Place Error", "The selected place could not be identified.");

      return;
    }

    try {
      setSelectingPlace(true);

      setPlaceSuggestions([]);

      /*
       * Get Google Place Details
       * through our Node.js backend.
       */

      const place = await getPlaceDetails(placeId);

      if (
        !place?.location ||
        typeof place.location.latitude !== "number" ||
        typeof place.location.longitude !== "number"
      ) {
        throw new Error("Google did not return coordinates for this place.");
      }

      const latitude = place.location.latitude;

      const longitude = place.location.longitude;

      const placeName =
        place?.displayName?.text ||
        prediction?.structuredFormat?.mainText?.text ||
        prediction?.text?.text ||
        "Selected Place";

      const placeAddress =
        place?.formattedAddress ||
        prediction?.structuredFormat?.secondaryText?.text ||
        "Address unavailable";

      /* Save selected place */

      setSelectedPlace({
        placeId,
        name: placeName,
        address: placeAddress,
      });

      /* Save coordinates */

      setLocation({
        latitude,
        longitude,
      });

      /* Put selected name in search box */

      setPlaceQuery(placeName);

      /* Move map */

      const newRegion: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };

      setTimeout(() => {
        mapRef.current?.animateToRegion(newRegion, 700);
      }, 100);

      /* Start a new Places session */

      placesSessionToken.current = `gc-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}`;
    } catch (error) {
      Alert.alert(
        "Place Selection Failed",
        error instanceof Error ? error.message : "Unable to select this place.",
      );
    } finally {
      setSelectingPlace(false);
    }
  };

  /* =========================================================
     CLEAR PLACE
  ========================================================= */

  const clearSelectedPlace = () => {
    setPlaceQuery("");

    setPlaceSuggestions([]);

    setSelectedPlace(null);

    setLocation(DEFAULT_LOCATION);

    placesSessionToken.current = `gc-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}`;
  };

  /* =========================================================
     CAMERA
  ========================================================= */

  const openCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Camera Permission",
          "Please allow camera access to take a photo.",
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
    } catch {
      Alert.alert("Camera Error", "Unable to open the camera.");
    }
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  /* =========================================================
     SUBMIT REPORT
  ========================================================= */

  const handleSubmit = async () => {
    /* -------------------------------------------------------
       CHECK ISSUE
    ------------------------------------------------------- */

    if (!selectedIssue) {
      Alert.alert("Missing Information", "Please select a collection issue.");

      return;
    }

    /* -------------------------------------------------------
       CHECK DESCRIPTION
    ------------------------------------------------------- */

    if (!description.trim()) {
      Alert.alert(
        "Missing Information",
        "Please describe the collection issue.",
      );

      return;
    }

    /* -------------------------------------------------------
       CHECK PLACE
    ------------------------------------------------------- */

    if (!selectedPlace) {
      Alert.alert(
        "Location Required",
        "Please search for and select the actual collection location from Google Maps.",
      );

      return;
    }

    try {
      setSubmitting(true);

      /* -----------------------------------------------------
         GET LOGGED-IN USER
      ----------------------------------------------------- */

      const storedUser = await AsyncStorage.getItem("loggedInUser");

      if (!storedUser) {
        Alert.alert(
          "Login Required",
          "Please log in before submitting a report.",
          [
            {
              text: "Login",
              onPress: () => router.replace("/login"),
            },
          ],
        );

        return;
      }

      /* -----------------------------------------------------
         PARSE USER
      ----------------------------------------------------- */

      let user;

      try {
        user = JSON.parse(storedUser);
      } catch {
        await AsyncStorage.removeItem("loggedInUser");

        Alert.alert(
          "Session Error",
          "Your login session is invalid. Please log in again.",
          [
            {
              text: "Login",
              onPress: () => router.replace("/login"),
            },
          ],
        );

        return;
      }

      /* -----------------------------------------------------
         CHECK USER ID
      ----------------------------------------------------- */

      if (!user?.id) {
        Alert.alert(
          "Login Required",
          "Your account information could not be found. Please log in again.",
          [
            {
              text: "Login",
              onPress: () => router.replace("/login"),
            },
          ],
        );

        return;
      }

      /* -----------------------------------------------------
         CREATE REPORT OBJECT
      ----------------------------------------------------- */

      const collectionUpdate = {
        userId: Number(user.id),

        issue: selectedIssue,

        description: description.trim(),

        photo,

        latitude: location.latitude,

        longitude: location.longitude,

        placeName: selectedPlace.name,

        placeAddress: selectedPlace.address,

        area: selectedArea,

        collectionDate: formatDate(selectedDate),

        collectionTime: "7:00 AM - 10:00 AM",

        wasteType: selectedWasteType,

        status: "Reported",
      };

      console.log("SUBMITTING REPORT:", collectionUpdate);

      /* -----------------------------------------------------
         SEND TO NODE.JS
      ----------------------------------------------------- */

      const result = await submitReport(collectionUpdate);

      if (!result?.success) {
        throw new Error(result?.message || "Unable to submit your report.");
      }

      /* -----------------------------------------------------
         SUCCESS
      ----------------------------------------------------- */

      Alert.alert(
        "Report Submitted",
        "Your collection issue has been submitted successfully.",
        [
          {
            text: "View Reports",

            onPress: () => router.push("/my-reports"),
          },

          {
            text: "Done",

            onPress: () => {
              /* Reset form */

              setSelectedIssue("");

              setDescription("");

              setPhoto(null);

              setSelectedArea("Zone 1");

              setSelectedWasteType("General Waste");

              setSelectedDate(new Date(2026, 8, 30));

              setPlaceQuery("");

              setPlaceSuggestions([]);

              setSelectedPlace(null);

              setLocation(DEFAULT_LOCATION);

              router.replace("/dashboard");
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Submission Failed",

        error instanceof Error
          ? error.message
          : "Unable to submit your report. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={TEXT} />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Report an Issue</Text>

            <Text style={styles.headerSubtitle}>
              Submit a garbage collection concern
            </Text>
          </View>
        </View>

        {/* ===================================================
            INFO CARD
        =================================================== */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="megaphone-outline" size={24} color={GREEN} />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Collection Update</Text>

            <Text style={styles.infoText}>
              Tell us about a missed, delayed, or incomplete garbage collection.
            </Text>
          </View>
        </View>

        {/* ===================================================
            CURRENT COLLECTION
        =================================================== */}

        <Text style={styles.sectionTitle}>Current Collection</Text>

        <View style={styles.collectionCard}>
          <View style={styles.collectionTop}>
            <View style={styles.collectionIcon}>
              <Ionicons name="trash-outline" size={24} color={GREEN} />
            </View>

            <View style={styles.collectionInfo}>
              <Text style={styles.collectionLabel}>Garbage Collection</Text>

              <Text style={styles.collectionType}>{selectedWasteType}</Text>
            </View>

            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.collectionDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={18} color={GREEN} />

              <View>
                <Text style={styles.detailLabel}>Area</Text>

                <Text style={styles.detailValue}>{selectedArea}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={18} color={GREEN} />

              <View>
                <Text style={styles.detailLabel}>Collection Time</Text>

                <Text style={styles.detailValue}>7:00 AM - 10:00 AM</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===================================================
            COLLECTION AREA
        =================================================== */}

        <Text style={styles.sectionTitle}>Collection Area</Text>

        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <View style={styles.smallIconBox}>
              <Ionicons name="location-outline" size={20} color={GREEN} />
            </View>

            <View>
              <Text style={styles.inputTitle}>Select your zone</Text>

              <Text style={styles.inputSubtitle}>
                Choose the area where the issue occurred
              </Text>
            </View>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedArea}
              onValueChange={(value) => setSelectedArea(value)}
              style={styles.picker}
            >
              <Picker.Item label="Zone 1" value="Zone 1" />

              <Picker.Item label="Zone 2" value="Zone 2" />

              <Picker.Item label="Zone 3" value="Zone 3" />

              <Picker.Item label="Zone 4" value="Zone 4" />

              <Picker.Item label="Zone 5" value="Zone 5" />
            </Picker>
          </View>
        </View>

        {/* ===================================================
            COLLECTION DATE
        =================================================== */}

        <Text style={styles.sectionTitle}>Collection Date</Text>

        <TouchableOpacity
          style={styles.inputCard}
          activeOpacity={0.8}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.dateRow}>
            <View style={styles.smallIconBox}>
              <Ionicons name="calendar-outline" size={20} color={BLUE} />
            </View>

            <View style={styles.dateTextContainer}>
              <Text style={styles.inputTitle}>Scheduled Date</Text>

              <Text style={styles.dateValue}>{formatDate(selectedDate)}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={MUTED} />
          </View>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);

              if (date) {
                setSelectedDate(date);
              }
            }}
          />
        )}

        {/* ===================================================
            WASTE TYPE
        =================================================== */}

        <Text style={styles.sectionTitle}>Waste Type</Text>

        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <View style={styles.smallIconBox}>
              <Ionicons name="leaf-outline" size={20} color={GREEN} />
            </View>

            <View>
              <Text style={styles.inputTitle}>Type of waste</Text>

              <Text style={styles.inputSubtitle}>
                Select the type of waste involved
              </Text>
            </View>
          </View>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedWasteType}
              onValueChange={(value) => setSelectedWasteType(value)}
              style={styles.picker}
            >
              <Picker.Item label="General Waste" value="General Waste" />

              <Picker.Item label="Recyclable Waste" value="Recyclable Waste" />

              <Picker.Item
                label="Non-Biodegradable Waste"
                value="Non-Biodegradable Waste"
              />
            </Picker>
          </View>
        </View>

        {/* ===================================================
            COLLECTION ISSUE
        =================================================== */}

        <Text style={styles.sectionTitle}>Collection Issue</Text>

        <Text style={styles.sectionDescription}>
          What happened with your garbage collection?
        </Text>

        {issues.map((issue) => {
          const selected = selectedIssue === issue.label;

          return (
            <TouchableOpacity
              key={issue.label}
              style={[styles.issueCard, selected && styles.issueCardSelected]}
              activeOpacity={0.8}
              onPress={() => setSelectedIssue(issue.label)}
            >
              <View
                style={[styles.issueIcon, selected && styles.issueIconSelected]}
              >
                <Ionicons
                  name={issue.icon as any}
                  size={22}
                  color={selected ? GREEN : MUTED}
                />
              </View>

              <View style={styles.issueContent}>
                <Text
                  style={[
                    styles.issueTitle,
                    selected && styles.issueTitleSelected,
                  ]}
                >
                  {issue.label}
                </Text>

                <Text style={styles.issueDescription}>{issue.description}</Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  selected && styles.radioOuterSelected,
                ]}
              >
                {selected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ===================================================
            DESCRIPTION
        =================================================== */}

        <Text style={styles.sectionTitle}>Description</Text>

        <View style={styles.descriptionCard}>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe what happened..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.characterCount}>
            {description.length} characters
          </Text>
        </View>

        {/* ===================================================
            PHOTO EVIDENCE
        =================================================== */}

        <Text style={styles.sectionTitle}>Photo Evidence</Text>

        <View style={styles.photoCard}>
          {photo ? (
            <>
              <Image source={{ uri: photo }} style={styles.photoPreview} />

              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={openCamera}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={19} color={GREEN} />

                  <Text style={styles.photoActionText}>Retake Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoActionButton, styles.removePhotoButton]}
                  onPress={() => setPhoto(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={19} color={RED} />

                  <Text
                    style={[styles.photoActionText, styles.removePhotoText]}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.photoEmpty}
              activeOpacity={0.8}
              onPress={openCamera}
            >
              <View style={styles.photoIcon}>
                <Ionicons name="camera-outline" size={30} color={GREEN} />
              </View>

              <Text style={styles.photoTitle}>Take a Photo</Text>

              <Text style={styles.photoSubtitle}>
                Add a photo to help us understand the issue
              </Text>

              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={18} color={WHITE} />

                <Text style={styles.cameraButtonText}>Open Camera</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ===================================================
            COLLECTION LOCATION
        =================================================== */}

        <Text style={styles.sectionTitle}>Collection Location</Text>

        <Text style={styles.sectionDescription}>
          Search for the actual place where the collection issue occurred.
        </Text>

        {/* ===================================================
            PLACE SEARCH
        =================================================== */}

        <View style={styles.placeSearchCard}>
          <View style={styles.placeSearchRow}>
            <Ionicons name="search-outline" size={21} color={MUTED} />

            <TextInput
              style={styles.placeSearchInput}
              placeholder="Search a place or address"
              placeholderTextColor="#9CA3AF"
              value={placeQuery}
              onChangeText={(text) => {
                setPlaceQuery(text);

                if (selectedPlace && text !== selectedPlace.name) {
                  setSelectedPlace(null);
                }
              }}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />

            {placeQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSelectedPlace}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={21} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* SEARCHING */}

          {searchingPlaces && (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={GREEN} />

              <Text style={styles.searchingText}>Searching Google Maps...</Text>
            </View>
          )}

          {/* SUGGESTIONS */}

          {!searchingPlaces && placeSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {placeSuggestions.map((suggestion, index) => {
                const prediction = suggestion.placePrediction;

                if (!prediction) {
                  return null;
                }

                const mainText =
                  prediction.structuredFormat?.mainText?.text ||
                  prediction.text?.text ||
                  "Place";

                const secondaryText =
                  prediction.structuredFormat?.secondaryText?.text || "";

                return (
                  <TouchableOpacity
                    key={prediction.placeId || `${mainText}-${index}`}
                    style={styles.suggestionItem}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPlace(suggestion)}
                  >
                    <View style={styles.suggestionIcon}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={GREEN}
                      />
                    </View>

                    <View style={styles.suggestionTextContainer}>
                      <Text style={styles.suggestionMain} numberOfLines={1}>
                        {mainText}
                      </Text>

                      {secondaryText ? (
                        <Text
                          style={styles.suggestionSecondary}
                          numberOfLines={2}
                        >
                          {secondaryText}
                        </Text>
                      ) : null}
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ===================================================
            SELECTING PLACE
        =================================================== */}

        {selectingPlace && (
          <View style={styles.selectingPlaceCard}>
            <ActivityIndicator size="small" color={GREEN} />

            <Text style={styles.selectingPlaceText}>Loading place...</Text>
          </View>
        )}

        {/* ===================================================
            GOOGLE MAP
        =================================================== */}

        <View style={styles.mapCard}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            mapType="standard"
            initialRegion={{
              latitude: DEFAULT_LOCATION.latitude,
              longitude: DEFAULT_LOCATION.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            zoomEnabled
            scrollEnabled
            rotateEnabled
            pitchEnabled
            showsCompass
            showsScale
            showsBuildings
            showsTraffic={false}
            showsUserLocation={false}
          >
            {selectedPlace && (
              <Marker
                coordinate={location}
                title={selectedPlace.name}
                description={selectedPlace.address}
                pinColor={GREEN}
              />
            )}
          </MapView>

          {/* MAP LABEL */}

          <View pointerEvents="none" style={styles.mapTopLabel}>
            <View style={styles.mapTopIcon}>
              <Ionicons name="logo-google" size={17} color={GREEN} />
            </View>

            <Text style={styles.mapTopText}>Google Maps</Text>
          </View>

          {/* MAP INSTRUCTION */}

          {!selectedPlace && (
            <View pointerEvents="none" style={styles.mapInstruction}>
              <Ionicons name="search-outline" size={18} color={GREEN} />

              <Text style={styles.mapInstructionText}>
                Search above to select a real place
              </Text>
            </View>
          )}
        </View>

        {/* ===================================================
            SELECTED PLACE
        =================================================== */}

        {selectedPlace ? (
          <View style={styles.selectedPlaceCard}>
            <View style={styles.selectedPlaceIcon}>
              <Ionicons name="location" size={22} color={GREEN} />
            </View>

            <View style={styles.selectedPlaceContent}>
              <View style={styles.selectedPlaceTitleRow}>
                <Text style={styles.selectedPlaceTitle} numberOfLines={2}>
                  {selectedPlace.name}
                </Text>

                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>SELECTED</Text>
                </View>
              </View>

              <Text style={styles.selectedPlaceAddress} numberOfLines={3}>
                {selectedPlace.address}
              </Text>

              <View style={styles.coordinatesRow}>
                <Text style={styles.locationCoordinates}>
                  {location.latitude.toFixed(6)}
                </Text>

                <Text style={styles.coordinateSeparator}>•</Text>

                <Text style={styles.locationCoordinates}>
                  {location.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons name="search-outline" size={21} color={GREEN} />
            </View>

            <View style={styles.locationContent}>
              <Text style={styles.locationTitle}>No place selected</Text>

              <Text style={styles.locationCoordinates}>
                Search above and select a Google Maps place.
              </Text>
            </View>
          </View>
        )}

        {/* ===================================================
            SUBMIT
        =================================================== */}

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={WHITE} />
          ) : (
            <>
              <Ionicons name="send-outline" size={21} color={WHITE} />

              <Text style={styles.submitButtonText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          Your report will be reviewed by the garbage collection team.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: TEXT,
  },

  headerSubtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 3,
  },

  /* INFO */

  infoCard: {
    flexDirection: "row",
    backgroundColor: GREEN_LIGHT,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#D1F0E4",
  },

  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 4,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },

  /* SECTIONS */

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 8,
    marginTop: 5,
  },

  sectionDescription: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 19,
    marginBottom: 12,
  },

  /* COLLECTION */

  collectionCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: BORDER,
  },

  collectionTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  collectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  collectionInfo: {
    flex: 1,
  },

  collectionLabel: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 3,
  },

  collectionType: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },

  activeBadge: {
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  activeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: GREEN,
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 15,
  },

  collectionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  detailLabel: {
    fontSize: 11,
    color: MUTED,
    marginLeft: 8,
    marginBottom: 2,
  },

  detailValue: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT,
    marginLeft: 8,
  },

  /* INPUT CARDS */

  inputCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },

  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  smallIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  inputTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
  },

  inputSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },

  picker: {
    height: 52,
    color: TEXT,
  },

  /* DATE */

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  dateTextContainer: {
    flex: 1,
  },

  dateValue: {
    fontSize: 15,
    fontWeight: "700",
    color: GREEN,
    marginTop: 4,
  },

  /* ISSUE */

  issueCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  issueCardSelected: {
    borderColor: GREEN,
    backgroundColor: "#F3FBF8",
  },

  issueIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  issueIconSelected: {
    backgroundColor: GREEN_LIGHT,
  },

  issueContent: {
    flex: 1,
  },

  issueTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 3,
  },

  issueTitleSelected: {
    color: GREEN_DARK,
  },

  issueDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
    paddingRight: 6,
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  radioOuterSelected: {
    borderColor: GREEN,
  },

  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: GREEN,
  },

  /* DESCRIPTION */

  descriptionCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },

  descriptionInput: {
    minHeight: 125,
    fontSize: 14,
    color: TEXT,
    lineHeight: 21,
  },

  characterCount: {
    textAlign: "right",
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
  },

  /* PHOTO */

  photoCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },

  photoEmpty: {
    alignItems: "center",
    padding: 24,
  },

  photoIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  photoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },

  photoSubtitle: {
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
    marginTop: 5,
    marginBottom: 16,
  },

  cameraButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 11,
  },

  cameraButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 7,
  },

  photoPreview: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },

  photoActions: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },

  photoActionButton: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  photoActionText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },

  removePhotoButton: {
    backgroundColor: RED_LIGHT,
  },

  removePhotoText: {
    color: RED,
  },

  /* PLACE SEARCH */

  placeSearchCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    overflow: "hidden",
    zIndex: 20,
  },

  placeSearchRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  placeSearchInput: {
    flex: 1,
    height: 54,
    fontSize: 14,
    color: TEXT,
    marginLeft: 10,
  },

  searchingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  searchingText: {
    fontSize: 12,
    color: MUTED,
    marginLeft: 8,
  },

  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  suggestionItem: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F2F4",
  },

  suggestionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  suggestionTextContainer: {
    flex: 1,
    marginRight: 8,
  },

  suggestionMain: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
  },

  suggestionSecondary: {
    fontSize: 11,
    color: MUTED,
    marginTop: 3,
    lineHeight: 15,
  },

  selectingPlaceCard: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  selectingPlaceText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN_DARK,
    marginLeft: 8,
  },

  /* MAP */

  mapCard: {
    height: 300,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    position: "relative",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  mapTopLabel: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 4,
  },

  mapTopIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },

  mapTopText: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT,
  },

  mapInstruction: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 4,
  },

  mapInstructionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 7,
  },

  /* SELECTED PLACE */

  selectedPlaceCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#BDE8D8",
    marginBottom: 24,
  },

  selectedPlaceIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  selectedPlaceContent: {
    flex: 1,
  },

  selectedPlaceTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  selectedPlaceTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
    marginRight: 8,
  },

  selectedBadge: {
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },

  selectedBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: GREEN,
  },

  selectedPlaceAddress: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 17,
    marginTop: 5,
  },

  coordinatesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  coordinateSeparator: {
    color: MUTED,
    marginHorizontal: 6,
    fontSize: 11,
  },

  /* LOCATION */

  locationCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 24,
  },

  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  locationContent: {
    flex: 1,
  },

  locationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 4,
  },

  locationCoordinates: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },

  /* SUBMIT */

  submitButton: {
    height: 55,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
  },

  submitButtonDisabled: {
    opacity: 0.7,
  },

  submitButtonText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },

  bottomNote: {
    textAlign: "center",
    fontSize: 11,
    color: MUTED,
    lineHeight: 17,
    paddingHorizontal: 20,
  },
});
