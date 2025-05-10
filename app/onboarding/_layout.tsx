import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function OnboardingLayout() {
    return (
        <>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#FFFFFF',
                    },
                    headerShadowVisible: false,
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerTitleAlign: 'center',
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        title: "Welcome to SnapCalix",
                        headerShown: false
                    }}
                />
                <Stack.Screen
                    name="basic-info"
                    options={{
                        title: "Basic Information",
                        animation: 'slide_from_right'
                    }}
                />
                <Stack.Screen
                    name="body-info"
                    options={{
                        title: "Body Information",
                        animation: 'slide_from_right'
                    }}
                />
                <Stack.Screen
                    name="diet-preferences"
                    options={{
                        title: "Diet Preferences",
                        animation: 'slide_from_right'
                    }}
                />
                <Stack.Screen
                    name="summary"
                    options={{
                        title: "Profile Summary",
                        animation: 'slide_from_right'
                    }}
                />
            </Stack>
        </>
    );
}