import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { UserData, useUserStore } from "@/utils/useUserStore";

const genderOptions = ["Male", "Female"] as const;

interface Country {
    name: {
        common: string;
    };
    cca2: string;
}

interface State {
    name: string;
    state_code: string;
}

interface FormErrors {
    gender: string;
    dob: string;
    country: string;
    state: string;
    weight: string;
    feet: string;
    inches: string;
    typeOfDiet?: string;
}

const typeOfDietLabels: Record<
    NonNullable<UserData["typeOfDiet"]>,
    string
> = {
    lowCarb: "Low Carb",
    mediterranean: "Mediterranean",
    keto: "Keto",
    intermittentFasting: "Intermittent Fasting",
};

const dietOptions: { label: string; value: UserData["typeOfDiet"] }[] = [
    { label: "Select a diet (optional)", value: undefined },
    ...(Object.keys(typeOfDietLabels) as (keyof typeof typeOfDietLabels)[]).map(
        (key) => ({
            label: typeOfDietLabels[key],
            value: key,
        })
    ),
];

export default function BasicInfoScreen() {
    const { userData, updateUserData } = useUserStore();

    const [gender, setGender] = useState<"Male" | "Female">(() => {
        if (userData.gender === "Male" || userData.gender === "Female") {
            return userData.gender;
        }
        return "Male";
    });
    const [dob, setDob] = useState<Date>(
        userData.dob ? new Date(userData.dob) : new Date()
    );
    const [country, setCountry] = useState(userData.country || "");
    const [state, setState] = useState(userData.state || "");
    const [typeOfDiet, setTypeOfDiet] = useState<UserData["typeOfDiet"]>(
        userData.typeOfDiet
    );

    const [countrySearchTerm, setCountrySearchTerm] = useState("");
    const [stateSearchTerm, setStateSearchTerm] = useState("");
    const [countryModalVisible, setCountryModalVisible] = useState(false);
    const [stateModalVisible, setStateModalVisible] = useState(false);
    const [dietModalVisible, setDietModalVisible] = useState(false);
    const [datePickerVisible, setDatePickerVisible] = useState(false);

    const [countryList, setCountryList] = useState<Country[]>([]);
    const [stateList, setStateList] = useState<State[]>([]);
    const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
    const [filteredStates, setFilteredStates] = useState<State[]>([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);
    const [isLoadingStates, setIsLoadingStates] = useState(false);

    const countryInputRef = useRef<TextInput>(null);
    const stateInputRef = useRef<TextInput>(null);

    const [errors, setErrors] = useState<FormErrors>({
        gender: "",
        dob: "",
        country: "",
        state: "",
        weight: "",
        feet: "",
        inches: "",
    });

    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoadingCountries(true);
            try {
                const response = await axios.get("https://restcountries.com/v3.1/all");
                const sortedCountries = response.data.sort((a: Country, b: Country) =>
                    a.name.common.localeCompare(b.name.common)
                );
                setCountryList(sortedCountries);
                setFilteredCountries(sortedCountries);
            } catch (error) {
                console.error("Error fetching countries:", error);
                const fallbackCountries = [
                    { name: { common: "United States" }, cca2: "US" },
                    { name: { common: "Canada" }, cca2: "CA" },
                    { name: { common: "United Kingdom" }, cca2: "GB" },
                    { name: { common: "Australia" }, cca2: "AU" },
                ];
                setCountryList(fallbackCountries);
                setFilteredCountries(fallbackCountries);
            } finally {
                setIsLoadingCountries(false);
            }
        };

        fetchCountries();
    }, []);

    const filterCountries = useCallback(() => {
        if (countryList.length > 0) {
            const filtered = countryList.filter((item) =>
                item.name.common.toLowerCase().includes(countrySearchTerm.toLowerCase())
            );
            setFilteredCountries(filtered);
        }
    }, [countrySearchTerm, countryList]);

    useEffect(() => {
        filterCountries();
    }, [countrySearchTerm, filterCountries]);

    const filterStates = useCallback(() => {
        if (stateList.length > 0) {
            const filtered = stateList.filter((item) =>
                item.name.toLowerCase().includes(stateSearchTerm.toLowerCase())
            );
            setFilteredStates(filtered);
        }
    }, [stateSearchTerm, stateList]);

    useEffect(() => {
        filterStates();
    }, [stateSearchTerm, filterStates]);

    const fetchStates = useCallback(async (selectedCountryName: string) => {
        if (!selectedCountryName) {
            setStateList([]);
            setFilteredStates([]);
            return;
        }
        try {
            setIsLoadingStates(true);
            const options = {
                method: "POST",
                url: "https://countriesnow.space/api/v0.1/countries/states",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data: `country=${encodeURIComponent(selectedCountryName)}`,
            };
            const response = await axios.request(options);
            if (
                response.data &&
                !response.data.error &&
                response.data.data &&
                response.data.data.states
            ) {
                const sortedStates = response.data.data.states.sort(
                    (a: State, b: State) => a.name.localeCompare(b.name)
                );
                setStateList(sortedStates);
                setFilteredStates(sortedStates);
            } else {
                console.warn(
                    `No states found for ${selectedCountryName} via API, using dummy data or empty list.`
                );
                const dummyStates = getDummyStatesForCountry(selectedCountryName);
                setStateList(dummyStates);
                setFilteredStates(dummyStates);
            }
        } catch (error) {
            console.error(`Error fetching states for ${selectedCountryName}:`, error);
            const dummyStates = getDummyStatesForCountry(selectedCountryName);
            setStateList(dummyStates);
            setFilteredStates(dummyStates);
        } finally {
            setIsLoadingStates(false);
        }
    }, []);

    const getDummyStatesForCountry = useCallback(
        (countryName: string): State[] => {
            switch (countryName) {
                case "United States":
                    return [
                        { name: "California", state_code: "CA" },
                        { name: "New York", state_code: "NY" },
                    ];
                default:
                    return [];
            }
        },
        []
    );

    const isAtLeast13YearsOld = (selectedDate: Date) => {
        const today = new Date();
        const birthDate = new Date(selectedDate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 13;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const CustomDatePicker = () => {
        const handleDateChange = (
            event: DateTimePickerEvent,
            selectedDate?: Date
        ) => {
            setDatePickerVisible(Platform.OS === "ios");
            if (Platform.OS === "android" && event.type === "dismissed") {
                return;
            }

            if (selectedDate) {
                if (!isAtLeast13YearsOld(selectedDate)) {
                    setErrors((prev) => ({
                        ...prev,
                        dob: "You must be at least 13 years old",
                    }));
                } else {
                    setDob(selectedDate);
                    setErrors((prev) => ({ ...prev, dob: "" }));
                }
            }
        };

        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() - 13);

        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 120);

        return (
            <>
                <TouchableOpacity
                    style={[
                        styles.inputField,
                        styles.selectField,
                        errors.dob ? styles.inputError : {},
                    ]}
                    onPress={() => setDatePickerVisible(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.selectedText}>{formatDate(dob)}</Text>
                    <Ionicons name='calendar-outline' size={20} color='#6B7280' />
                </TouchableOpacity>

                {datePickerVisible && (
                    <DateTimePicker
                        value={dob}
                        mode='date'
                        display='default'
                        onChange={handleDateChange}
                        maximumDate={maxDate}
                        minimumDate={minDate}
                    />
                )}

                {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}

                <Text style={styles.datePickerNote}>
                    You must be at least 13 years old to use this app
                </Text>
            </>
        );
    };

    const CustomGenderSelector = () => (
        <View style={styles.genderContainer}>
            {genderOptions.map((option) => (
                <TouchableOpacity
                    key={option}
                    style={[
                        styles.genderOption,
                        gender === option ? styles.genderSelected : {},
                    ]}
                    onPress={() => {
                        setGender(option);
                        setErrors((prev) => ({ ...prev, gender: "" }));
                    }}
                >
                    <Text
                        style={[
                            styles.genderText,
                            gender === option ? styles.genderTextSelected : {},
                        ]}
                    >
                        {option}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const validateForm = () => {
        let valid = true;
        const newErrors: FormErrors = {
            gender: "",
            dob: "",
            country: "",
            state: "",
            weight: "",
            feet: "",
            inches: "",
        };

        if (!gender) {
            newErrors.gender = "Please select your gender";
            valid = false;
        }
        if (!isAtLeast13YearsOld(dob)) {
            newErrors.dob = "You must be at least 13 years old";
            valid = false;
        }
        if (!country) {
            newErrors.country = "Please select your country";
            valid = false;
        }
        if (!state && country && stateList.length > 0) {
            newErrors.state = "Please select your state/province";
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleNext = () => {
        if (!validateForm()) return;
        updateUserData({
            gender,
            dob: dob.toISOString().split("T")[0],
            country,
            state,
            typeOfDiet: typeOfDiet,
        });
        router.push("/onboarding/body-info");
    };

    const openCountryModal = () => {
        setCountryModalVisible(true);
        setCountrySearchTerm("");
        setFilteredCountries(countryList);
        setTimeout(() => {
            countryInputRef.current?.focus();
        }, 100);
    };

    const openStateModal = () => {
        if (!country) {
            setErrors((prev) => ({
                ...prev,
                country: "Please select a country first",
            }));
            return;
        }
        setStateModalVisible(true);
        setStateSearchTerm("");
        setFilteredStates(stateList);
        setTimeout(() => {
            stateInputRef.current?.focus();
        }, 100);
    };

    const selectCountry = (selectedCountryItem: Country) => {
        const newCountry = selectedCountryItem.name.common;
        setCountry(newCountry);
        setCountryModalVisible(false);
        setErrors((prev) => ({ ...prev, country: "" }));
        setState("");
        fetchStates(newCountry);
    };

    const selectState = (selectedStateItem: State) => {
        setState(selectedStateItem.name);
        setStateModalVisible(false);
        setErrors((prev) => ({ ...prev, state: "" }));
    };

    const selectDiet = (selectedDietValue: UserData["typeOfDiet"]) => {
        setTypeOfDiet(selectedDietValue);
        setDietModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <FlatList
                    data={[1]}
                    renderItem={() => (
                        <View style={styles.content}>
                            <Text style={styles.heading}>Tell us about yourself</Text>
                            <Text style={styles.subheading}>
                                We'll use this information to create your personalized
                                experience
                            </Text>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Gender</Text>
                                <CustomGenderSelector />
                                {errors.gender ? (
                                    <Text style={styles.errorText}>{errors.gender}</Text>
                                ) : null}
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Date of Birth</Text>
                                <CustomDatePicker />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Country</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.inputField,
                                        styles.selectField,
                                        errors.country ? styles.inputError : {},
                                        country ? styles.inputSuccess : {},
                                    ]}
                                    onPress={openCountryModal}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={
                                            country ? styles.selectedText : styles.placeholderText
                                        }
                                    >
                                        {country || "Select your country"}
                                    </Text>
                                    <Ionicons name='chevron-down' size={20} color='#6B7280' />
                                </TouchableOpacity>
                                {errors.country ? (
                                    <Text style={styles.errorText}>{errors.country}</Text>
                                ) : null}
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>State/Province</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.inputField,
                                        styles.selectField,
                                        errors.state ? styles.inputError : {},
                                        state ? styles.inputSuccess : {},
                                        !country ? styles.disabledInput : {},
                                    ]}
                                    onPress={openStateModal}
                                    activeOpacity={0.7}
                                    disabled={!country}
                                >
                                    <Text
                                        style={[
                                            state ? styles.selectedText : styles.placeholderText,
                                            !country ? styles.disabledText : {},
                                        ]}
                                    >
                                        {state ||
                                            (country
                                                ? stateList.length > 0 || isLoadingStates
                                                    ? "Select your state"
                                                    : "No states available/required"
                                                : "Select country first")}
                                    </Text>
                                    <Ionicons
                                        name='chevron-down'
                                        size={20}
                                        color={country ? "#6B7280" : "#D1D5DB"}
                                    />
                                </TouchableOpacity>
                                {errors.state ? (
                                    <Text style={styles.errorText}>{errors.state}</Text>
                                ) : null}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Type of Diet (Optional)</Text>
                                <TouchableOpacity
                                    style={[styles.inputField, styles.selectField]}
                                    onPress={() => setDietModalVisible(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={
                                            typeOfDiet ? styles.selectedText : styles.placeholderText
                                        }
                                    >
                                        {typeOfDiet
                                            ? typeOfDietLabels[typeOfDiet]
                                            : "Select a diet"}
                                    </Text>
                                    <Ionicons name='chevron-down' size={20} color='#6B7280' />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    keyExtractor={() => "basic-info-content"}
                    contentContainerStyle={styles.scrollViewContent}
                    keyboardShouldPersistTaps='handled'
                />
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <Modal
                visible={countryModalVisible}
                transparent={true}
                animationType='slide'
                onRequestClose={() => setCountryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                                <Ionicons name='close' size={24} color='#333' />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons
                                name='search'
                                size={20}
                                color='#6B7280'
                                style={styles.searchIcon}
                            />
                            <TextInput
                                ref={countryInputRef}
                                style={styles.searchInput}
                                placeholder='Search for a country'
                                value={countrySearchTerm}
                                onChangeText={setCountrySearchTerm}
                                autoCapitalize='none'
                                placeholderTextColor='#9CA3AF'
                            />
                            {countrySearchTerm ? (
                                <TouchableOpacity onPress={() => setCountrySearchTerm("")}>
                                    <Ionicons name='close-circle' size={20} color='#9CA3AF' />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        {isLoadingCountries ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size='large' color='#5048E5' />
                                <Text style={styles.loadingText}>Loading countries...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredCountries}
                                keyExtractor={(item) => item.cca2}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.optionItem}
                                        onPress={() => selectCountry(item)}
                                    >
                                        <Text style={styles.optionText}>{item.name.common}</Text>
                                    </TouchableOpacity>
                                )}
                                keyboardShouldPersistTaps='handled'
                                ListEmptyComponent={
                                    <View style={styles.emptyStateContainer}>
                                        <Text style={styles.emptyStateText}>
                                            No countries found
                                        </Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>

            <Modal
                visible={stateModalVisible}
                transparent={true}
                animationType='slide'
                onRequestClose={() => setStateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select State for {country}</Text>
                            <TouchableOpacity onPress={() => setStateModalVisible(false)}>
                                <Ionicons name='close' size={24} color='#333' />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons
                                name='search'
                                size={20}
                                color='#6B7280'
                                style={styles.searchIcon}
                            />
                            <TextInput
                                ref={stateInputRef}
                                style={styles.searchInput}
                                placeholder='Search for a state'
                                value={stateSearchTerm}
                                onChangeText={setStateSearchTerm}
                                autoCapitalize='none'
                                placeholderTextColor='#9CA3AF'
                            />
                            {stateSearchTerm ? (
                                <TouchableOpacity onPress={() => setStateSearchTerm("")}>
                                    <Ionicons name='close-circle' size={20} color='#9CA3AF' />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        {isLoadingStates ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size='large' color='#5048E5' />
                                <Text style={styles.loadingText}>Loading states...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredStates}
                                keyExtractor={(item, index) =>
                                    item.state_code || item.name + index
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.optionItem}
                                        onPress={() => selectState(item)}
                                    >
                                        <Text style={styles.optionText}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                                keyboardShouldPersistTaps='handled'
                                ListEmptyComponent={
                                    <View style={styles.emptyStateContainer}>
                                        <Text style={styles.emptyStateText}>
                                            No states found for this country. You can proceed if not
                                            applicable.
                                        </Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>

            <Modal
                visible={dietModalVisible}
                transparent={true}
                animationType='slide'
                onRequestClose={() => setDietModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Diet (Optional)</Text>
                            <TouchableOpacity onPress={() => setDietModalVisible(false)}>
                                <Ionicons name='close' size={24} color='#333' />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={dietOptions}
                            keyExtractor={(item) => item.label}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={() => selectDiet(item.value)}
                                >
                                    <Text style={styles.optionText}>{item.label}</Text>
                                </TouchableOpacity>
                            )}
                            keyboardShouldPersistTaps='handled'
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    scrollViewContent: {
        flexGrow: 1,
    },
    content: { padding: 24 },
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
    formGroup: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: "500", color: "#374151", marginBottom: 8 },
    inputField: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        minHeight: 50,
        justifyContent: "center",
    },
    selectField: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    inputError: { borderColor: "#EF4444" },
    inputSuccess: { borderColor: "#10B981" },
    disabledInput: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
    selectedText: { color: "#1F2937", fontSize: 16 },
    placeholderText: { color: "#9CA3AF", fontSize: 16 },
    disabledText: { color: "#9CA3AF" },
    errorText: { color: "#EF4444", fontSize: 13, marginTop: 6 },
    datePickerNote: { fontSize: 13, color: "#6B7280", marginTop: 8 },
    footer: {
        flexDirection: "row",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
    },
    backButton: {
        flex: 1,
        marginRight: 8,
        borderWidth: 1.5,
        borderColor: "#D1D5DB",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    backButtonText: { color: "#4B5563", fontSize: 16, fontWeight: "600" },
    nextButton: {
        flex: 2,
        backgroundColor: "#5048E5",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#5048E5",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    nextButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "85%",
        paddingBottom: Platform.OS === "ios" ? 34 : 20,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: { fontSize: 20, fontWeight: "600", color: "#1F2937" },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        backgroundColor: "#F9FAFB",
    },
    searchIcon: { marginRight: 10 },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: Platform.OS === "ios" ? 10 : 8,
        color: "#1F2937",
    },
    optionItem: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    optionText: { fontSize: 16, color: "#374151" },
    emptyStateContainer: {
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 150,
    },
    emptyStateText: { fontSize: 16, color: "#6B7280", textAlign: "center" },
    loadingContainer: {
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 150,
    },
    loadingText: { fontSize: 16, color: "#6B7280", marginTop: 12 },
    genderContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    genderOption: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: "#D1D5DB",
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
    },
    genderSelected: { borderColor: "#5048E5", backgroundColor: "#EEF2FF" },
    genderText: { fontSize: 16, color: "#4B5563" },
    genderTextSelected: { color: "#5048E5", fontWeight: "600" },
});
