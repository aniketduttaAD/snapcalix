import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Share,
    Animated,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@ui-kitten/components';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMealDetails, Meal } from '../../api/mealPlanApi';
import { logNutrition, NutritionLogData } from '../../api/nutritionApi';
import { getNutritionEstimate } from '@/api/aiService';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/utils/useUserStore';

const DEFAULT_MEAL_IMAGE = "https://blogs.biomedcentral.com/on-medicine/wp-content/uploads/sites/6/2019/09/iStock-1131794876.t5d482e40.m800.xtDADj9SvTVFjzuNeGuNUUGY4tm5d6UGU5tkKM0s3iPk-620x342.jpg";

interface NutritionEstimateAI {
    description: string;
    tips?: string[];
}

export default function MealDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [meal, setMeal] = useState<Meal | null>(null);
    const [loading, setLoading] = useState(true);
    const [servingSize, setServingSize] = useState(1);
    const [showVideo, setShowVideo] = useState(false);
    const [nutritionEstimate, setNutritionEstimate] = useState<NutritionEstimateAI | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { userData } = useUserStore();

    const scrollY = useRef(new Animated.Value(0)).current;
    const HEADER_MAX_HEIGHT = 300;
    const HEADER_MIN_HEIGHT = 60;
    const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

    const imageTranslate = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [0, -HEADER_SCROLL_DISTANCE / 2],
        extrapolate: 'clamp',
    });

    const imageOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 1.5],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [HEADER_SCROLL_DISTANCE * 0.8, HEADER_SCROLL_DISTANCE],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    useEffect(() => {
        if (id && userData?.id) {
            const mealName = decodeURIComponent(id as string);
            fetchMealDetails(mealName, userData.id);
        } else if (id && !userData?.id) {
            setError("User data not found. Please log in.");
            setLoading(false);
        }
    }, [id, userData?.id]);

    const fetchMealDetails = async (mealName: string, userId: string) => {
        try {
            setLoading(true);
            setError(null);
            setNutritionEstimate(null);

            const mealData = await getMealDetails(userId, mealName);
            setMeal(mealData);

            if (mealData?.ingredients && mealData.ingredients.length > 0) {
                try {
                    const aiEstimate = await getNutritionEstimate({
                        name: mealData.name,
                        ingredients: mealData.ingredients
                    });
                    setNutritionEstimate(aiEstimate);
                } catch (nutritionError) {
                    console.warn('Could not fetch AI nutrition estimate:', nutritionError);
                }
            }
        } catch (err) {
            console.error('Error fetching meal details:', err);
            setError('Failed to load meal details. Please try again.');
            setMeal(null);
        } finally {
            setLoading(false);
        }
    };

    const handleLogMeal = async () => {
        if (!meal || !userData?.id) {
            alert('Meal data or user information is missing.');
            return;
        }

        try {
            const currentDate = new Date().toISOString().split('T')[0];
            const mealType = determineMealType();

            const nutritionData: NutritionLogData = {
                date: currentDate,
                mealType: mealType,
                meal_name: meal.name,
                imageUri: meal.image || undefined,
                calories: Math.round(meal.nutritionValues.calories * servingSize),
                protein: Math.round(meal.nutritionValues.protein * servingSize),
                carbs: Math.round(meal.nutritionValues.carbs * servingSize),
                fats: Math.round(meal.nutritionValues.fats * servingSize),
                ingredients: meal.ingredients,
            };

            await logNutrition(nutritionData, userData.id);

            alert('Meal logged successfully!');
            router.back();
        } catch (err) {
            console.error('Error logging meal:', err);
            alert('Failed to log meal. Please try again.');
        }
    };

    const determineMealType = (): 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' => {
        const currentHour = new Date().getHours();
        if (currentHour >= 4 && currentHour < 11) return 'Breakfast';
        if (currentHour >= 11 && currentHour < 16) return 'Lunch';
        if (currentHour >= 20 || currentHour < 4) return 'Dinner';
        return 'Snack';
    };

    const handleShareMeal = async () => {
        if (!meal) return;
        try {
            const message = `Check out this ${meal.name} recipe! Find it on SnapCalix.
Calories: ${meal.nutritionValues.calories}, Protein: ${meal.nutritionValues.protein}g, Carbs: ${meal.nutritionValues.carbs}g, Fats: ${meal.nutritionValues.fats}g.`;
            await Share.share({
                message,
                title: `${meal.name} Recipe`,
            });
        } catch (err) {
            console.error('Error sharing meal:', err);
        }
    };

    const handleOpenVideo = () => {
        if (meal?.videoUrl) {
            setShowVideo(true);
        }
    };

    const handleCloseVideo = () => setShowVideo(false);

    const getYouTubeVideoId = (url: string | undefined): string | null => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const getYouTubeThumbnail = (url: string | undefined): string => {
        const videoId = getYouTubeVideoId(url);
        return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
    };

    const videoId = getYouTubeVideoId(meal?.videoUrl);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;


    if (loading) {
        return (
            <SafeAreaView style={styles.centeredScreen}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.infoText}>Loading meal details...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.centeredScreen}>
                <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
                <Text style={styles.errorTitle}>Oops! Something went wrong.</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Button onPress={() => router.back()} style={styles.actionButton}>Go Back</Button>
            </SafeAreaView>
        );
    }

    if (!meal) {
        return (
            <SafeAreaView style={styles.centeredScreen}>
                <Ionicons name="help-circle-outline" size={60} color="#6B7280" />
                <Text style={styles.errorTitle}>Meal Not Found</Text>
                <Text style={styles.errorText}>We couldn't find the meal you're looking for.</Text>
                <Button onPress={() => router.back()} style={styles.actionButton}>Go Back</Button>
            </SafeAreaView>
        );
    }

    const adjustedNutrition = {
        calories: Math.round(meal.nutritionValues.calories * servingSize),
        protein: Math.round(meal.nutritionValues.protein * servingSize),
        carbs: Math.round(meal.nutritionValues.carbs * servingSize),
        fats: Math.round(meal.nutritionValues.fats * servingSize),
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <Stack.Screen
                options={{
                    headerTitle: '',
                    headerBackTitle: 'Back',
                    headerTransparent: true,
                    headerTintColor: '#FFFFFF',
                    headerRight: () => (
                        <TouchableOpacity onPress={handleShareMeal} style={styles.headerButton}>
                            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    ),
                }}
            />

            {/* Custom Animated Sticky Header */}
            <Animated.View style={[styles.stickyHeaderContainer, { opacity: headerOpacity }]}>
                <BlurView intensity={90} tint="light" style={styles.blurView}>
                    <Text style={styles.stickyHeaderTitle} numberOfLines={1}>{meal.name}</Text>
                </BlurView>
            </Animated.View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT }}
            >
                <View style={styles.contentContainer}>
                    <Text style={styles.mealTitle}>{meal.name}</Text>
                    {meal.timeInMinutes > 0 && (
                        <View style={styles.timeContainer}>
                            <Ionicons name="time-outline" size={18} color="#6B7280" />
                            <Text style={styles.timeText}>{meal.timeInMinutes} minutes</Text>
                        </View>
                    )}

                    {/* Serving Size Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Serving Size</Text>
                        <View style={styles.servingSizeControls}>
                            <TouchableOpacity
                                style={styles.servingButton}
                                onPress={() => setServingSize(Math.max(0.5, servingSize - 0.5))}
                                disabled={servingSize <= 0.5}
                            >
                                <Ionicons name="remove-circle-outline" size={28} color={servingSize <= 0.5 ? '#D1D5DB' : '#4F46E5'} />
                            </TouchableOpacity>
                            <Text style={styles.servingValue}>{servingSize.toFixed(1)}</Text>
                            <TouchableOpacity
                                style={styles.servingButton}
                                onPress={() => setServingSize(servingSize + 0.5)}
                            >
                                <Ionicons name="add-circle-outline" size={28} color="#4F46E5" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Nutritional Information (per serving)</Text>
                        <View style={styles.macroGrid}>
                            {[
                                { label: 'Calories', value: adjustedNutrition.calories, unit: '', color: '#3B82F6' },
                                { label: 'Protein', value: adjustedNutrition.protein, unit: 'g', color: '#10B981' },
                                { label: 'Carbs', value: adjustedNutrition.carbs, unit: 'g', color: '#F59E0B' },
                                { label: 'Fats', value: adjustedNutrition.fats, unit: 'g', color: '#EF4444' },
                            ].map(macro => (
                                <View key={macro.label} style={styles.macroItem}>
                                    <Text style={[styles.macroValue, { color: macro.color }]}>{macro.value}{macro.unit}</Text>
                                    <Text style={styles.macroLabel}>{macro.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ingredients</Text>
                        {meal.ingredients.map((ingredient: string, index: number) => (
                            <View key={index} style={styles.listItem}>
                                <Ionicons name="ellipse" size={8} color="#4F46E5" style={styles.bulletIcon} />
                                <Text style={styles.listItemText}>{ingredient}</Text>
                            </View>
                        ))}
                    </View>

                    {meal.procedure && meal.procedure.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Instructions</Text>
                            {meal.procedure.map((step: string, index: number) => (
                                <View key={index} style={styles.stepItem}>
                                    <View style={styles.stepNumberCircle}>
                                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.stepText}>{step}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {embedUrl && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Cooking Video</Text>
                            <TouchableOpacity onPress={handleOpenVideo} style={styles.videoThumbnailContainer}>
                                <Image
                                    source={{ uri: getYouTubeThumbnail(meal.videoUrl) } ?? ""}
                                    style={styles.videoThumbnail}
                                    resizeMode="cover"
                                />
                                <View style={styles.playIconCircle}>
                                    <Ionicons name="play" size={30} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Button
                        onPress={handleLogMeal}
                        style={styles.logMealButton}
                        accessoryLeft={<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />}
                    >
                        Log This Meal
                    </Button>
                    <View style={styles.bottomSpacer} />
                </View>
            </Animated.ScrollView>

            <Animated.View style={[styles.heroImageContainer, { transform: [{ translateY: imageTranslate }], opacity: imageOpacity }]}>
                <Image
                    source={{ uri: "https://blogs.biomedcentral.com/on-medicine/wp-content/uploads/sites/6/2019/09/iStock-1131794876.t5d482e40.m800.xtDADj9SvTVFjzuNeGuNUUGY4tm5d6UGU5tkKM0s3iPk-620x342.jpg" }}
                    style={styles.heroImage}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
                    style={styles.heroGradient}
                />
            </Animated.View>


            {showVideo && embedUrl && (
                <View style={styles.videoModalOverlay}>
                    <View style={styles.videoModalContent}>
                        <View style={styles.videoModalHeader}>
                            <Text style={styles.videoModalTitle} numberOfLines={1}>{meal.name}</Text>
                            <TouchableOpacity onPress={handleCloseVideo}>
                                <Ionicons name="close-circle" size={28} color="#4F46E5" />
                            </TouchableOpacity>
                        </View>
                        <WebView
                            source={{ uri: embedUrl }}
                            style={styles.webView}
                            allowsFullscreenVideo
                            javaScriptEnabled
                            domStorageEnabled
                        />
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB', // Light background for content area
    },
    centeredScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F9FAFB',
    },
    infoText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    actionButton: {
        marginTop: 16,
        width: '60%',
    },
    headerButton: {
        padding: 8,
        marginRight: 8,
    },
    stickyHeaderContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 10,
        paddingTop: Platform.OS === 'ios' ? 30 : 10,
    },
    blurView: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 50,
    },
    stickyHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    heroImageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 300,
        zIndex: 0,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
    },
    contentContainer: {
        padding: 20,
        backgroundColor: '#F9FAFB',
        minHeight: '100%',
    },
    mealTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    timeText: {
        fontSize: 15,
        color: '#6B7280',
        marginLeft: 6,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#4A5568',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    servingSizeControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    servingButton: {
        padding: 8,
    },
    servingValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        minWidth: 60,
        textAlign: 'center',
        marginHorizontal: 12,
    },
    macroGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    macroItem: {
        alignItems: 'center',
        width: '45%',
        marginBottom: 16,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
    },
    macroValue: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    macroLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 4,
        textTransform: 'uppercase',
    },
    aiEstimateBox: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#EEF2FF',
        borderRadius: 8,
    },
    aiEstimateTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4338CA',
        marginBottom: 8,
    },
    aiEstimateDescription: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        marginBottom: 8,
    },
    tipsList: {
        marginTop: 8,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    tipIcon: {
        marginRight: 8,
        marginTop: 3,
    },
    tipText: {
        fontSize: 13,
        color: '#4B5563',
        flex: 1,
        lineHeight: 18,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    bulletIcon: {
        marginRight: 12,
    },
    listItemText: {
        fontSize: 16,
        color: '#374151',
        flex: 1,
        lineHeight: 22,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    stepNumberCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EDE9FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    stepNumberText: {
        color: '#4F46E5',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepText: {
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
        color: '#374151',
    },
    videoThumbnailContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        aspectRatio: 16 / 9,
        backgroundColor: '#E5E7EB', // Placeholder
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
    },
    playIconCircle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -25 }, { translateY: -25 }],
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logMealButton: {
        marginTop: 24,
        borderRadius: 12,
        paddingVertical: 8,
    },
    bottomSpacer: {
        height: 30,
    },
    videoModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    videoModalContent: {
        width: '95%',
        height: '60%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    videoModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    videoModalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
        marginRight: 8,
    },
    webView: {
        flex: 1,
        width: '100%',
    },
});