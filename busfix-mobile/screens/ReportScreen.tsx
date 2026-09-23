import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

import { submitReport } from "../api/api";

type Props = NativeStackScreenProps<RootStackParamList, "Report">;

const ISSUE_TYPES = [
  {
    value: "LIVE_DATA_MISSING",
    label: "Live bus data missing",
  },
  {
    value: "WRONG_BUS_INFORMATION",
    label: "Wrong bus information",
  },
  {
    value: "WRONG_ROUTE_INFORMATION",
    label: "Wrong route information",
  },
  {
    value: "SCHEDULE_UNAVAILABLE",
    label: "Schedule unavailable",
  },
  {
    value: "TRACKING_UNAVAILABLE",
    label: "Tracking unavailable",
  },
  {
    value: "STOP_INFORMATION_WRONG",
    label: "Stop information is wrong",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

export default function ReportScreen({ navigation }: Props) {
  const [routeId, setRouteId] = useState("");
  const [stopName, setStopName] = useState("");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!routeId.trim()) {
      Alert.alert("Missing information", "Please enter the bus route.");
      return;
    }

    if (!stopName.trim()) {
      Alert.alert("Missing information", "Please enter the stop name.");
      return;
    }

    if (!issueType) {
      Alert.alert("Missing information", "Please select an issue type.");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Missing information", "Please describe what happened.");
      return;
    }

    setSubmitting(true);

    try {
      await submitReport({
        route_id: routeId.trim(),
        stop_name: stopName.trim(),
        issue_type: issueType,
        description: description.trim(),
      });

      Alert.alert(
        "Report submitted",
        "Thank you. Your observation has been added to BusFix.",
        [
          {
            text: "Done",
            onPress: () => {
              setRouteId("");
              setStopName("");
              setIssueType("");
              setDescription("");
            },
          },
        ]
      );
    } catch (error) {
      console.error(error);

      Alert.alert(
        "Submission failed",
        "We couldn't submit the report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Report an Issue</Text>

        <Text style={styles.subtitle}>
          Help improve the reliability of public-transport
          information.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>BUS ROUTE</Text>

          <TextInput
            value={routeId}
            onChangeText={setRouteId}
            placeholder="e.g. 229"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Text style={styles.label}>STOP</Text>

          <TextInput
            value={stopName}
            onChangeText={setStopName}
            placeholder="e.g. Paradise"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Text style={styles.label}>WHAT WENT WRONG?</Text>

          <View style={styles.issueList}>
            {ISSUE_TYPES.map((issue) => {
              const selected = issueType === issue.value;

              return (
                <TouchableOpacity
                  key={issue.value}
                  style={[
                    styles.issueOption,
                    selected && styles.issueOptionSelected,
                  ]}
                  onPress={() => setIssueType(issue.value)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected ? (
                      <View style={styles.radioInner} />
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.issueText,
                      selected && styles.issueTextSelected,
                    ]}
                  >
                    {issue.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>DESCRIPTION</Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Tell us what you observed..."
            placeholderTextColor="#94A3B8"
            style={styles.description}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                Submit Report
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>
            Your observation matters
          </Text>

          <Text style={styles.noteText}>
            Reports are treated as passenger observations. Repeated
            observations can help BusFix identify information
            reliability issues over time.
          </Text>
        </View>
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
    marginTop: 4,
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

  issueList: {
    marginBottom: 18,
  },

  issueOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },

  issueOptionSelected: {
    borderColor: "#0F766E",
    backgroundColor: "#F0FDFA",
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  radioSelected: {
    borderColor: "#0F766E",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0F766E",
  },

  issueText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
  },

  issueTextSelected: {
    color: "#115E59",
    fontWeight: "600",
  },

  description: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 18,
  },

  submitButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: "#0F766E",
    justifyContent: "center",
    alignItems: "center",
  },

  submitDisabled: {
    opacity: 0.7,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  note: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 18,
    marginTop: 18,
  },

  noteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#115E59",
    marginBottom: 6,
  },

  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },
});