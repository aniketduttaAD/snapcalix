import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TextProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, CheckBox, Input, Icon } from "@ui-kitten/components";
import { router } from "expo-router";
import { UserData, useUserStore } from "@/utils/useUserStore";

const CloseIcon = (props: any) => <Icon {...props} name='close-outline' />;

export default function DietPreferencesScreen() {
    const { userData, updateUserData } = useUserStore();

    const [preferences, setPreferences] = useState<
        UserData["preferences"]
    >(userData.preferences || []);
    const [allergies, setAllergies] = useState<string[]>(
        userData.allergies || []
    );
    const [newAllergy, setNewAllergy] = useState("");
    const [dislikes, setDislikes] = useState<string[]>(
        userData.dislikes || []
    );
    const [newDislike, setNewDislike] = useState("");

    const dietOptions: {
        label: string;
        value: NonNullable<UserData["preferences"]>[number];
    }[] = [
            { label: "Vegetarian", value: "Veg" },
            { label: "Includes Eggs", value: "Egg" },
            { label: "Vegan", value: "Vegan" },
            { label: "Non-Vegetarian", value: "Non-Veg" },
        ];

    const togglePreference = (
        value: NonNullable<UserData["preferences"]>[number]
    ) => {
        if (preferences?.includes(value)) {
            setPreferences(preferences.filter((type) => type !== value));
        } else {
            setPreferences([...(preferences || []), value]);
        }
    };

    const addAllergy = () => {
        if (
            newAllergy.trim() &&
            !allergies.includes(newAllergy.trim().toLowerCase())
        ) {
            setAllergies([...allergies, newAllergy.trim().toLowerCase()]);
            setNewAllergy("");
        }
    };

    const removeAllergy = (allergy: string) => {
        setAllergies(allergies.filter((a) => a !== allergy));
    };

    const addDislike = () => {
        if (
            newDislike.trim() &&
            !dislikes.includes(newDislike.trim().toLowerCase())
        ) {
            setDislikes([...dislikes, newDislike.trim().toLowerCase()]);
            setNewDislike("");
        }
    };

    const removeDislike = (dislike: string) => {
        setDislikes(dislikes.filter((d) => d !== dislike));
    };

    const validateForm = () => {
        if (preferences?.includes("Non-Veg") && preferences?.includes("Vegan")) {
            Alert.alert(
                "Invalid Selection",
                "You cannot select both Non-Vegetarian and Vegan options."
            );
            return false;
        }
        if (preferences?.includes("Non-Veg") && preferences?.includes("Veg")) {
            Alert.alert(
                "Invalid Selection",
                "You cannot select both Non-Vegetarian and Vegetarian options. Non-vegetarian typically includes vegetarian."
            );
            return false;
        }
        if (preferences?.includes("Vegan") && preferences?.includes("Egg")) {
            Alert.alert("Invalid Selection", "Vegan diet does not include eggs.");
            return false;
        }

        return true;
    };

    const handleNext = () => {
        if (!validateForm()) return;
        updateUserData({
            preferences,
            allergies,
            dislikes,
        });
        router.push("/onboarding/summary");
    };

    const renderHeader = () => (
        <View style={styles.headerContent}>
            <Text style={styles.heading}>Diet Preferences</Text>
            <Text style={styles.subheading}>
                Let us know your dietary preferences to personalize your meal plans
            </Text>
        </View>
    );

    const FooterComponent = () => (
        <View style={styles.footer}>
            <Button
                appearance='ghost'
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
    );

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.formGroup}>
            <Text style={styles.label}>{item.title}</Text>
            {item.helperText && (
                <Text style={styles.helperText}>{item.helperText}</Text>
            )}
            {item.content}
        </View>
    );

    const data = [
        {
            id: "1",
            title: "Food Preferences",
            helperText: "Select all that apply to you",
            content: (
                <View style={styles.checkboxGroup}>
                    {dietOptions.map((option) => (
                        <CheckBox
                            key={option.value}
                            checked={preferences?.includes(option.value)}
                            onChange={() => togglePreference(option.value)}
                            style={styles.checkbox}
                        >
                            {(
                                evaProps: React.JSX.IntrinsicAttributes &
                                    React.JSX.IntrinsicClassAttributes<Text> &
                                    Readonly<TextProps>
                            ) => (
                                <Text {...evaProps} style={styles.checkboxText}>
                                    {option.label}
                                </Text>
                            )}
                        </CheckBox>
                    ))}
                </View>
            ),
        },
        {
            id: "2",
            title: "Allergies",
            helperText:
                "Add any food allergies or intolerances (e.g., Peanuts, Gluten)",
            content: (
                <>
                    <View style={styles.tagInputContainer}>
                        <Input
                            placeholder='Type an allergy and press Add'
                            value={newAllergy}
                            onChangeText={setNewAllergy}
                            onSubmitEditing={addAllergy}
                            style={styles.input}
                            autoCapitalize='words'
                        />
                        <Button
                            size='small'
                            onPress={addAllergy}
                            disabled={!newAllergy.trim()}
                            style={styles.addButton}
                        >
                            Add
                        </Button>
                    </View>

                    <View style={styles.tagsContainer}>
                        {allergies.map((allergy) => (
                            <TouchableOpacity
                                key={allergy}
                                style={styles.tag}
                                onPress={() => removeAllergy(allergy)}
                            >
                                <Text style={styles.tagText}>{allergy}</Text>
                                <CloseIcon style={styles.tagIcon} fill='#FFFFFF' />
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            ),
        },
        {
            id: "3",
            title: "Dislikes",
            helperText: "Add foods you don't enjoy (e.g., Broccoli, Mushrooms)",
            content: (
                <>
                    <View style={styles.tagInputContainer}>
                        <Input
                            placeholder='Type a food and press Add'
                            value={newDislike}
                            onChangeText={setNewDislike}
                            onSubmitEditing={addDislike}
                            style={styles.input}
                            autoCapitalize='words'
                        />
                        <Button
                            size='small'
                            onPress={addDislike}
                            disabled={!newDislike.trim()}
                            style={styles.addButton}
                        >
                            Add
                        </Button>
                    </View>

                    <View style={styles.tagsContainer}>
                        {dislikes.map((dislike) => (
                            <TouchableOpacity
                                key={dislike}
                                style={styles.tag}
                                onPress={() => removeDislike(dislike)}
                            >
                                <Text style={styles.tagText}>{dislike}</Text>
                                <CloseIcon style={styles.tagIcon} fill='#FFFFFF' />
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            ),
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.flatListContentContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps='handled'
                    style={styles.flatList}
                />
                <FooterComponent />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    flatList: {
        flex: 1,
    },
    flatListContentContainer: {
        flexGrow: 1,
        paddingBottom: 24,
    },
    headerContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
        marginBottom: 24,
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
    formGroup: {
        marginBottom: 28,
        paddingHorizontal: 24,
    },
    label: {
        fontSize: 18,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    helperText: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 16,
    },
    checkboxGroup: {
        marginTop: 8,
    },
    checkbox: {
        marginBottom: 16,
    },
    checkboxText: {
        fontSize: 16,
        marginLeft: 8,
    },
    tagInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    input: {
        flex: 1,
        marginRight: 12,
    },
    addButton: {
        minWidth: 70,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 8,
    },
    tag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#5048E5",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 10,
    },
    tagText: {
        color: "white",
        marginRight: 6,
        fontSize: 14,
        textTransform: "capitalize",
    },
    tagIcon: {
        width: 16,
        height: 16,
    },
    footer: {
        flexDirection: "row",
        paddingHorizontal: 24,
        paddingVertical: 16,
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
});
