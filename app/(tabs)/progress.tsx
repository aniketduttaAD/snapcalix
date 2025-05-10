import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@ui-kitten/components";
import { LineChart, BarChart, ProgressChart } from "react-native-chart-kit";
import { getNutritionHistory } from "../../api/nutritionApi"; // Assuming correct path
import { useUserStore } from "@/utils/useUserStore"; // Assuming correct path

// Types
interface MacroDistributionData {
    labels: string[];
    data: number[];
    colors?: string[];
}

interface ChartDataset {
    data: number[];
    color: (opacity?: number) => string;
    strokeWidth?: number;
    legendFontColor?: string;
    legendFontSize?: number;
}
interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
    legend?: string[];
}

// Constants
const screenWidth = Dimensions.get("window").width;
const COLORS = {
    primary: "#6366F1",
    secondary: "#8B5CF6",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    light: "#F9FAFB", // Slightly off-white for background
    dark: "#1F2937",
    muted: "#6B7280",
    background: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E7EB",
    protein: "#3B82F6",
    carbs: "#10B981",
    fats: "#F59E0B",
    breakfast: "#3B82F6",
    lunch: "#10B981",
    dinner: "#EF4444", // Changed for more distinction
    snacks: "#F59E0B", // Changed for more distinction
};
const DEFAULT_CALORIE_GOAL = 2200; // Used as UserData doesn't have calorieGoal

const calculateBMI = (heightCm: number, weightKg: number): number => {
    if (heightCm <= 0 || weightKg <= 0) return 0;
    const heightInMeters = heightCm / 100;
    const bmi = weightKg / (heightInMeters * heightInMeters);
    return parseFloat(bmi.toFixed(1));
};

const getDayShortName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export default function ProgressScreen() {
    const { userData } = useUserStore();
    const [loading, setLoading] = useState(true);
    const [nutritionHistory, setNutritionHistory] = useState<any[]>([]);
    const [selectedTab, setSelectedTab] = useState(0);

    const bmi = calculateBMI(userData?.heightCm ?? 0, userData?.weight ?? 0);
    const bmiCategory =
        bmi < 18.5
            ? { label: "Underweight", color: COLORS.protein }
            : bmi < 25
                ? { label: "Normal Weight", color: COLORS.success }
                : bmi < 30
                    ? { label: "Overweight", color: COLORS.warning }
                    : { label: "Obese", color: COLORS.danger };

    useEffect(() => {
        const fetchNutritionData = async () => {
            if (!userData?.id) {
                setLoading(false);
                console.warn("User ID not available, skipping nutrition fetch.");
                return;
            }
            try {
                setLoading(true);
                const data = await getNutritionHistory(userData.id);
                setNutritionHistory(data || []);
            } catch (error) {
                console.error("Error fetching nutrition data:", error);
                setNutritionHistory([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNutritionData();
    }, [userData?.id]);

    const processedNutritionData = useMemo(() => {
        const today = new Date();
        const todayDateString = today.toISOString().split('T')[0];

        let todaysTotalCalories = 0;
        let todaysTotalProtein = 0;
        let todaysTotalCarbs = 0;
        let todaysTotalFats = 0;
        const todaysMealBreakdown: { [key: string]: number } = {
            Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0,
        };

        nutritionHistory.forEach(entry => {
            if (!entry.date || !entry.calories) return;
            const entryDate = new Date(entry.date).toISOString().split('T')[0];
            if (entryDate === todayDateString) {
                todaysTotalCalories += entry.calories || 0;
                todaysTotalProtein += entry.protein || 0;
                todaysTotalCarbs += entry.carbs || 0;
                todaysTotalFats += entry.fats || 0;

                const mealType = entry.mealType || "Snacks"; // Default to Snacks if undefined
                if (todaysMealBreakdown.hasOwnProperty(mealType)) {
                    todaysMealBreakdown[mealType] += entry.calories || 0;
                } else { // Handle potential other meal types by adding to snacks
                    todaysMealBreakdown["Snacks"] += entry.calories || 0;
                }
            }
        });

        const totalMacrosSum = todaysTotalProtein + todaysTotalCarbs + todaysTotalFats;
        const macroDistributionPercentages = totalMacrosSum > 0 ? [
            todaysTotalProtein / totalMacrosSum,
            todaysTotalCarbs / totalMacrosSum,
            todaysTotalFats / totalMacrosSum,
        ].map(p => parseFloat(p.toFixed(2))) : [0, 0, 0];


        const weeklyLabels: string[] = [];
        const weeklyCalorieValues: number[] = Array(7).fill(0);
        const weeklyProteinValues: number[] = Array(7).fill(0);
        const weeklyCarbValues: number[] = Array(7).fill(0);
        const weeklyFatValues: number[] = Array(7).fill(0);

        const dayMap = new Map<string, number>();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            weeklyLabels.push(getDayShortName(d));
            dayMap.set(d.toISOString().split('T')[0], 6 - i);
        }

        nutritionHistory.forEach(entry => {
            if (!entry.date) return;
            const entryDateString = new Date(entry.date).toISOString().split('T')[0];
            const index = dayMap.get(entryDateString);
            if (index !== undefined) {
                weeklyCalorieValues[index] += entry.calories || 0;
                weeklyProteinValues[index] += entry.protein || 0;
                weeklyCarbValues[index] += entry.carbs || 0;
                weeklyFatValues[index] += entry.fats || 0;
            }
        });

        return {
            todaysTotalCalories,
            todaysTotalProtein,
            todaysTotalCarbs,
            todaysTotalFats,
            todaysMealBreakdown,
            macroDistributionForChart: {
                labels: ["Protein", "Carbs", "Fats"],
                data: macroDistributionPercentages,
                colors: [COLORS.protein, COLORS.carbs, COLORS.fats],
            },
            weeklyCalorieData: {
                labels: weeklyLabels,
                datasets: [{
                    data: weeklyCalorieValues,
                    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                }],
                legend: ["Calories"],
            },
            weeklyMacroData: {
                labels: weeklyLabels,
                datasets: [
                    { data: weeklyProteinValues, color: (opacity = 1) => COLORS.protein, strokeWidth: 2 },
                    { data: weeklyCarbValues, color: (opacity = 1) => COLORS.carbs, strokeWidth: 2 },
                    { data: weeklyFatValues, color: (opacity = 1) => COLORS.fats, strokeWidth: 2 },
                ],
                legend: ["Protein (g)", "Carbs (g)", "Fats (g)"],
            },
        };
    }, [nutritionHistory]);

    const staticWeightHistory = [80, 79.2, 78.5, 77.8, 77.1, 76.5];
    const weightProgressData: ChartData = {
        labels: ["W1", "W2", "W3", "W4", "W5", "W6"],
        datasets: [
            {
                data: staticWeightHistory,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                strokeWidth: 2,
            },
        ],
        legend: ["Weight (kg)"],
    };

    const chartConfig = {
        backgroundColor: COLORS.card,
        backgroundGradientFrom: COLORS.card,
        backgroundGradientTo: COLORS.card,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: "5",
            strokeWidth: "2",
            stroke: COLORS.primary,
        },
    };

    const calculateRemainingDays = (): number => {
        if (!userData?.targetDate) return 0;
        const targetDate = new Date(userData.targetDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const diffTime = targetDate.getTime() - today.getTime();
        if (diffTime < 0) return 0;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const calorieGoal = DEFAULT_CALORIE_GOAL;
    const caloriesRemaining = Math.max(0, calorieGoal - processedNutritionData.todaysTotalCalories);
    const calorieProgressPercent = calorieGoal > 0 ? (processedNutritionData.todaysTotalCalories / calorieGoal) * 100 : 0;

    const summaryStartingWeight = staticWeightHistory[0];
    const summaryCurrentWeight = userData?.weight ?? staticWeightHistory[staticWeightHistory.length - 1];
    const summaryGoalWeight = userData?.goalWeight ?? summaryCurrentWeight;

    const summaryActualWeightChange = summaryStartingWeight - summaryCurrentWeight;
    const summaryTargetWeightChange = summaryStartingWeight - summaryGoalWeight;

    let summaryWeightProgressPercent = 0;
    if (summaryTargetWeightChange !== 0) {
        summaryWeightProgressPercent = (summaryActualWeightChange / summaryTargetWeightChange) * 100;
    } else if (summaryCurrentWeight === summaryStartingWeight) {
        summaryWeightProgressPercent = 100;
    }
    summaryWeightProgressPercent = Math.min(100, Math.max(0, parseFloat(summaryWeightProgressPercent.toFixed(0))));
    const summaryWeightChangeAmount = Math.abs(summaryActualWeightChange);
    const summaryWeightChangeDirection = summaryActualWeightChange > 0 ? 'lost' : (summaryActualWeightChange < 0 ? 'gained' : 'maintained');


    const CustomTabs = () => {
        const tabs = ["Calories", "Macros", "Weight"];
        return (
            <View style={styles.tabsContainer}>
                {tabs.map((tab, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.tab, selectedTab === index && styles.activeTab]}
                        onPress={() => setSelectedTab(index)}
                    >
                        <Text style={[styles.tabText, selectedTab === index && styles.activeTabText]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderMealBreakdown = (meal: string, calories: number, totalCalories: number, color: string) => {
        if (calories === 0) return null;
        const percentage = totalCalories > 0 ? (calories / totalCalories) * 100 : 0;
        return (
            <View style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>{meal}</Text>
                    <Text style={styles.breakdownValue}>{calories} cal</Text>
                </View>
                <View style={styles.breakdownBar}>
                    <View style={[styles.breakdownBarFill, { backgroundColor: color, width: `${percentage}%` }]} />
                </View>
            </View>
        );
    }

    const renderCaloriesTab = () => (
        <FlatList
            data={[1]}
            renderItem={() => (
                <>
                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Weekly Calorie Intake</Text>
                        <BarChart
                            data={processedNutritionData.weeklyCalorieData}
                            width={screenWidth - 32 - 10} // Card padding + chart padding
                            height={220}
                            yAxisLabel=""
                            yAxisSuffix=" kcal"
                            chartConfig={{
                                ...chartConfig,
                                barPercentage: 0.7,
                                propsForBackgroundLines: {
                                    strokeDasharray: "", // Solid lines
                                    stroke: COLORS.border,
                                },
                            }}
                            style={styles.chart}
                            fromZero
                            showBarTops={false}
                            verticalLabelRotation={0}
                        />
                    </Card>

                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Today's Summary</Text>
                        <View style={styles.summaryContainer}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{processedNutritionData.todaysTotalCalories}</Text>
                                <Text style={styles.summaryLabel}>Consumed</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
                                    {calorieGoal}
                                </Text>
                                <Text style={styles.summaryLabel}>Goal</Text>
                            </View>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressBarFill, { width: `${Math.min(100, calorieProgressPercent)}%` }]} />
                            </View>
                            <Text style={styles.progressText}>
                                {caloriesRemaining} kcal remaining
                            </Text>
                        </View>
                    </Card>

                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Today's Meal Breakdown</Text>
                        {renderMealBreakdown("Breakfast", processedNutritionData.todaysMealBreakdown.Breakfast, processedNutritionData.todaysTotalCalories, COLORS.breakfast)}
                        {renderMealBreakdown("Lunch", processedNutritionData.todaysMealBreakdown.Lunch, processedNutritionData.todaysTotalCalories, COLORS.lunch)}
                        {renderMealBreakdown("Dinner", processedNutritionData.todaysMealBreakdown.Dinner, processedNutritionData.todaysTotalCalories, COLORS.dinner)}
                        {renderMealBreakdown("Snacks", processedNutritionData.todaysMealBreakdown.Snacks, processedNutritionData.todaysTotalCalories, COLORS.snacks)}
                        {processedNutritionData.todaysTotalCalories === 0 && <Text style={styles.noDataText}>No meals logged for today.</Text>}
                    </Card>
                </>
            )}
            keyExtractor={(item, index) => `calories-tab-${index}`}
            contentContainerStyle={styles.tabContent}
            showsVerticalScrollIndicator={false}
        />
    );

    const renderMacrosTab = () => (
        <FlatList
            data={[1]}
            renderItem={() => (
                <>
                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Today's Macronutrients</Text>
                        <View style={styles.macroSummary}>
                            <View style={styles.macroItem}>
                                <Text style={[styles.macroValue, { color: COLORS.protein }]}>
                                    {processedNutritionData.todaysTotalProtein}g
                                </Text>
                                <Text style={styles.macroLabel}>Protein</Text>
                            </View>
                            <View style={styles.macroItem}>
                                <Text style={[styles.macroValue, { color: COLORS.carbs }]}>
                                    {processedNutritionData.todaysTotalCarbs}g
                                </Text>
                                <Text style={styles.macroLabel}>Carbs</Text>
                            </View>
                            <View style={styles.macroItem}>
                                <Text style={[styles.macroValue, { color: COLORS.fats }]}>
                                    {processedNutritionData.todaysTotalFats}g
                                </Text>
                                <Text style={styles.macroLabel}>Fats</Text>
                            </View>
                        </View>

                        <ProgressChart
                            data={processedNutritionData.macroDistributionForChart}
                            width={screenWidth - 32 - 10} // Card padding
                            height={180}
                            strokeWidth={15}
                            radius={28}
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1, index) =>
                                    processedNutritionData.macroDistributionForChart.colors?.[index ?? 0] ?? `rgba(0,0,0, ${opacity})`,
                            }}
                            hideLegend={false}
                            style={styles.chart}
                        />
                    </Card>

                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Weekly Macro Tracking</Text>
                        <LineChart
                            data={processedNutritionData.weeklyMacroData}
                            width={screenWidth - 32 - 10} // Card padding
                            height={250}
                            chartConfig={{
                                ...chartConfig,
                                propsForBackgroundLines: {
                                    strokeDasharray: "",
                                    stroke: COLORS.border,
                                },
                            }}
                            bezier
                            style={styles.chart}
                            fromZero
                        />
                    </Card>
                </>
            )}
            keyExtractor={(item, index) => `macros-tab-${index}`}
            contentContainerStyle={styles.tabContent}
            showsVerticalScrollIndicator={false}
        />
    );

    const renderWeightTab = () => (
        <FlatList
            data={[1]}
            renderItem={() => (
                <>
                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Weight Journey</Text>
                        <LineChart
                            data={weightProgressData}
                            width={screenWidth - 32 - 10} // Card padding
                            height={220}
                            chartConfig={{
                                ...chartConfig,
                                propsForBackgroundLines: {
                                    strokeDasharray: "",
                                    stroke: COLORS.border,
                                }
                            }}
                            bezier
                            style={styles.chart}
                            fromZero
                        />
                    </Card>

                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Weight Goal Summary</Text>
                        <View style={styles.weightSummary}>
                            <View style={styles.weightRow}>
                                <Text style={styles.weightLabel}>Starting Weight</Text>
                                <Text style={styles.weightValue}>{summaryStartingWeight.toFixed(1)} kg</Text>
                            </View>
                            <View style={styles.weightRow}>
                                <Text style={styles.weightLabel}>Current Weight</Text>
                                <Text style={styles.weightValue}>{summaryCurrentWeight.toFixed(1)} kg</Text>
                            </View>
                            <View style={styles.weightRow}>
                                <Text style={styles.weightLabel}>Goal Weight</Text>
                                <Text style={styles.weightValue}>{summaryGoalWeight.toFixed(1)} kg</Text>
                            </View>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressBarFill, { width: `${summaryWeightProgressPercent}%` }]} />
                            </View>
                            <Text style={styles.progressText}>
                                {summaryWeightProgressPercent}% to goal ({summaryWeightChangeAmount.toFixed(1)} kg {summaryWeightChangeDirection})
                            </Text>
                        </View>
                    </Card>

                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>Your Profile Goal</Text>
                        <View style={styles.goalInfoContainer}>
                            <View style={styles.goalInfoItem}>
                                <Text style={styles.goalInfoLabel}>Target Weight</Text>
                                <Text style={styles.goalInfoValue}>
                                    {userData?.goalWeight?.toFixed(1) ?? "N/A"} kg
                                </Text>
                            </View>
                            <View style={styles.goalInfoItem}>
                                <Text style={styles.goalInfoLabel}>Current Weight</Text>
                                <Text style={styles.goalInfoValue}>
                                    {userData?.weight?.toFixed(1) ?? "N/A"} kg
                                </Text>
                            </View>
                            <View style={styles.goalInfoItem}>
                                <Text style={styles.goalInfoLabel}>Days to Target Date</Text>
                                <Text style={styles.goalInfoValue}>
                                    {userData?.targetDate ? `${calculateRemainingDays()} days` : "N/A"}
                                </Text>
                            </View>
                        </View>
                    </Card>

                    <Card style={styles.card}>
                        <Text style={styles.cardTitle}>BMI Analysis</Text>
                        <View style={styles.bmiContainer}>
                            <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
                            <Text style={[styles.bmiCategoryText, { color: bmiCategory.color }]}>
                                {bmiCategory.label}
                            </Text>
                        </View>
                        <View style={styles.bmiScaleContainer}>
                            <View style={styles.bmiScale}>
                                <View style={[styles.bmiIndicator, { left: `${Math.min(Math.max((bmi / 40) * 100, 0), 99)}%` }]} />
                                <View style={[styles.bmiRange, { backgroundColor: COLORS.protein, flex: 18.5 }]} />
                                <View style={[styles.bmiRange, { backgroundColor: COLORS.success, flex: 24.9 - 18.5 }]} />
                                <View style={[styles.bmiRange, { backgroundColor: COLORS.warning, flex: 29.9 - 24.9 }]} />
                                <View style={[styles.bmiRange, { backgroundColor: COLORS.danger, flex: 40 - 29.9 }]} />
                            </View>
                            <View style={styles.bmiLabels}>
                                <Text style={styles.bmiLabelText}>Under</Text>
                                <Text style={styles.bmiLabelText}>Normal</Text>
                                <Text style={styles.bmiLabelText}>Over</Text>
                                <Text style={styles.bmiLabelText}>Obese</Text>
                            </View>
                            <View style={styles.bmiNumericLabels}>
                                <Text style={styles.bmiNumericLabelVal}>18.5</Text>
                                <Text style={styles.bmiNumericLabelVal}>18.5-24.9</Text>
                                <Text style={styles.bmiNumericLabelVal}>25-29.9</Text>
                                <Text style={styles.bmiNumericLabelVal}>30+</Text>
                            </View>
                        </View>
                        <Text style={styles.bmiDescription}>
                            BMI (Body Mass Index) is a value derived from the mass and height of a person.
                            {bmi < 18.5 ? " Your BMI suggests you are underweight. Consider focusing on nutrient-dense foods for healthy weight gain."
                                : bmi < 25 ? " Your BMI is in the normal weight range. Continue maintaining a healthy lifestyle."
                                    : bmi < 30 ? " Your BMI suggests you are overweight. A balanced diet and regular exercise can help."
                                        : " Your BMI is in the obese range. It's advisable to consult a healthcare professional for guidance."}
                        </Text>
                    </Card>
                </>
            )}
            keyExtractor={(item, index) => `weight-tab-${index}`}
            contentContainerStyle={styles.tabContent}
            showsVerticalScrollIndicator={false}
        />
    );

    const renderTabContent = () => {
        switch (selectedTab) {
            case 0: return renderCaloriesTab();
            case 1: return renderMacrosTab();
            case 2: return renderWeightTab();
            default: return renderCaloriesTab();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Your Progress</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading your progress data...</Text>
                </View>
            ) : (
                <View style={styles.contentContainer}>
                    <CustomTabs />
                    {renderTabContent()}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.light,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerText: {
        fontSize: 26,
        fontWeight: "bold",
        color: COLORS.dark,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.light,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 17,
        color: COLORS.muted,
    },
    contentContainer: {
        flex: 1,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        marginHorizontal: 4,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.muted,
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    tabContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 32,
    },
    card: {
        marginBottom: 20,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        elevation: 2,
        shadowColor: COLORS.dark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    cardTitle: {
        fontSize: 19,
        fontWeight: "600",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        color: COLORS.dark,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    chart: {
        marginVertical: 10,
        borderRadius: 8,
        paddingRight: 5, // Ensure labels fit for barchart
    },
    summaryContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 20,
    },
    summaryItem: {
        alignItems: "center",
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.primary,
    },
    summaryLabel: {
        fontSize: 14,
        color: COLORS.muted,
        marginTop: 6,
    },
    progressBarContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 8,
    },
    progressBar: {
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.light,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 5,
        backgroundColor: COLORS.primary,
    },
    progressText: {
        fontSize: 14,
        color: COLORS.muted,
        textAlign: "center",
        marginTop: 10,
    },
    macroSummary: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingVertical: 20,
    },
    macroItem: {
        alignItems: "center",
    },
    macroValue: {
        fontSize: 22,
        fontWeight: "bold",
    },
    macroLabel: {
        fontSize: 14,
        color: COLORS.muted,
        marginTop: 6,
    },
    breakdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    breakdownHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    breakdownLabel: {
        fontSize: 15,
        color: COLORS.dark,
        fontWeight: '500',
    },
    breakdownValue: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.muted,
    },
    breakdownBar: {
        height: 8,
        backgroundColor: COLORS.light,
        borderRadius: 4,
        overflow: "hidden",
    },
    breakdownBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    noDataText: {
        textAlign: 'center',
        color: COLORS.muted,
        paddingVertical: 20,
        fontSize: 15,
    },
    weightSummary: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
    },
    weightRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 9,
    },
    weightLabel: {
        fontSize: 15,
        color: COLORS.muted,
    },
    weightValue: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.dark,
    },
    goalInfoContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
    },
    goalInfoItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 9,
    },
    goalInfoLabel: {
        fontSize: 15,
        color: COLORS.muted,
    },
    goalInfoValue: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.dark,
    },
    bmiContainer: {
        alignItems: "center",
        paddingVertical: 20,
    },
    bmiValue: {
        fontSize: 48,
        fontWeight: "bold",
        color: COLORS.primary,
    },
    bmiCategoryText: { // Renamed from bmiCategory for clarity
        fontSize: 19,
        fontWeight: "600",
        marginTop: 8,
    },
    bmiScaleContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
        marginTop: 10,
    },
    bmiScale: {
        height: 14,
        borderRadius: 7,
        flexDirection: "row",
        overflow: "hidden",
        position: "relative",
        backgroundColor: COLORS.border, // Base for unfilled parts
    },
    bmiIndicator: {
        position: "absolute",
        width: 4,
        height: 22,
        backgroundColor: COLORS.dark,
        borderRadius: 2,
        top: -4,
        transform: [{ translateX: -2 }],
        zIndex: 10,
    },
    bmiRange: {
        height: "100%",
    },
    bmiLabels: {
        flexDirection: "row",
        justifyContent: "space-around", // Changed for better spacing
        marginTop: 8,
    },
    bmiLabelText: {
        fontSize: 12,
        color: COLORS.muted,
        textAlign: 'center',
        flex: 1, // Ensure equal spacing
        fontWeight: '500',
    },
    bmiNumericLabels: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 4,
    },
    bmiNumericLabelVal: { // Renamed from bmiNumericLabel
        fontSize: 11,
        color: COLORS.muted,
        flex: 1,
        textAlign: 'center',
    },
    bmiDescription: {
        fontSize: 14,
        lineHeight: 21,
        color: COLORS.muted,
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
        textAlign: 'left',
    },
});