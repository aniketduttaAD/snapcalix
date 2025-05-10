import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { Button, Card, Input, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RecentMeals } from '../../components/RecentMeals';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  SlideOutDown,
  SlideInUp
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useUserStore } from '@/utils/useUserStore';
import { logNutrition, getNutritionHistory, NutritionLogData } from '../../api/nutritionApi';
import { scanFoodImage } from '@/api/aiService';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function ScanScreen() {
  const { userData } = useUserStore();
  const router = useRouter();

  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<NutritionLogData[]>([]);

  const [selectedMealType, setSelectedMealType] = useState<string>('Breakfast');
  const [selectedMealTypeIndex, setSelectedMealTypeIndex] = useState(new IndexPath(0));
  const [servingSize, setServingSize] = useState<string>('1');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState<boolean | null>(null);

  const servingSizeUtil = (servingSize: string): number => {
    const normalizedServingSize = servingSize.toLowerCase().trim();

    const sizeMap: { [key: string]: number } = {
      "one slice": 1,
      "1 slice": 1,
      "one bowl": 1,
      "1 bowl": 1,
      "one plate": 1,
      "1 plate": 1,
      "two slices": 2,
      "2 slices": 2,
      "two bowls": 2,
      "2 bowls": 2,
      "two plates": 2,
      "2 plates": 2,
      "three slices": 3,
      "3 slices": 3,
      "three bowls": 3,
      "3 bowls": 3,
      "three plates": 3,
      "3 plates": 3,
      "half portion": 0.5,
      "1/2 portion": 0.5,
    };
    if (sizeMap[normalizedServingSize] !== undefined) {
      return sizeMap[normalizedServingSize];
    }
    const parsedSize = parseFloat(servingSize);
    if (!isNaN(parsedSize)) {
      return parsedSize;
    }
    return 1;
  };

  const cameraButtonScale = useSharedValue(1);
  const galleryButtonScale = useSharedValue(1);

  useEffect(() => {
    fetchRecentLogs();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const cameraPermissionResult = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(cameraPermissionResult.status === 'granted');

    const mediaLibraryPermissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setMediaLibraryPermission(mediaLibraryPermissionResult.status === 'granted');
  };

  const fetchRecentLogs = async () => {
    try {
      setLoading(true);
      const logs = await getNutritionHistory(userData?.id ?? "", new Date().toISOString(), new Date().toISOString());
      setRecentLogs(logs.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async () => {
    if (cameraPermission !== true) {
      const { status } = await Camera.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is needed to take photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return null;
      }

      setCameraPermission(true);
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error taking picture:', error);
      throw new Error('Failed to take picture');
    }
  };

  const pickImage = async () => {
    if (mediaLibraryPermission !== true) {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Media library permission is needed to select photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return null;
      }

      setMediaLibraryPermission(true);
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw new Error('Failed to select image');
    }
  };

  const handleTakePicture = async () => {
    try {
      cameraButtonScale.value = withTiming(0.9, { duration: 100 });
      setTimeout(() => {
        cameraButtonScale.value = withTiming(1, { duration: 100 });
      }, 100);

      const uri = await takePicture();
      if (uri) {
        setImage(uri);
        analyzeImage(uri);
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const handlePickImage = async () => {
    try {
      galleryButtonScale.value = withTiming(0.9, { duration: 100 });
      setTimeout(() => {
        galleryButtonScale.value = withTiming(1, { duration: 100 });
      }, 100);

      const uri = await pickImage();
      if (uri) {
        setImage(uri);
        analyzeImage(uri);
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to pick image');
      }
    }
  };

  const analyzeImage = async (uri: string) => {
    try {
      setAnalyzing(true);
      const analysisResult = await scanFoodImage(uri);
      console.log(analysisResult);

      const currentHour = new Date().getHours();
      let suggestedMealTypeIndex = 0;

      if (currentHour < 10) {
        suggestedMealTypeIndex = 0;
      } else if (currentHour < 15) {
        suggestedMealTypeIndex = 1;
      } else if (currentHour < 18) {
        suggestedMealTypeIndex = 3;
      } else {
        suggestedMealTypeIndex = 2;
      }

      setSelectedMealTypeIndex(new IndexPath(suggestedMealTypeIndex));
      setSelectedMealType(MEAL_TYPES[suggestedMealTypeIndex]);

      if (analysisResult.possible_serving_size) {
        const sizeMatch = analysisResult.possible_serving_size.match(/\d+(\.\d+)?/);
        if (sizeMatch) {
          setServingSize(sizeMatch[0]);
        }
      }

      setResult(analysisResult);
    } catch (error) {
      console.error('Error analyzing image:', error);
      Alert.alert('Analysis Failed', 'We couldn\'t analyze your food. Please try again.');
      setImage(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveLog = async () => {
    setShowConfirmModal(true);
  };

  const confirmSaveLog = async () => {
    if (!result) return;

    try {
      setLoading(true);
      setShowConfirmModal(false);

      const servingSizeNum = servingSizeUtil(result.possible_serving_size);
      const nutritionData: NutritionLogData = {
        date: new Date().toISOString(),
        mealType: selectedMealType as any,
        meal_name: result.meal_name,
        calories: Math.round(result.calories * servingSizeNum),
        protein: Math.round(result.protein * servingSizeNum),
        carbs: Math.round(result.carbs * servingSizeNum),
        fats: Math.round(result.fats * servingSizeNum),
        ingredients: result.ingredients
      };

      await logNutrition(nutritionData, userData?.id ?? "");
      setRecentLogs([nutritionData, ...recentLogs].slice(0, 5));
      setImage(null);
      setResult(null);
      setServingSize('1');
    } catch (error) {
      console.error('Error saving log:', error);
      Alert.alert('Error', 'Failed to save your food log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAnalysis = () => {
    setImage(null);
    setResult(null);
    setServingSize('1');
  };

  const handleMealPress = (meal: any) => {
    Alert.alert(
      meal.mealName,
      `Calories: ${meal.calories}\nProtein: ${meal.protein}g\nCarbs: ${meal.carbs}g\nFats: ${meal.fats}g`
    );
  };

  const cameraButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: cameraButtonScale.value }],
    };
  });

  const galleryButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: galleryButtonScale.value }],
    };
  });

  const renderRecentLogsSection = () => (
    <View style={styles.recentLogsSection}>
      <Text style={styles.sectionTitle}>Recent Logs</Text>
      {loading && !analyzing ? (
        <ActivityIndicator size="small" color="#4F46E5" />
      ) : (
        <RecentMeals meals={recentLogs} onMealPress={handleMealPress} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>Scan Your Food</Text>
        </View>

        {!userData && (
          <Animated.View
            style={styles.profileAlert}
            entering={FadeIn.duration(500)}
          >
            <Text style={styles.profileAlertTitle}>Complete Your Profile</Text>
            <Text style={styles.profileAlertText}>
              Set up your profile to get personalized nutrition recommendations.
            </Text>
            <Button onPress={() => router.push('/onboarding')} size="small">
              Set Up Profile
            </Button>
          </Animated.View>
        )}

        {!image ? (
          <Animated.View
            style={styles.scanContainer}
            entering={FadeIn.duration(500)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="camera" size={60} color="#4F46E5" />
            </View>
            <Text style={styles.scanText}>
              Take a photo or select an image of your food to get instant nutrition information
            </Text>
            <View style={styles.buttonRow}>
              <Animated.View style={[styles.buttonWrapper, cameraButtonStyle]}>
                <Button
                  appearance="filled"
                  status="primary"
                  accessoryLeft={() => <Ionicons name="camera" size={20} color="white" />}
                  onPress={handleTakePicture}
                  style={styles.scanButton}
                >
                  Take Photo
                </Button>
              </Animated.View>

              <Animated.View style={[styles.buttonWrapper, galleryButtonStyle]}>
                <Button
                  appearance="outline"
                  status="primary"
                  accessoryLeft={() => <Ionicons name="image" size={20} color="#4F46E5" />}
                  onPress={handlePickImage}
                  style={styles.scanButton}
                >
                  Choose Image
                </Button>
              </Animated.View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            style={styles.analysisContainer}
            entering={SlideInUp.springify().damping(15)}
            exiting={SlideOutDown.springify().damping(15)}
          >
            <Image
              source={{ uri: image }}
              style={styles.foodImage}
              resizeMode="cover"
            />

            {analyzing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Analyzing your food with AI...</Text>
              </View>
            ) : result ? (
              <Card style={styles.nutritionCard}>
                <View style={styles.nutritionHeader}>
                  <Text style={styles.nutritionTitle}>{result.meal_name}</Text>
                  <TouchableOpacity onPress={handleCancelAnalysis}>
                    <Ionicons name="close-circle" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.servingContainer}>
                  <Text style={styles.servingLabel}>Serving Size:</Text>
                  <View style={styles.servingInputContainer}>
                    <TouchableOpacity
                      style={styles.servingButton}
                      onPress={() => {
                        const newValue = Math.max(0.5, parseFloat(servingSize) - 0.5);
                        setServingSize(newValue.toString());
                      }}
                      disabled={parseFloat(servingSize) <= 0.5}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={parseFloat(servingSize) <= 0.5 ? '#CCCCCC' : '#4F46E5'}
                      />
                    </TouchableOpacity>

                    <Input
                      style={styles.servingInput}
                      value={servingSize}
                      onChangeText={setServingSize}
                      keyboardType="numeric"
                      textStyle={{ textAlign: 'center' }}
                    />

                    <TouchableOpacity
                      style={styles.servingButton}
                      onPress={() => {
                        const newValue = parseFloat(servingSize) + 0.5;
                        setServingSize(newValue.toString());
                      }}
                    >
                      <Ionicons name="add" size={18} color="#4F46E5" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.macroContainer}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {Math.round(result.calories * (parseFloat(servingSize) || 1))}
                    </Text>
                    <Text style={styles.macroLabel}>Calories</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, styles.proteinColor]}>
                      {Math.round(result.protein * (parseFloat(servingSize) || 1))}g
                    </Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, styles.carbsColor]}>
                      {Math.round(result.carbs * (parseFloat(servingSize) || 1))}g
                    </Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={[styles.macroValue, styles.fatsColor]}>
                      {Math.round(result.fats * (parseFloat(servingSize) || 1))}g
                    </Text>
                    <Text style={styles.macroLabel}>Fats</Text>
                  </View>
                </View>

                <Text style={styles.ingredientsLabel}>Ingredients:</Text>
                <Text style={styles.ingredientsText}>{result.ingredients.join(', ')}</Text>

                <View style={styles.mealTypeContainer}>
                  <Text style={styles.mealTypeLabel}>Meal Type:</Text>
                  <Select
                    style={styles.mealTypeSelect}
                    selectedIndex={selectedMealTypeIndex}
                    value={selectedMealType}
                    onSelect={index => {
                      if (index instanceof IndexPath) {
                        setSelectedMealTypeIndex(index);
                        setSelectedMealType(MEAL_TYPES[index.row]);
                      }
                    }}
                  >
                    {MEAL_TYPES.map(type => (
                      <SelectItem key={type} title={type} />
                    ))}
                  </Select>
                </View>

                <Button
                  onPress={handleSaveLog}
                  disabled={loading}
                  style={styles.logButton}
                >
                  {loading ? 'Saving...' : 'Log This Meal'}
                </Button>
              </Card>
            ) : null}
          </Animated.View>
        )}
      </KeyboardAwareScrollView>

      {renderRecentLogsSection()}

      <Modal
        transparent
        visible={showConfirmModal}
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="restaurant-outline"
                    size={32}
                    color="#4F46E5"
                  />
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Log This Meal</Text>
                <Text style={styles.modalMessage}>
                  Are you sure you want to log this meal as {selectedMealType}?
                </Text>

                <View style={styles.modalButtonContainer}>
                  <Button
                    appearance="ghost"
                    status="basic"
                    onPress={() => setShowConfirmModal(false)}
                    style={styles.modalCancelButton}
                  >
                    Cancel
                  </Button>

                  <Button
                    status="primary"
                    onPress={confirmSaveLog}
                    style={styles.modalConfirmButton}
                  >
                    Log Meal
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    position: 'relative',
  },
  scrollViewContent: {
    paddingBottom: 16,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  profileAlert: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  profileAlertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileAlertText: {
    marginBottom: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  scanContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scanText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonWrapper: {
    flex: 1,
    margin: 8,
  },
  scanButton: {
    flex: 1,
  },
  analysisContainer: {
    margin: 16,
  },
  foodImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  nutritionCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nutritionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  servingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  servingLabel: {
    fontSize: 16,
  },
  servingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  servingInput: {
    width: 70,
    marginHorizontal: 8,
  },
  macroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
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
  ingredientsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ingredientsText: {
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  mealTypeContainer: {
    marginBottom: 16,
  },
  mealTypeLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  mealTypeSelect: {
    width: '100%',
  },
  logButton: {
    marginTop: 8,
  },
  recentLogsSection: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1F2937',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalConfirmButton: {
    flex: 1,
  },
});