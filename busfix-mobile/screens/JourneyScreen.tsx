import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

import {
  searchStops,
  findDirectJourneys,
  findAlternativeJourneys,
  getNearbyStops,
} from "../api/api";

import { getCurrentLocation } from "../utils/location";

type Props = NativeStackScreenProps<RootStackParamList, "Journey">;

type Stop = {
  stop_id: string;
  stop_name: string;
};

type DirectRoute = {
  route_id?: string;
  route_short_name?: string;
  route_name?: string;
  next_departure?: string;
  next_arrival?: string;
  upcoming_departures?: string[];
};

type AlternativeJourney = {
  [key: string]: any;
};

export default function JourneyScreen({ navigation }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [directRoutes, setDirectRoutes] = useState<
    DirectRoute[]
  >([]);

  const [alternatives, setAlternatives] = useState<
    AlternativeJourney[]
  >([]);

  const [searched, setSearched] = useState(false);

  // Stores the physical GTFS stop IDs selected through GPS.
  // This avoids having to search the stop name again.
  const [gpsOriginStopIds, setGpsOriginStopIds] =
    useState<string[]>([]);

  // ---------------------------------------
  // Use current phone location
  // ---------------------------------------
  const handleUseLocation = async () => {
    try {
      setLocationLoading(true);
      setError("");

      const location = await getCurrentLocation();

      const nearby = await getNearbyStops(
        location.latitude,
        location.longitude
      );

      if (
        !nearby.stops ||
        nearby.stops.length === 0
      ) {
        throw new Error(
          "No bus stops were found near your current location."
        );
      }

      // The backend returns nearest stops first.
      const nearestStop = nearby.stops[0];

      // Keep the actual GTFS stop ID for journey search.
      setGpsOriginStopIds([nearestStop.stop_id]);

      // Display the nearest stop name in FROM.
      setFrom(nearestStop.stop_name);

      // Clear previous results.
      setSearched(false);
      setDirectRoutes([]);
      setAlternatives([]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to get your current location."
      );
    } finally {
      setLocationLoading(false);
    }
  };

  // ---------------------------------------
  // FROM text changed
  // ---------------------------------------
  const handleFromChange = (text: string) => {
    setFrom(text);

    // Once the user manually types a new origin,
    // stop using the previous GPS-selected stop.
    setGpsOriginStopIds([]);

    setSearched(false);
    setDirectRoutes([]);
    setAlternatives([]);
    setError("");
  };

  // ---------------------------------------
  // TO text changed
  // ---------------------------------------
  const handleToChange = (text: string) => {
    setTo(text);

    setSearched(false);
    setDirectRoutes([]);
    setAlternatives([]);
    setError("");
  };

  // ---------------------------------------
  // Search journey
  // ---------------------------------------
  const handleSearch = async () => {
    if (!from.trim() || !to.trim()) {
      setError(
        "Please enter both starting point and destination."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSearched(false);
    setDirectRoutes([]);
    setAlternatives([]);

    try {
      let originStopIds: string[] = [];

      // ---------------------------------------
      // 1. Determine origin stops
      // ---------------------------------------

      // If GPS was used, use the actual nearest
      // physical GTFS stop directly.
      if (gpsOriginStopIds.length > 0) {
        originStopIds = gpsOriginStopIds;
      } else {
        // Otherwise search the typed origin.
        const originResult = await searchStops(
          from.trim()
        );

        const originStops: Stop[] =
          originResult.stops || [];

        if (originStops.length === 0) {
          throw new Error(
            `No bus stops found for "${from.trim()}".`
          );
        }

        originStopIds = originStops.map(
          (stop) => stop.stop_id
        );
      }

      // ---------------------------------------
      // 2. Search destination stops
      // ---------------------------------------

      const destinationResult =
        await searchStops(to.trim());

      const destinationStops: Stop[] =
        destinationResult.stops || [];

      if (destinationStops.length === 0) {
        throw new Error(
          `No bus stops found for "${to.trim()}".`
        );
      }

      const destinationStopIds =
        destinationStops.map(
          (stop) => stop.stop_id
        );

      // ---------------------------------------
      // 3. Try direct journeys first
      // ---------------------------------------

      const directResult =
        await findDirectJourneys(
          originStopIds,
          destinationStopIds
        );

      const routes: DirectRoute[] =
        directResult.routes || [];

      if (routes.length > 0) {
        // Sort by next departure when available.
        const sortedRoutes = [...routes].sort(
          (a, b) => {
            if (!a.next_departure) return 1;
            if (!b.next_departure) return -1;

            return a.next_departure.localeCompare(
              b.next_departure
            );
          }
        );

        setDirectRoutes(sortedRoutes);
        setSearched(true);

        return;
      }

      // ---------------------------------------
      // 4. No direct route → alternatives
      // ---------------------------------------

      const alternativeResult =
        await findAlternativeJourneys(
          originStopIds,
          destinationStopIds
        );

      setAlternatives(
        alternativeResult.journeys || []
      );

      setSearched(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while finding your journey."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>

          {/* Heading */}
          <Text style={styles.title}>
            Plan a Journey
          </Text>

          <Text style={styles.subtitle}>
            Find scheduled buses and alternative journeys.
          </Text>

          {/* Search form */}
          <View style={styles.form}>
            <Text style={styles.label}>
              FROM
            </Text>

            <TextInput
              value={from}
              onChangeText={handleFromChange}
              placeholder="Enter starting point"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              autoCapitalize="words"
            />

            {/* GPS button */}
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleUseLocation}
              disabled={locationLoading}
              activeOpacity={0.8}
            >
              {locationLoading ? (
                <ActivityIndicator
                  color="#0F766E"
                />
              ) : (
                <Text
                  style={styles.locationButtonText}
                >
                  📍 Use my current location
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>
              TO
            </Text>

            <TextInput
              value={to}
              onChangeText={handleToChange}
              placeholder="Enter destination"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={[
                styles.searchButton,
                loading &&
                  styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={styles.searchButtonText}
                >
                  Find Buses
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                Couldn't find your journey
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Direct results */}
          {searched &&
          directRoutes.length > 0 ? (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>
                Direct Buses
              </Text>

              <Text style={styles.resultsSubtitle}>
                {from} → {to}
              </Text>

              {directRoutes.map(
                (route, index) => {
                  const routeNumber =
                    route.route_short_name ||
                    route.route_id ||
                    "Bus";

                  return (
                    <View
                      key={`${routeNumber}-${index}`}
                      style={styles.routeCard}
                    >
                      <View
                        style={styles.routeTop}
                      >
                        <View
                          style={
                            styles.routeBadge
                          }
                        >
                          <Text
                            style={
                              styles.routeBadgeText
                            }
                          >
                            {routeNumber}
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.scheduledLabel
                          }
                        >
                          Scheduled
                        </Text>
                      </View>

                      <Text
                        style={styles.routePath}
                      >
                        {from} → {to}
                      </Text>

                      {route.next_departure ? (
                        <View
                          style={styles.timeRow}
                        >
                          <View>
                            <Text
                              style={
                                styles.timeLabel
                              }
                            >
                              Departure
                            </Text>

                            <Text
                              style={
                                styles.timeValue
                              }
                            >
                              {
                                route.next_departure
                              }
                            </Text>
                          </View>

                          {route.next_arrival ? (
                            <View>
                              <Text
                                style={
                                  styles.timeLabel
                                }
                              >
                                Arrival
                              </Text>

                              <Text
                                style={
                                  styles.timeValue
                                }
                              >
                                {
                                  route.next_arrival
                                }
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                }
              )}
            </View>
          ) : null}

          {/* Alternatives */}
          {searched &&
          directRoutes.length === 0 &&
          alternatives.length > 0 ? (
            <View
              style={styles.resultsSection}
            >
              <Text style={styles.resultsTitle}>
                Alternative Journeys
              </Text>

              <Text
                style={styles.resultsSubtitle}
              >
                No direct bus found. Here are
                connecting options.
              </Text>

              {alternatives.map(
                (journey, index) => (
                  <View
                    key={`alternative-${index}`}
                    style={styles.routeCard}
                  >
                    <Text
                      style={
                        styles.alternativeNumber
                      }
                    >
                      Option {index + 1}
                    </Text>

                    <Text
                      style={
                        styles.alternativeText
                      }
                    >
                      {formatAlternativeJourney(
                        journey
                      )}
                    </Text>
                  </View>
                )
              )}
            </View>
          ) : null}

          {/* No results */}
          {searched &&
          directRoutes.length === 0 &&
          alternatives.length === 0 &&
          !error ? (
            <View
              style={styles.emptyCard}
            >
              <Text
                style={styles.emptyTitle}
              >
                No journey found
              </Text>

              <Text
                style={styles.emptyText}
              >
                Try another starting point or
                destination.
              </Text>
            </View>
          ) : null}

          {/* Information */}
          {!searched ? (
            <View style={styles.infoCard}>
              <Text
                style={styles.infoTitle}
              >
                How BusFix finds your journey
              </Text>

              <Text
                style={styles.infoText}
              >
                BusFix first checks direct scheduled
                bus routes. If no direct route is
                available, alternative journeys can
                be discovered using connecting buses
                and walking links.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatAlternativeJourney(
  journey: AlternativeJourney
) {
  if (journey.description) {
    return journey.description;
  }

  if (journey.summary) {
    return journey.summary;
  }

  if (journey.legs) {
    return journey.legs
      .map((leg: any) => {
        if (leg.mode === "WALK") {
          return "WALK";
        }

        return (
          leg.route_short_name ||
          leg.route_id ||
          "BUS"
        );
      })
      .join(" → ");
  }

  return "Connecting journey available";
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#F7FAFA",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  back: {
    fontSize: 16,
    color: "#0F766E",
    fontWeight: "600",
    marginBottom: 28,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 28,
  },

  form: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#0F766E",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
  },

  locationButton: {
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#99F6E4",
    backgroundColor: "#F0FDFA",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -8,
    marginBottom: 18,
  },

  locationButtonText: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "700",
  },

  searchButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
  },

  searchButtonDisabled: {
    opacity: 0.7,
  },

  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  errorCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
  },

  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#7F1D1D",
    marginTop: 5,
  },

  resultsSection: {
    marginTop: 28,
  },

  resultsTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
  },

  resultsSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 14,
  },

  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  routeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  routeBadge: {
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },

  routeBadgeText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#115E59",
  },

  scheduledLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },

  routePath: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginTop: 14,
  },

  timeRow: {
    flexDirection: "row",
    gap: 35,
    marginTop: 15,
  },

  timeLabel: {
    fontSize: 10,
    color: "#94A3B8",
    textTransform: "uppercase",
  },

  timeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 3,
  },

  alternativeNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F766E",
  },

  alternativeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 8,
  },

  emptyCard: {
    marginTop: 25,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  emptyText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 5,
  },

  infoCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#115E59",
    marginBottom: 7,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },
});