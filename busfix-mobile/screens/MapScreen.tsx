import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
} from "react-native-maps";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

import { getRouteStops } from "../api/api";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Map"
>;

type MapStop = {
  stop_sequence: string | number;
  stop_name: string;
  stop_lat: string | number;
  stop_lon: string | number;
};

export default function MapScreen({
  navigation,
}: Props) {
  const [routeId, setRouteId] = useState("");
  const [direction, setDirection] = useState("0");

  const [stops, setStops] = useState<MapStop[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searched, setSearched] = useState(false);

  const loadRoute = async () => {
    if (!routeId.trim()) {
      setError("Please enter a bus route number.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(false);
      setStops([]);

      const result = await getRouteStops(
        routeId.trim(),
        direction
      );

      const routeStops: MapStop[] =
        result.stops || result || [];

      if (routeStops.length === 0) {
        setError(
          `No stops found for route ${routeId.trim()}.`
        );
        return;
      }

      setStops(routeStops);
      setSearched(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this route."
      );
    } finally {
      setLoading(false);
    }
  };

  const coordinates = stops
    .map((stop) => ({
      latitude: Number(stop.stop_lat),
      longitude: Number(stop.stop_lon),
    }))
    .filter(
      (coordinate) =>
        Number.isFinite(coordinate.latitude) &&
        Number.isFinite(coordinate.longitude)
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Route Map
        </Text>

        <Text style={styles.subtitle}>
          View bus stops and the scheduled route path.
        </Text>

        {/* Search */}
        <View style={styles.searchCard}>
          <Text style={styles.label}>
            BUS ROUTE
          </Text>

          <TextInput
            value={routeId}
            onChangeText={(text) => {
              setRouteId(text);
              setError("");
            }}
            placeholder="e.g. 229"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>
            DIRECTION
          </Text>

          <View style={styles.directionRow}>
            <TouchableOpacity
              style={[
                styles.directionButton,
                direction === "0" &&
                  styles.directionButtonSelected,
              ]}
              onPress={() => setDirection("0")}
            >
              <Text
                style={[
                  styles.directionText,
                  direction === "0" &&
                    styles.directionTextSelected,
                ]}
              >
                Direction 0
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.directionButton,
                direction === "1" &&
                  styles.directionButtonSelected,
              ]}
              onPress={() => setDirection("1")}
            >
              <Text
                style={[
                  styles.directionText,
                  direction === "1" &&
                    styles.directionTextSelected,
                ]}
              >
                Direction 1
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.searchButton,
              loading &&
                styles.searchButtonDisabled,
            ]}
            onPress={loadRoute}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.searchButtonText}>
                Show Route
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Route unavailable
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Map */}
        {coordinates.length > 0 ? (
          <View style={styles.mapCard}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={{
                latitude: coordinates[0].latitude,
                longitude: coordinates[0].longitude,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
              showsUserLocation
              showsMyLocationButton
            >
              <Polyline
                coordinates={coordinates}
                strokeWidth={4}
              />

              {stops.map((stop, index) => {
                const latitude =
                  Number(stop.stop_lat);

                const longitude =
                  Number(stop.stop_lon);

                if (
                  !Number.isFinite(latitude) ||
                  !Number.isFinite(longitude)
                ) {
                  return null;
                }

                return (
                  <Marker
                    key={`${stop.stop_sequence}-${index}`}
                    coordinate={{
                      latitude,
                      longitude,
                    }}
                    title={stop.stop_name}
                    description={`Stop ${stop.stop_sequence}`}
                  />
                );
              })}
            </MapView>
          </View>
        ) : null}

        {/* Route information */}
        {searched && stops.length > 0 ? (
          <View style={styles.routeInfo}>
            <View style={styles.routeInfoHeader}>
              <View>
                <Text style={styles.routeLabel}>
                  ROUTE
                </Text>

                <Text style={styles.routeNumber}>
                  {routeId.trim()}
                </Text>
              </View>

              <View style={styles.directionBadge}>
                <Text
                  style={styles.directionBadgeText}
                >
                  Direction {direction}
                </Text>
              </View>
            </View>

            <Text style={styles.stopCount}>
              {stops.length} stops
            </Text>
          </View>
        ) : null}

        {/* Stop list */}
        {stops.length > 0 ? (
          <View style={styles.stopSection}>
            <Text style={styles.sectionTitle}>
              Stops
            </Text>

            {stops.map((stop, index) => (
              <View
                key={`${stop.stop_sequence}-${index}`}
                style={styles.stopRow}
              >
                <View style={styles.sequence}>
                  <Text
                    style={styles.sequenceText}
                  >
                    {stop.stop_sequence}
                  </Text>
                </View>

                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>
                    {stop.stop_name}
                  </Text>

                  <Text style={styles.coordinates}>
                    {Number(stop.stop_lat).toFixed(5)},
                    {" "}
                    {Number(stop.stop_lon).toFixed(5)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {!searched ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              Route visualization
            </Text>

            <Text style={styles.infoText}>
              Enter a TGSRTC route number to display
              its scheduled stops and route path on
              the map.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 25,
  },

  searchCard: {
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
    marginTop: 3,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 18,
  },

  directionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  directionButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },

  directionButtonSelected: {
    backgroundColor: "#F0FDFA",
    borderColor: "#0F766E",
  },

  directionText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  directionTextSelected: {
    color: "#0F766E",
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

  mapCard: {
    height: 400,
    overflow: "hidden",
    borderRadius: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  map: {
    flex: 1,
  },

  routeInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  routeInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  routeLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    color: "#0F766E",
  },

  routeNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },

  directionBadge: {
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
  },

  directionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#115E59",
  },

  stopCount: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
  },

  stopSection: {
    marginTop: 26,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },

  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  sequence: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#CCFBF1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  sequenceText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#115E59",
  },

  stopInfo: {
    flex: 1,
  },

  stopName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },

  coordinates: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
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