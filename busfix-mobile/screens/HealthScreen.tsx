import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

import { getNetworkReliability } from "../api/api";

type Props = NativeStackScreenProps<RootStackParamList, "Health">;

type RouteHealth = {
  route_id: string;
  report_count: number;
  affected_stop_count: number;
  information_health_score: number;
  status: string;
  confidence: string;
};

type ReliabilityResponse = {
  count?: number;
  methodology?: string;
  routes?: RouteHealth[];
};

export default function HealthScreen({ navigation }: Props) {
  const [data, setData] =
    useState<ReliabilityResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHealth();
  }, []);

  async function loadHealth() {
    try {
      setLoading(true);
      setError("");

      const result = await getNetworkReliability();

      setData(result);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load Information Health right now."
      );
    } finally {
      setLoading(false);
    }
  }

  const routes = data?.routes || [];

  const averageScore =
    routes.length > 0
      ? Math.round(
          routes.reduce(
            (sum, route) =>
              sum + route.information_health_score,
            0
          ) / routes.length
        )
      : 0;

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
          Information Health
        </Text>

        <Text style={styles.subtitle}>
          How reliable is the public-transport information
          being reported by passengers?
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator
              size="large"
              color="#0F766E"
            />

            <Text style={styles.loadingText}>
              Loading health data...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Information unavailable
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadHealth}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Network score */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>
                NETWORK INFORMATION HEALTH
              </Text>

              <Text style={styles.score}>
                {averageScore}
                <Text style={styles.scoreOutOf}>
                  /100
                </Text>
              </Text>

              <Text style={styles.scoreDescription}>
                Based on passenger observations and
                reported information issues.
              </Text>
            </View>

            {/* Summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>
                  {routes.length}
                </Text>

                <Text style={styles.summaryLabel}>
                  Routes
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>
                  {data?.count ?? 0}
                </Text>

                <Text style={styles.summaryLabel}>
                  Observations
                </Text>
              </View>
            </View>

            {/* Route health */}
            <Text style={styles.sectionTitle}>
              Route Information Health
            </Text>

            {routes.map((route) => (
              <View
                key={route.route_id}
                style={styles.routeCard}
              >
                <View style={styles.routeHeader}>
                  <View style={styles.routeBadge}>
                    <Text style={styles.routeBadgeText}>
                      {route.route_id}
                    </Text>
                  </View>

                  <Text style={styles.status}>
                    {route.status}
                  </Text>
                </View>

                <View style={styles.scoreRow}>
                  <Text style={styles.routeScore}>
                    {route.information_health_score}
                  </Text>

                  <Text style={styles.outOf}>
                    /100
                  </Text>
                </View>

                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progress,
                      {
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            route.information_health_score
                          )
                        )}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.routeDetails}>
                  <Text style={styles.detailText}>
                    {route.report_count} observation
                    {route.report_count !== 1 ? "s" : ""}
                  </Text>

                  <Text style={styles.detailText}>
                    {route.affected_stop_count} affected stop
                    {route.affected_stop_count !== 1
                      ? "s"
                      : ""}
                  </Text>
                </View>

                <Text style={styles.confidence}>
                  Confidence: {route.confidence}
                </Text>
              </View>
            ))}

            {routes.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  No route health data yet
                </Text>

                <Text style={styles.emptyText}>
                  Passenger observations will appear here as
                  reports are collected.
                </Text>
              </View>
            ) : null}

            {/* Methodology */}
            {data?.methodology ? (
              <View style={styles.methodology}>
                <Text style={styles.methodologyTitle}>
                  About this score
                </Text>

                <Text style={styles.methodologyText}>
                  {data.methodology}
                </Text>
              </View>
            ) : null}
          </>
        )}
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

  loading: {
    alignItems: "center",
    paddingVertical: 60,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
  },

  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#991B1B",
  },

  errorText: {
    fontSize: 13,
    color: "#7F1D1D",
    marginTop: 6,
  },

  retryButton: {
    marginTop: 15,
    alignSelf: "flex-start",
    backgroundColor: "#0F766E",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  scoreLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    color: "#0F766E",
  },

  score: {
    fontSize: 48,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },

  scoreOutOf: {
    fontSize: 18,
    fontWeight: "600",
    color: "#94A3B8",
  },

  scoreDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    marginTop: 5,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  summaryNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },

  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 28,
    marginBottom: 13,
  },

  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },

  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  routeBadge: {
    backgroundColor: "#CCFBF1",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  routeBadgeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#115E59",
  },

  status: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },

  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 15,
  },

  routeScore: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },

  outOf: {
    fontSize: 13,
    color: "#94A3B8",
    marginLeft: 3,
  },

  progressBackground: {
    height: 7,
    borderRadius: 5,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginTop: 10,
  },

  progress: {
    height: "100%",
    backgroundColor: "#0F766E",
    borderRadius: 5,
  },

  routeDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  detailText: {
    fontSize: 11,
    color: "#64748B",
  },

  confidence: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 7,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    marginTop: 5,
  },

  methodology: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 18,
    marginTop: 18,
  },

  methodologyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#115E59",
    marginBottom: 6,
  },

  methodologyText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },
});