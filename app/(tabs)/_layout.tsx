import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useEffect } from "react";

export default function TabLayout() {
  const router = useRouter();
  const tabScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: tabScale.value }],
    };
  });

  useEffect(() => {
    tabScale.value = withSpring(1.05, { damping: 10 });
    setTimeout(() => {
      tabScale.value = withSpring(1, { damping: 15 });
    }, 300);
  }, []);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Tabs
        screenOptions={{
          tabBarLabelStyle: { fontSize: 12 },
          tabBarStyle: { height: 60, paddingBottom: 10 },
          headerTitleStyle: { fontWeight: "bold" },
          headerStyle: { borderBottomWidth: 1 },
        }}
      >
        {/* Scan Tab (Show App Name & Profile Icon) */}
        <Tabs.Screen
          name="index"
          options={{
            title: "SnapCalix",
            tabBarIcon: ({ color }) => (
              <Ionicons name="camera" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="mealplan"
          options={{
            title: "Meal Plan",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Ionicons name="restaurant" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Ionicons name="analytics" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
