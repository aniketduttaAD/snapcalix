import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Card } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

interface Meal {
    id?: string;
    date?: string;
    mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    meal_name: string;
    imageUri?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    ingredients: string[];
}

interface RecentMealsProps {
    meals: Meal[];
    onMealPress?: (meal: Meal) => void;
    emptyStateMessage?: string;
}

export const RecentMeals: React.FC<RecentMealsProps> = ({
    meals,
    onMealPress,
    emptyStateMessage = "You haven't logged any meals yet. Scan your food to get started!"
}) => {
    const router = useRouter();

    if (meals.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="restaurant-outline" size={60} color="#E5E7EB" />
                <Text style={styles.emptyText}>{emptyStateMessage}</Text>
            </View>
        );
    }

    const renderMealItem = ({ item, index }: { item: Meal, index: number }) => {
        const date = new Date(item?.date ?? new Date());
        const formattedDate = date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const formattedTime = date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });

        return (
            <Animated.View entering={FadeInRight.delay(index * 100).duration(300)}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onMealPress ? onMealPress(item) : null}
                >
                    <Card style={styles.mealCard}>
                        <View style={styles.mealHeader}>
                            <View style={styles.mealInfo}>
                                <Text style={styles.mealName}>{item.meal_name}</Text>
                                <Text style={styles.mealMeta}>
                                    {item.mealType} • {formattedDate} • {formattedTime}
                                </Text>
                            </View>
                            <Text style={styles.calories}>{item.calories} cal</Text>
                        </View>

                        {item.imageUri && (
                            <Image
                                source={{ uri: item.imageUri }}
                                style={styles.mealImage}
                                resizeMode="cover"
                            />
                        )}

                        <View style={styles.macrosContainer}>
                            <View style={styles.macroItem}>
                                <Text style={[styles.macroValue, styles.proteinColor]}>{item.protein}g</Text>
                                <Text style={styles.macroLabel}>Protein</Text>
                            </View>
                            <View style={styles.macroItem}>
                                <Text style={[styles.macroValue, styles.carbsColor]}>{item.carbs}g</Text>
                                <Text style={styles.macroLabel}>Carbs</Text>
                            </View>
                            <View style={styles.macroItem}>
                                <Text style={[styles.macroValue, styles.fatsColor]}>{item.fats}g</Text>
                                <Text style={styles.macroLabel}>Fats</Text>
                            </View>
                        </View>
                    </Card>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <FlatList
            data={meals}
            renderItem={renderMealItem}
            keyExtractor={(item, index) => item.id || index.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    listContainer: {
        paddingBottom: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 20,
    },
    emptyText: {
        marginTop: 20,
        textAlign: 'center',
        color: '#6B7280',
        lineHeight: 20,
    },
    mealCard: {
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    mealHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    mealInfo: {
        flex: 1,
    },
    mealName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    mealMeta: {
        fontSize: 12,
        color: '#6B7280',
    },
    calories: {
        fontWeight: 'bold',
        color: '#4F46E5',
    },
    mealImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 12,
    },
    macrosContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    macroItem: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    macroValue: {
        fontWeight: 'bold',
    },
    macroLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    proteinColor: {
        color: '#3B82F6',
    },
    carbsColor: {
        color: '#10B981',
    },
    fatsColor: {
        color: '#F59E0B',
    },
});