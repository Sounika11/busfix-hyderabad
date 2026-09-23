import React from "react";

import {
  NavigationContainer,
} from "@react-navigation/native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import HomeScreen from "./screens/HomeScreen";
import JourneyScreen from "./screens/JourneyScreen";
import ReportScreen from "./screens/ReportScreen";
import HealthScreen from "./screens/HealthScreen";
import MapScreen from "./screens/MapScreen";


// =====================================================
// NAVIGATION TYPES
// =====================================================

export type RootStackParamList = {
  Home: undefined;
  Journey: undefined;
  Report: undefined;
  Health: undefined;
  Map: undefined;
};


// =====================================================
// STACK NAVIGATOR
// =====================================================

const Stack =
  createNativeStackNavigator<RootStackParamList>();


// =====================================================
// APP
// =====================================================

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >

        {/* HOME */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        {/* JOURNEY PLANNER */}
        <Stack.Screen
          name="Journey"
          component={JourneyScreen}
        />

        {/* REPORT ISSUE */}
        <Stack.Screen
          name="Report"
          component={ReportScreen}
        />

        {/* INFORMATION HEALTH */}
        <Stack.Screen
          name="Health"
          component={HealthScreen}
        />

        {/* ROUTE MAP */}
        <Stack.Screen
          name="Map"
          component={MapScreen}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}