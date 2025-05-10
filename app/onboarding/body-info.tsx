import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Platform,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Button,
    Input,
    Select,
    SelectItem,
    IndexPath,
} from "@ui-kitten/components";
import { router } from "expo-router";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useUserStore } from "@/utils/useUserStore";

const feetOptions = Array.from({ length: 8 }, (_, i) => `${i + 1} ft`);
const inchesOptions = Array.from({ length: 12 }, (_, i) => `${i} in`);

const calculateLocalBMI = (heightCm: number, weightKg: number): number => {
    if (heightCm <= 0 || weightKg <= 0) return 0;
    const heightInMeters = heightCm / 100;
    return weightKg / (heightInMeters * heightInMeters);
};
export const convertHeightToCm = (feet: number, inches: number): number => {
    return Math.round((feet * 30.48) + (inches * 2.54));
};

export default function BodyInfoScreen() {
    const { userData, updateUserData } = useUserStore();
    const [selectedFeetIndex, setSelectedFeetIndex] = useState<IndexPath | null>(
        null
    );
    const [selectedInchesIndex, setSelectedInchesIndex] =
        useState<IndexPath | null>(null);
    const [weight, setWeight] = useState("");
    const [goalWeight, setGoalWeight] = useState("");
    const [bmi, setBmi] = useState<number | null>(null);

    const minTargetDate = new Date();
    minTargetDate.setDate(minTargetDate.getDate() + 30);
    const maxTargetDate = new Date();
    maxTargetDate.setFullYear(maxTargetDate.getFullYear() + 2);

    const [targetDate, setTargetDate] = useState<Date>(() => {
        const initialTarget = new Date(minTargetDate);
        initialTarget.setDate(initialTarget.getDate() + 60); // Default to 90 days from today (30 + 60)
        return initialTarget;
    });

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        if (userData) {
            const defaultFeet =
                userData.heightFeet &&
                    userData.heightFeet >= 1 &&
                    userData.heightFeet <= 8
                    ? userData.heightFeet - 1
                    : 4;
            setSelectedFeetIndex(new IndexPath(defaultFeet));

            const defaultInches =
                userData.heightInches &&
                    userData.heightInches >= 0 &&
                    userData.heightInches <= 11
                    ? userData.heightInches
                    : 0;
            setSelectedInchesIndex(new IndexPath(defaultInches));

            setWeight(userData.weight?.toString() || "");
            setGoalWeight(userData.goalWeight?.toString() || "");
            if (userData.targetDate) {
                const parsedDate = new Date(userData.targetDate);
                if (!isNaN(parsedDate.getTime())) {
                    if (parsedDate < minTargetDate) {
                        setTargetDate(new Date(minTargetDate));
                    } else if (parsedDate > maxTargetDate) {
                        setTargetDate(new Date(maxTargetDate));
                    } else {
                        setTargetDate(parsedDate);
                    }
                }
            }
            setIsInitializing(false);
        }
    }, [userData]);

    useEffect(() => {
        if (selectedFeetIndex !== null && selectedInchesIndex !== null && weight) {
            const feet = selectedFeetIndex.row + 1;
            const inches = selectedInchesIndex.row;
            const heightCmVal = convertHeightToCm(feet, inches);
            const weightKg = parseFloat(weight);

            if (!isNaN(weightKg) && weightKg > 0 && heightCmVal > 0) {
                const calculatedBmi = calculateLocalBMI(heightCmVal, weightKg);
                setBmi(calculatedBmi);
            } else {
                setBmi(null);
            }
        } else {
            setBmi(null);
        }
    }, [selectedFeetIndex, selectedInchesIndex, weight]);

    const [errors, setErrors] = useState({
        height: "",
        weight: "",
        goalWeight: "",
        targetDate: "",
    });

    const validateForm = () => {
        if (selectedFeetIndex === null || selectedInchesIndex === null) {
            setErrors((prev) => ({ ...prev, height: "Please select height." }));
            return false;
        }

        let isValid = true;
        const newErrors = {
            height: "",
            weight: "",
            goalWeight: "",
            targetDate: "",
        };

        const feet = selectedFeetIndex.row + 1;
        const inches = selectedInchesIndex.row;
        const heightCmVal = convertHeightToCm(feet, inches);
        const weightNum = parseFloat(weight);
        const goalWeightNum = parseFloat(goalWeight);

        if (heightCmVal < 100 || heightCmVal > 250) {
            newErrors.height = "Height should be between approx 3'3\" and 8'2\"";
            isValid = false;
        }

        if (!weight || isNaN(weightNum) || weightNum < 20 || weightNum > 300) {
            newErrors.weight = "Please enter a valid weight (20-300 kg)";
            isValid = false;
        }

        if (
            !goalWeight ||
            isNaN(goalWeightNum) ||
            goalWeightNum < 20 ||
            goalWeightNum > 300
        ) {
            newErrors.goalWeight = "Please enter a valid goal weight (20-300 kg)";
            isValid = false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentMinTargetDate = new Date(today);
        currentMinTargetDate.setDate(today.getDate() + 30);

        if (targetDate < currentMinTargetDate) {
            newErrors.targetDate = "Target date must be at least 30 days from today";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleNext = () => {
        if (
            !validateForm() ||
            selectedFeetIndex === null ||
            selectedInchesIndex === null
        )
            return;

        const feet = selectedFeetIndex.row + 1;
        const inches = selectedInchesIndex.row;
        const heightCmVal = convertHeightToCm(feet, inches);

        updateUserData({
            heightFeet: feet,
            heightInches: inches,
            heightCm: heightCmVal,
            weight: parseFloat(weight),
            goalWeight: parseFloat(goalWeight),
            targetDate: targetDate.toISOString(),
        });

        router.push("/onboarding/diet-preferences");
    };

    const getBMICategory = (currentBmi: number) => {
        if (currentBmi < 18.5) return { category: "Underweight", color: "#3B82F6" };
        if (currentBmi < 25) return { category: "Normal weight", color: "#10B981" };
        if (currentBmi < 30) return { category: "Overweight", color: "#F59E0B" };
        return { category: "Obese", color: "#EF4444" };
    };

    const bmiCategory = bmi && bmi > 0 ? getBMICategory(bmi) : null;

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) {
            const newDate = new Date(selectedDate);
            if (newDate < minTargetDate) {
                setTargetDate(new Date(minTargetDate));
            } else if (newDate > maxTargetDate) {
                setTargetDate(new Date(maxTargetDate));
            } else {
                setTargetDate(newDate);
            }
            setErrors((prev) => ({ ...prev, targetDate: "" }));
        }
        if (Platform.OS !== "ios") {
            setShowDatePicker(false);
        }
    };

    if (
        isInitializing ||
        selectedFeetIndex === null ||
        selectedInchesIndex === null
    ) {
        return (
            <SafeAreaView style={styles.containerLoading} edges={["bottom"]}>
                <ActivityIndicator size='large' color='#5048E5' />
                <Text style={styles.loadingText}>Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <ScrollView style={styles.scrollView} keyboardShouldPersistTaps='handled'>
                <View style={styles.content}>
                    <Text style={styles.heading}>Body Information</Text>
                    <Text style={styles.subheading}>
                        Help us understand your goals better
                    </Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Height</Text>
                        <View style={styles.heightContainer}>
                            <View style={styles.heightInput}>
                                <Select
                                    label={<Text style={styles.selectLabel}>Feet</Text>}
                                    selectedIndex={selectedFeetIndex}
                                    value={
                                        <Text style={styles.selectValue}>
                                            {feetOptions[selectedFeetIndex.row]}
                                        </Text>
                                    }
                                    onSelect={(index) => {
                                        if (index instanceof IndexPath) {
                                            setSelectedFeetIndex(index);
                                            setErrors((prev) => ({ ...prev, height: "" }));
                                        }
                                    }}
                                    status={errors.height ? "danger" : "basic"}
                                >
                                    {feetOptions.map((option, index) => (
                                        <SelectItem key={index} title={<Text>{option}</Text>} />
                                    ))}
                                </Select>
                            </View>
                            <View style={styles.heightInput}>
                                <Select
                                    label={<Text style={styles.selectLabel}>Inches</Text>}
                                    selectedIndex={selectedInchesIndex}
                                    value={
                                        <Text style={styles.selectValue}>
                                            {inchesOptions[selectedInchesIndex.row]}
                                        </Text>
                                    }
                                    onSelect={(index) => {
                                        if (index instanceof IndexPath) {
                                            setSelectedInchesIndex(index);
                                            setErrors((prev) => ({ ...prev, height: "" }));
                                        }
                                    }}
                                    status={errors.height ? "danger" : "basic"}
                                >
                                    {inchesOptions.map((option, index) => (
                                        <SelectItem key={index} title={<Text>{option}</Text>} />
                                    ))}
                                </Select>
                            </View>
                        </View>
                        {errors.height ? (
                            <Text style={styles.errorText}>{errors.height}</Text>
                        ) : null}
                        <Text style={styles.heightCmText}>
                            {`${convertHeightToCm(
                                selectedFeetIndex.row + 1,
                                selectedInchesIndex.row
                            )} cm`}
                        </Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Current Weight (kg)</Text>
                        <Input
                            placeholder='e.g., 70'
                            value={weight}
                            onChangeText={(text) => {
                                setWeight(text);
                                setErrors((prev) => ({ ...prev, weight: "" }));
                            }}
                            keyboardType='numeric'
                            status={errors.weight ? "danger" : "basic"}
                            caption={
                                errors.weight ? (
                                    <Text style={styles.errorText}>{errors.weight}</Text>
                                ) : undefined
                            }
                            accessoryRight={(props) => (
                                <Text {...props} style={styles.inputUnit}>
                                    kg
                                </Text>
                            )}
                        />
                    </View>

                    {bmi && bmiCategory && (
                        <View style={styles.bmiContainer}>
                            <Text style={styles.bmiLabel}>
                                Your BMI is{" "}
                                <Text style={[styles.bmiValue, { color: bmiCategory.color }]}>
                                    {bmi.toFixed(1)}
                                </Text>
                            </Text>
                            <View
                                style={[
                                    styles.bmiCategoryChip,
                                    { backgroundColor: bmiCategory.color + "20" },
                                ]}
                            >
                                <Text
                                    style={[styles.bmiCategory, { color: bmiCategory.color }]}
                                >
                                    {bmiCategory.category}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Goal Weight (kg)</Text>
                        <Input
                            placeholder='e.g., 65'
                            value={goalWeight}
                            onChangeText={(text) => {
                                setGoalWeight(text);
                                setErrors((prev) => ({ ...prev, goalWeight: "" }));
                            }}
                            keyboardType='numeric'
                            status={errors.goalWeight ? "danger" : "basic"}
                            caption={
                                errors.goalWeight ? (
                                    <Text style={styles.errorText}>{errors.goalWeight}</Text>
                                ) : undefined
                            }
                            accessoryRight={(props) => (
                                <Text {...props} style={styles.inputUnit}>
                                    kg
                                </Text>
                            )}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Target Date</Text>
                        <Pressable
                            onPress={() => setShowDatePicker(true)}
                            style={[
                                styles.dateInputContainer,
                                errors.targetDate
                                    ? styles.inputErrorBorder
                                    : styles.inputBorder,
                            ]}
                        >
                            <Text style={styles.dateInputText}>
                                {targetDate?.toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </Text>
                        </Pressable>

                        {showDatePicker && (
                            <DateTimePicker
                                value={targetDate}
                                mode='date'
                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                minimumDate={minTargetDate}
                                maximumDate={maxTargetDate}
                                onChange={onDateChange}
                            />
                        )}

                        {errors.targetDate ? (
                            <Text style={styles.errorText}>{errors.targetDate}</Text>
                        ) : null}
                        <Text style={styles.helperText}>
                            Set a realistic timeframe (min 30 days).
                        </Text>
                    </View>

                    {parseFloat(weight) > 0 &&
                        parseFloat(goalWeight) > 0 &&
                        targetDate &&
                        !errors.weight &&
                        !errors.goalWeight &&
                        !errors.targetDate && (
                            <View style={styles.summaryContainer}>
                                <Text style={styles.summaryTitle}>Goal Summary</Text>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Target:</Text>
                                    <Text style={styles.summaryValue}>
                                        {parseFloat(weight) > parseFloat(goalWeight)
                                            ? "Lose"
                                            : "Gain"}{" "}
                                        {Math.abs(
                                            parseFloat(weight) - parseFloat(goalWeight)
                                        ).toFixed(1)}{" "}
                                        kg
                                    </Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Timeframe:</Text>
                                    <Text style={styles.summaryValue}>
                                        {Math.max(
                                            0,
                                            Math.floor(
                                                (targetDate.getTime() - new Date().getTime()) /
                                                (1000 * 60 * 60 * 24)
                                            )
                                        )}{" "}
                                        days
                                    </Text>
                                </View>
                                {Math.abs(parseFloat(weight) - parseFloat(goalWeight)) > 0 &&
                                    Math.floor(
                                        (targetDate.getTime() - new Date().getTime()) /
                                        (1000 * 60 * 60 * 24 * 7)
                                    ) > 0 && (
                                        <View style={styles.summaryItem}>
                                            <Text style={styles.summaryLabel}>
                                                Approx. weekly rate:
                                            </Text>
                                            <Text style={styles.summaryValue}>
                                                {(
                                                    Math.abs(
                                                        parseFloat(weight) - parseFloat(goalWeight)
                                                    ) /
                                                    Math.max(
                                                        1,
                                                        (targetDate.getTime() - new Date().getTime()) /
                                                        (1000 * 60 * 60 * 24 * 7)
                                                    )
                                                ).toFixed(2)}{" "}
                                                kg/week
                                            </Text>
                                        </View>
                                    )}
                            </View>
                        )}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    appearance='outline'
                    status='basic'
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    Back
                </Button>
                <Button onPress={handleNext} style={styles.nextButton}>
                    Next
                </Button>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    containerLoading: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#6B7280",
    },
    scrollView: { flex: 1 },
    content: { padding: 24, paddingBottom: 80 },
    heading: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#1F2937",
        marginBottom: 8,
    },
    subheading: {
        fontSize: 16,
        color: "#6B7280",
        marginBottom: 32,
        lineHeight: 24,
    },
    formGroup: { marginBottom: 28 },
    label: {
        fontSize: 16,
        fontWeight: "500",
        color: "#374151",
        marginBottom: 10,
    },
    selectLabel: { fontSize: 14, color: "#6B7280", marginBottom: 2 },
    selectValue: { fontSize: 16, color: "#1F2937" },
    heightContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 16,
    },
    heightInput: { flex: 1 },
    heightCmText: {
        marginTop: 10,
        fontSize: 14,
        color: "#4B5563",
        textAlign: "right",
        fontWeight: "500",
    },
    errorText: { color: "#EF4444", fontSize: 13, marginTop: 6 },
    helperText: { fontSize: 13, color: "#6B7280", marginTop: 8 },
    bmiContainer: {
        borderRadius: 12,
        padding: 20,
        alignItems: "flex-start",
        marginBottom: 28,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    bmiLabel: {
        fontSize: 16,
        color: "#374151",
        fontWeight: "600",
        marginBottom: 8,
    },
    bmiValue: { fontSize: 20, fontWeight: "bold" },
    bmiCategoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: "flex-start",
        marginTop: 4,
    },
    bmiCategory: { fontSize: 14, fontWeight: "600" },
    summaryContainer: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 20,
        marginBottom: 28,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    summaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        alignItems: "center",
    },
    summaryLabel: {
        fontSize: 15,
        color: "#4B5563",
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
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
    nextButton: {
        flex: 2,
        backgroundColor: "#5048E5",
        borderColor: "#5048E5",
    },
    dateInputContainer: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        minHeight: 50,
    },
    dateInputText: {
        fontSize: 16,
        color: "#1F2937",
    },
    inputBorder: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
    },
    inputErrorBorder: {
        borderWidth: 1.5,
        borderColor: "#EF4444",
    },
    inputUnit: {
        fontSize: 16,
        color: "#6B7280",
        paddingHorizontal: 8,
    },
});
