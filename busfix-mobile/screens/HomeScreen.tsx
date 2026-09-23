import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BusFix</Text>

            <Text style={styles.subtitle}>
              Hyderabad Public Transport
            </Text>
          </View>

          <View style={styles.statusDot} />
        </View>

        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>
            PUBLIC TRANSPORT
          </Text>

          <Text style={styles.heroTitle}>
            Travel with better{"\n"}information.
          </Text>

          <Text style={styles.heroText}>
            Discover routes, plan journeys and report unreliable
            transport information across Hyderabad.
          </Text>
        </View>

        {/* PLAN JOURNEY */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={() => navigation.navigate("Journey")}
          activeOpacity={0.85}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>→</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.primaryCardTitle}>
              Plan a Journey
            </Text>

            <Text style={styles.primaryCardText}>
              Find direct buses and alternative journeys.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.grid}>
          {/* REPORT */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Report")}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>⚠</Text>

            <Text style={styles.actionTitle}>
              Report an Issue
            </Text>

            <Text style={styles.actionText}>
              Report incorrect or missing information.
            </Text>
          </TouchableOpacity>

          {/* INFORMATION HEALTH */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Health")}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>◉</Text>

            <Text style={styles.actionTitle}>
              Information Health
            </Text>

            <Text style={styles.actionText}>
              Check reliability of transport information.
            </Text>
          </TouchableOpacity>
        </View>

        {/* ROUTE MAP */}
        <TouchableOpacity
          style={styles.mapCard}
          onPress={() => navigation.navigate("Map")}
          activeOpacity={0.8}
        >
          <View style={styles.mapIcon}>
            <Text style={styles.mapIconText}>⌖</Text>
          </View>

          <View style={styles.mapContent}>
            <Text style={styles.mapTitle}>
              Explore Route Map
            </Text>

            <Text style={styles.mapText}>
              View scheduled bus routes, stops and route paths
              on the map.
            </Text>
          </View>

          <Text style={styles.mapArrow}>›</Text>
        </TouchableOpacity>

        {/* WHY BUSFIX */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Why BusFix?
          </Text>

          <Text style={styles.infoText}>
            BusFix combines scheduled transit data with passenger
            observations to identify unreliable public-transport
            information.
          </Text>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          BusFix Hyderabad • Civic-tech transport platform
        </Text>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 35,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },

  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F766E",
  },

  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#14B8A6",
  },

  hero: {
    marginBottom: 22,
  },

  heroLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#0F766E",
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: "#0F172A",
  },

  heroText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    marginTop: 12,
  },

  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 18,
    padding: 18,
    marginBottom: 28,
  },

  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  iconText: {
    fontSize: 25,
    color: "#FFFFFF",
  },

  cardContent: {
    flex: 1,
  },

  primaryCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  primaryCardText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#CCFBF1",
    marginTop: 4,
  },

  arrow: {
    fontSize: 30,
    color: "#FFFFFF",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },

  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  actionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  actionIcon: {
    fontSize: 22,
    color: "#0F766E",
    marginBottom: 12,
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  actionText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
    marginTop: 6,
  },

  /* ROUTE MAP CARD */

  mapCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },

  mapIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  mapIconText: {
    fontSize: 24,
    color: "#0F766E",
  },

  mapContent: {
    flex: 1,
  },

  mapTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  mapText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
    marginTop: 5,
  },

  mapArrow: {
    fontSize: 27,
    color: "#0F766E",
    marginLeft: 8,
  },

  infoCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 18,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#115E59",
    marginBottom: 6,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },

  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 25,
  },
});