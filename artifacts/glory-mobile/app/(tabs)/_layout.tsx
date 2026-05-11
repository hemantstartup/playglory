import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens — liquid glass
// is a system-level appearance provided by iOS and cannot be overridden.
// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
function NativeTabLayout() {
  const { userRole } = useAuth();
  const isTurfOwner = userRole === 'turf_owner';

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: isTurfOwner ? "chart.bar" : "house", selected: isTurfOwner ? "chart.bar.fill" : "house.fill" }} />
        <Label>{isTurfOwner ? "Dashboard" : "Home"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover">
        <Icon sf={{ default: isTurfOwner ? "mappin.and.ellipse" : "magnifyingglass", selected: isTurfOwner ? "mappin.and.ellipse" : "magnifyingglass" }} />
        <Label>{isTurfOwner ? "My Turfs" : "Discover"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="matches">
        <Icon sf={{ default: isTurfOwner ? "calendar" : "trophy", selected: isTurfOwner ? "calendar" : "trophy.fill" }} />
        <Label>{isTurfOwner ? "Bookings" : "Matches"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="turfs">
        <Icon sf={{ default: isTurfOwner ? "indianrupeesign.circle" : "map", selected: isTurfOwner ? "indianrupeesign.circle.fill" : "map.fill" }} />
        <Label>{isTurfOwner ? "Earnings" : "Turfs"}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { userRole } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isTurfOwner = userRole === 'turf_owner';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isTurfOwner ? "Dashboard" : "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name={isTurfOwner ? "chart.bar" : "house"} tintColor={color} size={24} />
            ) : (
              <Feather name={isTurfOwner ? "bar-chart-2" : "home"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: isTurfOwner ? "My Turfs" : "Discover",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name={isTurfOwner ? "mappin.and.ellipse" : "magnifyingglass"} tintColor={color} size={24} />
            ) : (
              <Feather name={isTurfOwner ? "map-pin" : "search"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: isTurfOwner ? "Bookings" : "Matches",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name={isTurfOwner ? "calendar" : "trophy"} tintColor={color} size={24} />
            ) : (
              <Feather name={isTurfOwner ? "calendar" : "award"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="turfs"
        options={{
          title: isTurfOwner ? "Earnings" : "Turfs",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name={isTurfOwner ? "indianrupeesign.circle" : "map"} tintColor={color} size={24} />
            ) : (
              <Feather name={isTurfOwner ? "trending-up" : "map"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
