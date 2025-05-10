import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Animated,
    Dimensions,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MealCard } from "@/components/MealCard";
import { LinearGradient } from "expo-linear-gradient";
import { useUserStore } from "@/utils/useUserStore";
import {
    getMealPlan,
    generateMealPlan,
    WeeklyMealPlan,
    Meal as ApiMeal,
    DailyMeals,
} from "../../api/mealPlanApi";

const { width } = Dimensions.get("window");

interface MappedMealData {
    name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    ingredients: string[];
    image?: string;
    apiData?: ApiMeal;
    alternative?: {
        name: string;
        calories: number;
        protein?: number;
        carbs?: number;
        fats?: number;
        ingredients: string[];
        image?: string;
        apiData?: ApiMeal;
    };
}

const mapApiMealToCardData = (
    mainApiMeal?: ApiMeal | null,
    altApiMeal?: ApiMeal | null
): MappedMealData | null => {
    if (!mainApiMeal || !mainApiMeal.name) {
        return null;
    }
    const mainNutrition = mainApiMeal.nutritionValues || { calories: 0 };
    let alternativeData;
    if (altApiMeal && altApiMeal.name) {
        const altNutrition = altApiMeal.nutritionValues || { calories: 0 };
        alternativeData = {
            name: altApiMeal.name,
            calories: altNutrition.calories,
            protein: altNutrition.protein,
            carbs: altNutrition.carbs,
            fats: altNutrition.fats,
            ingredients: altApiMeal.ingredients || [],
            image: altApiMeal.image,
            apiData: altApiMeal,
        };
    }
    return {
        name: mainApiMeal.name,
        calories: mainNutrition.calories,
        protein: mainNutrition.protein,
        carbs: mainNutrition.carbs,
        fats: mainNutrition.fats,
        ingredients: mainApiMeal.ingredients || [],
        image: mainApiMeal.image,
        apiData: mainApiMeal,
        alternative: alternativeData,
    };
};

interface MealDisplayItem {
    type: string;
    mealCardInput: MappedMealData;
}

const COLORS = {
    primary: "#4F46E5",
    primaryLight: "#EEF2FF",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    background: "#F9FAFB",
    cardBackground: "#FFFFFF",
    border: "#E5E7EB",
    white: "#FFFFFF",
    error: "#EF4444",
    success: "#10B981",
};

export default function MealPlanScreen() {
    const { userData } = useUserStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mealPlan, setMealPlan] = useState<WeeklyMealPlan | null>(null);
    const [selectedDay, setSelectedDay] = useState(0);
    const [showRefreshModal, setShowRefreshModal] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const weekdays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ];
    const dayKeys: (keyof WeeklyMealPlan["weeklyMealPlan"])[] = [
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
        "sat",
        "sun",
    ];
    const mealOrder: Array<{ key: keyof DailyMeals; displayName: string }> = [
        { key: "breakfast", displayName: "Breakfast" },
        { key: "lunch", displayName: "Lunch" },
        { key: "snacks", displayName: "Snacks" },
        { key: "dinner", displayName: "Dinner" },
    ];

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<FlatList>(null);

    useEffect(() => {
        fetchMealPlanWrapper();
    }, [userData?.id]);

    useEffect(() => {
        if (!loading && (mealPlan || error)) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [loading, mealPlan, error]);

    const fetchMealPlanWrapper = async () => {
        if (!userData?.id) {
            setLoading(false);
            setMealPlan(null);
            setError(
                new Error("User ID not available. Please complete your profile.")
            );
            return;
        }
        await fetchMealPlan();
    };

    const fetchMealPlan = async () => {
        if (!userData?.id) return;
        try {
            setLoading(true);
            setError(null);
            const data = await getMealPlan(userData.id);
            if (
                data &&
                data.weeklyMealPlan &&
                Object.keys(data.weeklyMealPlan).length > 0
            ) {
                setMealPlan(data);
            } else {
                await autoGenerateMealPlan();
            }
        } catch (err) {
            console.error("Error fetching meal plan:", err);
            setError(
                err instanceof Error ? err : new Error("Failed to fetch meal plan")
            );
            await autoGenerateMealPlan();
        } finally {
            if (!isGenerating) setLoading(false);
        }
    };

    const autoGenerateMealPlan = async () => {
        if (!userData?.id) {
            setLoading(false);
            setError(new Error("Cannot generate meal plan without user data."));
            return;
        }
        try {
            setIsGenerating(true);
            setLoading(true); // Ensure loading is true while generating
            await generateMealPlan(userData.id, userData);
            const newData = await getMealPlan(userData.id);
            if (
                newData &&
                newData.weeklyMealPlan &&
                Object.keys(newData.weeklyMealPlan).length > 0
            ) {
                setMealPlan(newData);
                setError(null);
            } else {
                setMealPlan(null);
                setError(new Error("Meal plan generated was empty."));
            }
        } catch (err) {
            console.error("Error auto-generating meal plan:", err);
            setError(
                err instanceof Error
                    ? err
                    : new Error("Failed to auto-generate meal plan")
            );
            setMealPlan(null);
        } finally {
            setIsGenerating(false);
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        if (!userData?.id) {
            setRefreshing(false);
            return;
        }
        try {
            setRefreshing(true);
            await fetchMealPlan();
        } catch (error) {
            console.error("Error refreshing meal plan:", error);
            Alert.alert("Refresh Error", "Could not refresh your meal plan.");
        } finally {
            setRefreshing(false);
        }
    };

    const handleRefreshRequest = () => setShowRefreshModal(true);

    const confirmRefreshMealPlan = async () => {
        if (!userData?.id) {
            Alert.alert("Error", "User data not available.");
            setShowRefreshModal(false);
            return;
        }
        setShowRefreshModal(false);
        setIsGenerating(true);
        setLoading(true);
        setError(null);
        try {
            await generateMealPlan(userData.id, userData);
            const data = await getMealPlan(userData.id);
            if (
                data &&
                data.weeklyMealPlan &&
                Object.keys(data.weeklyMealPlan).length > 0
            ) {
                setMealPlan(data);
                Alert.alert("Success", "Your new meal plan is ready!");
            } else {
                setMealPlan(null);
                setError(new Error("Generated meal plan was empty."));
                Alert.alert(
                    "Notice",
                    "Meal plan generated, but it appears to be empty."
                );
            }
        } catch (err) {
            console.error("Error regenerating meal plan:", err);
            setError(
                err instanceof Error ? err : new Error("Failed to regenerate meal plan")
            );
            Alert.alert("Error", "Failed to regenerate meal plan. Please try again.");
            setMealPlan(null);
        } finally {
            setIsGenerating(false);
            setLoading(false);
        }
    };

    const handleDaySelect = (index: number) => {
        setSelectedDay(index);
        scrollViewRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
        });
    };

    const handleMealPress = (mealCardData: MappedMealData) => {
        if (mealCardData?.name) {
            router.push(`/meals/${encodeURIComponent(mealCardData.name)}`);
        } else {
            Alert.alert("Error", "Meal data is incomplete.");
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Meal Plan</Text>
            {!loading &&
                mealPlan &&
                mealPlan.weeklyMealPlan &&
                Object.keys(mealPlan.weeklyMealPlan).length > 0 && (
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={handleRefreshRequest}
                        disabled={refreshing || isGenerating}
                    >
                        <Ionicons
                            name={
                                refreshing || isGenerating
                                    ? "refresh-circle-outline"
                                    : "refresh-outline"
                            }
                            size={26}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>
                )}
        </View>
    );

    const renderDaySelector = () => {
        const itemWidth = width / 3.8;
        return (
            <Animated.View
                style={[styles.daySelectorContainer, { opacity: fadeAnim }]}
            >
                <FlatList
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={weekdays}
                    renderItem={({ item: day, index }) => {
                        const inputRange = [
                            (index - 1) * itemWidth,
                            index * itemWidth,
                            (index + 1) * itemWidth,
                        ];
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.6, 1, 0.6],
                            extrapolate: "clamp",
                        });
                        const scale = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.9, 1.05, 0.9],
                            extrapolate: "clamp",
                        });
                        return (
                            <TouchableOpacity
                                onPress={() => handleDaySelect(index)}
                                activeOpacity={0.7}
                                style={{ width: itemWidth }}
                            >
                                <Animated.View
                                    style={[
                                        styles.dayTab,
                                        selectedDay === index && styles.dayTabActive,
                                        { transform: [{ scale }] },
                                    ]}
                                >
                                    <Animated.Text
                                        style={[
                                            styles.dayTabText,
                                            selectedDay === index && styles.dayTabTextActive,
                                            { opacity },
                                        ]}
                                    >
                                        {day.substring(0, 3)}
                                    </Animated.Text>
                                    <Animated.Text
                                        style={[
                                            styles.dayTabDate,
                                            selectedDay === index && styles.dayTabDateActive,
                                            { opacity },
                                        ]}
                                    >
                                        Day {index + 1}
                                    </Animated.Text>
                                </Animated.View>
                            </TouchableOpacity>
                        );
                    }}
                    keyExtractor={(item) => item}
                    contentContainerStyle={styles.daySelectorContent}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    scrollEventThrottle={16}
                    snapToInterval={itemWidth}
                    decelerationRate='fast'
                />
            </Animated.View>
        );
    };

    const renderMealContent = () => {
        const currentDayKey = dayKeys[selectedDay];
        const dailyMealOptions = mealPlan?.weeklyMealPlan?.[currentDayKey];

        if (!dailyMealOptions) {
            return (
                <Animated.View
                    style={[styles.emptyDayContainer, { opacity: fadeAnim }]}
                >
                    <Ionicons name='cafe-outline' size={50} color={COLORS.textMuted} />
                    <Text style={styles.emptyDayText}>
                        No meals for {weekdays[selectedDay]}.
                    </Text>
                    <Text style={styles.emptyDaySubText}>
                        Enjoy your day or add a custom meal!
                    </Text>
                </Animated.View>
            );
        }

        const mealsToDisplay: MealDisplayItem[] = mealOrder
            .map((mealTypeInfo) => {
                const mainApiMeal = dailyMealOptions.main_meal?.[mealTypeInfo.key];
                const altApiMeal =
                    dailyMealOptions.alternative_meal?.[mealTypeInfo.key];
                const mealCardData = mapApiMealToCardData(mainApiMeal, altApiMeal);
                return mealCardData
                    ? { type: mealTypeInfo.displayName, mealCardInput: mealCardData }
                    : null;
            })
            .filter((item): item is MealDisplayItem => item !== null);

        if (mealsToDisplay.length === 0) {
            return (
                <Animated.View
                    style={[styles.emptyDayContainer, { opacity: fadeAnim }]}
                >
                    <Ionicons name='reader-outline' size={50} color={COLORS.textMuted} />
                    <Text style={styles.emptyDayText}>
                        No meals found for {weekdays[selectedDay]}.
                    </Text>
                    <Text style={styles.emptyDaySubText}>
                        Try regenerating your plan or check your profile settings.
                    </Text>
                </Animated.View>
            );
        }

        return (
            <Animated.View
                style={[
                    styles.mealPlanContent,
                    {
                        opacity: fadeAnim,
                        transform: [
                            {
                                translateY: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0],
                                }),
                            },
                        ],
                    },
                ]}
            >
                <FlatList
                    data={mealsToDisplay}
                    renderItem={({ item, index }) => (
                        <Animated.View
                            key={`${item.type}-${currentDayKey}-${index}`}
                            style={{
                                opacity: fadeAnim,
                                transform: [
                                    {
                                        translateX: fadeAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [10 * (index + 1), 0],
                                        }),
                                    },
                                ],
                            }}
                        >
                            <View style={styles.mealTypeHeader}>
                                <Text style={styles.mealTypeText}>{item.type}</Text>
                                {item.mealCardInput.apiData?.timeInMinutes && (
                                    <View style={styles.mealTimingContainer}>
                                        <Ionicons
                                            name='time-outline'
                                            size={16}
                                            color={COLORS.textSecondary}
                                        />
                                        <Text style={styles.mealTimingText}>
                                            {item.mealCardInput.apiData.timeInMinutes} min
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <MealCard
                                meal={item.mealCardInput}
                                onPress={() => handleMealPress(item.mealCardInput)}
                            />
                        </Animated.View>
                    )}
                    keyExtractor={(item, index) =>
                        `${item.type}-${currentDayKey}-${index}`
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.mealScrollContent}
                    ListFooterComponent={<View style={{ height: 60 }} />}
                />
            </Animated.View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyStateContainer}>
            <Animated.View
                style={[
                    styles.emptyStateIconWrapper,
                    { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                ]}
            >
                <LinearGradient
                    colors={[COLORS.primaryLight, "#C7D2FE"]}
                    style={styles.emptyStateIconWrapperGradient}
                >
                    <Ionicons
                        name={error ? "alert-circle-outline" : "restaurant-outline"}
                        size={60}
                        color={COLORS.primary}
                    />
                </LinearGradient>
            </Animated.View>
            <Animated.Text
                style={[
                    styles.emptyStateTitle,
                    {
                        opacity: fadeAnim,
                        transform: [
                            {
                                translateY: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [15, 0],
                                }),
                            },
                        ],
                    },
                ]}
            >
                {error ? "Oops! Something Went Wrong" : "No Meal Plan Found"}
            </Animated.Text>
            <Animated.Text
                style={[
                    styles.emptyStateText,
                    {
                        opacity: fadeAnim,
                        transform: [
                            {
                                translateY: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [10, 0],
                                }),
                            },
                        ],
                    },
                ]}
            >
                {error
                    ? error.message
                    : userData?.id
                        ? "Let's generate a fresh plan based on your profile."
                        : "Complete your profile to get a personalized plan."}
            </Animated.Text>
            <Animated.View style={{ opacity: fadeAnim }}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                        userData?.id ? handleRefreshRequest() : router.push("/onboarding")
                    }
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[COLORS.primary, "#3730A3"]}
                        style={styles.actionButtonGradient}
                    >
                        <Text style={styles.actionButtonText}>
                            {userData?.id ? "Generate New Plan" : "Set Up Profile"}
                        </Text>
                        <Ionicons
                            name={userData?.id ? "sparkles-outline" : "arrow-forward-outline"}
                            size={20}
                            color={COLORS.white}
                            style={styles.actionButtonIcon}
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );

    const renderLoadingState = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator
                size='large'
                color={COLORS.primary}
                style={styles.loadingIndicator}
            />
            <Text style={styles.loadingText}>
                {isGenerating ? "Crafting Your Plan..." : "Loading Meals..."}
            </Text>
            <Text style={styles.loadingSubtext}>
                {isGenerating
                    ? "This might take a moment..."
                    : "Getting your delicious meals ready."}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            {loading ? (
                renderLoadingState()
            ) : mealPlan &&
                mealPlan.weeklyMealPlan &&
                Object.keys(mealPlan.weeklyMealPlan).length > 0 ? (
                <View style={styles.contentContainer}>
                    {renderDaySelector()}
                    {renderMealContent()}
                </View>
            ) : (
                renderEmptyState()
            )}
            <ConfirmationModal
                visible={showRefreshModal}
                title='Regenerate Meal Plan?'
                message='This will create a new meal plan based on your current profile, replacing the existing one.'
                confirmText='Regenerate'
                icon='refresh-outline'
                onConfirm={confirmRefreshMealPlan}
                onCancel={() => setShowRefreshModal(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: COLORS.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },
    refreshButton: { padding: 8 },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: COLORS.background,
    },
    loadingIndicator: { transform: [{ scale: 1.5 }], marginBottom: 20 },
    loadingText: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textPrimary,
        textAlign: "center",
        marginBottom: 8,
    },
    loadingSubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
        maxWidth: "85%",
    },
    contentContainer: { flex: 1 },
    daySelectorContainer: {
        backgroundColor: COLORS.cardBackground,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    daySelectorContent: {
        paddingHorizontal: (width - (width / 3.8) * 3) / 2 - width / 3.8 / 2 + 10,
        paddingVertical: 8,
    },
    dayTab: {
        paddingVertical: 10,
        marginHorizontal: 5,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 65,
        minWidth: width / 4.2,
    },
    dayTabActive: { backgroundColor: COLORS.primary },
    dayTabText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
    dayTabTextActive: { color: COLORS.white },
    dayTabDate: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    dayTabDateActive: { color: COLORS.white, opacity: 0.8 },
    mealPlanContent: { flex: 1, paddingHorizontal: 16 },
    mealScrollContent: { paddingTop: 16, paddingBottom: 20 },
    mealTypeHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        marginTop: 16,
        paddingHorizontal: 4,
    },
    mealTypeText: { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary },
    mealTimingContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    mealTimingText: {
        fontSize: 13,
        color: COLORS.primary,
        marginLeft: 5,
        fontWeight: "500",
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 30,
        backgroundColor: COLORS.background,
    },
    emptyStateIconWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    emptyStateIconWrapperGradient: {
        width: "100%",
        height: "100%",
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.textPrimary,
        marginBottom: 12,
        textAlign: "center",
    },
    emptyStateText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginBottom: 28,
        lineHeight: 22,
        maxWidth: "90%",
    },
    actionButton: {
        borderRadius: 12,
        overflow: "hidden",
        elevation: 2,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.2,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    actionButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
    },
    actionButtonText: { color: COLORS.white, fontWeight: "bold", fontSize: 16 },
    actionButtonIcon: { marginLeft: 10 },
    emptyDayContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        marginTop: 40,
    },
    emptyDayText: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginTop: 16,
        textAlign: "center",
    },
    emptyDaySubText: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 6,
        textAlign: "center",
        lineHeight: 20,
    },
});
