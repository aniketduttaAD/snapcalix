import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card } from "@ui-kitten/components";
import { router } from "expo-router";
import { UserData, useUserStore } from "@/utils/useUserStore";
import { saveUserProfile } from "@/api/userApi";
import { generateMealPlan } from "@/api/mealPlanApi";

const typeOfDietLabels: Record<
    NonNullable<UserData["typeOfDiet"]>,
    string
> = {
    lowCarb: "Low Carb",
    mediterranean: "Mediterranean",
    keto: "Keto",
    intermittentFasting: "Intermittent Fasting",
};

export default function SummaryScreen() {
    const { userData, updateUserData, isLoading } = useUserStore();
    const [loading, setLoading] = useState(false)
    const calculateAge = (dateOfBirth: string | undefined) => {
        if (!dateOfBirth) return "N/A";
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return "Not specified";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const daysUntilTarget = (targetDate: string | undefined) => {
        if (!targetDate) return 0;
        const target = new Date(targetDate);
        const today = new Date();
        const diffTime = target.getTime() - today.getTime();
        if (diffTime < 0) return 0;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handleComplete = async () => {
        try {
            setLoading(true)
            const user = await saveUserProfile(userData);
            updateUserData(user);
            await generateMealPlan(user?.id, userData)
            setLoading(false);
            router.navigate("/(tabs)")
        } catch (error) {
            console.error("Error completing onboarding:", error);
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContent}>
            <Text style={styles.heading}>Profile Summary</Text>
            <Text style={styles.subheading}>
                Review your information before we create your personalized plan
            </Text>
        </View>
    );

    const renderFooter = () => (
        <View style={styles.footer}>
            <Button
                appearance='ghost'
                status='basic'
                onPress={() => router.back()}
                style={styles.backButton}
                disabled={isLoading}
            >
                Back
            </Button>
            <Button
                onPress={handleComplete}
                style={styles.finishButton}
                disabled={loading}
                accessoryLeft={
                    loading
                        ? () => <ActivityIndicator size='small' color='white' />
                        : undefined
                }
            >
                {loading ? "Creating Plan..." : "Finish & Create Plan"}
            </Button>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.content}
        </Card>
    );

    const data = [
        {
            id: "1",
            title: "Basic Information",
            content: (
                <>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Gender</Text>
                        <Text style={styles.infoValue}>
                            {userData.gender || "Not specified"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date of Birth</Text>
                        <Text style={styles.infoValue}>
                            {userData.dob ? formatDate(userData.dob) : "Not specified"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Age</Text>
                        <Text style={styles.infoValue}>
                            {userData.dob
                                ? `${calculateAge(userData.dob)} years`
                                : "Not specified"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Location</Text>
                        <Text style={styles.infoValue}>
                            {userData.state && userData.country
                                ? `${userData.state}, ${userData.country}`
                                : "Not specified"}
                        </Text>
                    </View>
                </>
            ),
        },
        {
            id: "2",
            title: "Body Information",
            content: (
                <>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Height</Text>
                        <Text style={styles.infoValue}>
                            {userData.heightCm
                                ? `${userData.heightCm} cm`
                                : "Not specified"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Current Weight</Text>
                        <Text style={styles.infoValue}>
                            {userData.weight
                                ? `${userData.weight} kg`
                                : "Not specified"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Goal Weight</Text>
                        <Text style={styles.infoValue}>
                            {userData.goalWeight
                                ? `${userData.goalWeight} kg`
                                : "Not specified"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Target Date</Text>
                        <Text style={styles.infoValue}>
                            {formatDate(userData.targetDate)}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Timeframe</Text>
                        <Text style={styles.infoValue}>
                            {userData.targetDate
                                ? `${daysUntilTarget(userData.targetDate)} days`
                                : "Not specified"}
                        </Text>
                    </View>
                </>
            ),
        },
        {
            id: "3",
            title: "Diet Preferences",
            content: (
                <>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Food Preferences</Text>
                        <Text style={styles.infoValue}>
                            {userData.preferences && userData.preferences.length > 0
                                ? userData.preferences.join(", ")
                                : "No preferences set"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Specific Diet</Text>
                        <Text style={styles.infoValue}>
                            {userData.typeOfDiet
                                ? typeOfDietLabels[userData.typeOfDiet]
                                : "Not specified"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Allergies</Text>
                        <Text style={styles.infoValue}>
                            {userData.allergies && userData.allergies.length > 0
                                ? userData.allergies.join(", ")
                                : "None"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Dislikes</Text>
                        <Text style={styles.infoValue}>
                            {userData.dislikes && userData.dislikes.length > 0
                                ? userData.dislikes.join(", ")
                                : "None"}
                        </Text>
                    </View>
                </>
            ),
        },
        {
            id: "4",
            title: "Goal Summary",
            content: (
                <>
                    <Text style={styles.goalText}>
                        You want to
                        <Text style={styles.highlightText}>
                            {" "}
                            {(userData.weight ?? 0) > (userData.goalWeight ?? 0)
                                ? "lose"
                                : "gain"}{" "}
                            {Math.abs(
                                (userData.weight ?? 0) - (userData.goalWeight ?? 0)
                            ).toFixed(1)}{" "}
                            kg
                        </Text>
                        in
                        <Text style={styles.highlightText}>
                            {" "}
                            {daysUntilTarget(userData.targetDate)} days
                        </Text>
                        .
                    </Text>
                    <Text style={styles.goalRate}>
                        That's about{" "}
                        {daysUntilTarget(userData.targetDate) > 0
                            ? (
                                (Math.abs(
                                    (userData.weight ?? 0) - (userData.goalWeight ?? 0)
                                ) /
                                    daysUntilTarget(userData.targetDate)) *
                                7
                            ).toFixed(2)
                            : "N/A"}{" "}
                        kg per week
                    </Text>
                </>
            ),
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },

    headerContent: {
        marginBottom: 24,
        paddingHorizontal: 24,
    },
    heading: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#1F2937",
        marginBottom: 8,
    },
    subheading: {
        fontSize: 16,
        color: "#6B7280",
        lineHeight: 24,
    },
    card: {
        marginHorizontal: 24,
        marginBottom: 20,
        borderRadius: 12,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    infoLabel: {
        fontSize: 15,
        color: "#6B7280",
        flex: 1,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: "500",
        color: "#1F2937",
        flex: 1.5,
        textAlign: "right",
    },
    goalText: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 8,
        color: "#374151",
    },
    highlightText: {
        fontWeight: "bold",
        color: "#5048E5",
    },
    goalRate: {
        fontSize: 15,
        color: "#6B7280",
    },
    footer: {
        flexDirection: "row",
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
    },
    backButton: {
        flex: 1,
        marginRight: 8,
        borderColor: "#D1D5DB",
    },
    finishButton: {
        flex: 2,
        backgroundColor: "#5048E5",
        borderColor: "#5048E5",
    },
});
