import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Meal as ApiMeal } from "@/api/mealPlanApi";

export interface MappedMealData {
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

interface MealCardProps {
    meal: MappedMealData;
    showAlternative?: boolean;
    onPress?: (mealData: MappedMealData) => void;
}

const COLORS_CARD = {
    primary: "#4F46E5",
    textPrimary: "#1F2937",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    backgroundLight: "#F9FAFB",
    white: "#FFFFFF",
    border: "#E5E7EB",
    protein: "#3B82F6",
    carbs: "#10B981",
    fats: "#F59E0B",
    shadow: "#4A5568",
};

export const MealCard: React.FC<MealCardProps> = ({
    meal,
    showAlternative = true,
    onPress,
}) => {
    const router = useRouter();

    const handleMainMealPress = () => {
        if (onPress) onPress(meal);
        else if (meal.name) router.push(`/meals/${encodeURIComponent(meal.name)}`);
    };

    const handleAlternativePress = () => {
        if (meal.alternative?.name)
            router.push(`/meals/${encodeURIComponent(meal.alternative.name)}`);
    };

    const placeholderImage = require("@/assets/meal.jpg");

    return (
        <View style={styles.cardWrapper}>
            <TouchableOpacity
                onPress={handleMainMealPress}
                activeOpacity={0.8}
                style={styles.cardTouchable}
            >
                <View style={styles.cardInner}>
                    <View style={styles.imageWrapper}>
                        <Image
                            source={meal.image ? { uri: meal.image } : placeholderImage}
                            style={styles.mealImage}
                            resizeMode='cover'
                            defaultSource={placeholderImage}
                        />
                        <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.7)"]}
                            style={styles.imageOverlay}
                        />
                        <View style={styles.caloriesBadge}>
                            <Ionicons
                                name='flame-outline'
                                size={14}
                                color={COLORS_CARD.white}
                            />
                            <Text style={styles.caloriesText}>{meal.calories} kcal</Text>
                        </View>
                    </View>

                    <View style={styles.contentWrapper}>
                        <Text style={styles.mealName} numberOfLines={2}>
                            {meal.name}
                        </Text>
                        {meal.protein !== undefined &&
                            meal.carbs !== undefined &&
                            meal.fats !== undefined && (
                                <View style={styles.macrosRow}>
                                    <MacroItem
                                        value={meal.protein}
                                        label='Protein'
                                        color={COLORS_CARD.protein}
                                    />
                                    <MacroItem
                                        value={meal.carbs}
                                        label='Carbs'
                                        color={COLORS_CARD.carbs}
                                    />
                                    <MacroItem
                                        value={meal.fats}
                                        label='Fats'
                                        color={COLORS_CARD.fats}
                                    />
                                </View>
                            )}
                        <Text style={styles.ingredientsText} numberOfLines={2}>
                            Ingredients: {meal.ingredients.slice(0, 3).join(", ")}
                            {meal.ingredients.length > 3 ? "..." : ""}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            {showAlternative && meal.alternative && (
                <View style={styles.alternativeContainer}>
                    <View style={styles.separatorLine} />
                    <TouchableOpacity
                        onPress={handleAlternativePress}
                        activeOpacity={0.8}
                    >
                        <View style={styles.alternativeHeader}>
                            <Ionicons
                                name='shuffle-outline'
                                size={18}
                                color={COLORS_CARD.primary}
                            />
                            <Text style={styles.alternativeTitle}>Alternative Option</Text>
                        </View>
                        <View style={styles.alternativeContentRow}>
                            {meal.alternative.image && (
                                <Image
                                    source={
                                        meal.alternative.image
                                            ? { uri: meal.alternative.image }
                                            : placeholderImage
                                    }
                                    style={styles.alternativeImage}
                                    defaultSource={placeholderImage}
                                />
                            )}
                            <View style={styles.alternativeDetails}>
                                <Text style={styles.alternativeName} numberOfLines={1}>
                                    {meal.alternative.name}
                                </Text>
                                <Text style={styles.alternativeInfoText}>
                                    {meal.alternative.calories} kcal
                                    {meal.alternative.ingredients &&
                                        meal.alternative.ingredients.length > 0 &&
                                        ` • ${meal.alternative.ingredients[0]}`}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const MacroItem: React.FC<{ value?: number; label: string; color: string }> = ({
    value,
    label,
    color,
}) => (
    <View style={styles.macroItem}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={styles.macroValueText}>{value || 0}g</Text>
        <Text style={styles.macroLabelText}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    cardWrapper: {
        backgroundColor: COLORS_CARD.white,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: COLORS_CARD.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        overflow: "hidden",
    },
    cardTouchable: {},
    cardInner: {
        flexDirection: "row",
        padding: 12,
    },
    imageWrapper: {
        width: 100,
        height: 100,
        borderRadius: 12,
        overflow: "hidden",
        marginRight: 12,
        backgroundColor: COLORS_CARD.backgroundLight,
    },
    mealImage: {
        width: "100%",
        height: "100%",
    },
    imageOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60%",
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    caloriesBadge: {
        position: "absolute",
        bottom: 8,
        left: 8,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.65)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
    },
    caloriesText: {
        color: COLORS_CARD.white,
        fontWeight: "600",
        fontSize: 11,
        marginLeft: 4,
    },
    contentWrapper: {
        flex: 1,
        justifyContent: "space-between",
    },
    mealName: {
        fontSize: 17,
        fontWeight: "bold",
        color: COLORS_CARD.textPrimary,
        marginBottom: 6,
    },
    macrosRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
        paddingVertical: 4,
    },
    macroItem: {
        alignItems: "flex-start",
        flex: 1,
        flexDirection: "row",
    },
    macroDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 5,
        marginTop: 4,
    },
    macroValueText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS_CARD.textPrimary,
        marginRight: 3,
    },
    macroLabelText: {
        fontSize: 13,
        color: COLORS_CARD.textSecondary,
    },
    ingredientsText: {
        color: COLORS_CARD.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
    separatorLine: {
        height: 1,
        backgroundColor: COLORS_CARD.border,
        marginHorizontal: -12,
        marginBottom: 12,
    },
    alternativeContainer: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 0,
    },
    alternativeHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    alternativeTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS_CARD.primary,
        marginLeft: 6,
    },
    alternativeContentRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    alternativeImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 10,
        backgroundColor: COLORS_CARD.backgroundLight,
    },
    alternativeDetails: {
        flex: 1,
    },
    alternativeName: {
        fontWeight: "600",
        fontSize: 14,
        color: COLORS_CARD.textPrimary,
        marginBottom: 2,
    },
    alternativeInfoText: {
        color: COLORS_CARD.textSecondary,
        fontSize: 12,
    },
});
