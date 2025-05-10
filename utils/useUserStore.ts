import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { MMKV } from "react-native-mmkv";

const storage = new MMKV();

export type UserData = {
    id?: string;
    gender?: "Male" | "Female" | "Other";
    dob?: string;
    country?: string;
    state?: string;
    heightFeet?: number;
    heightInches?: number;
    heightCm?: number;
    weight?: number;
    goalWeight?: number;
    targetDate?: string;
    preferences?: ("Veg" | "Egg" | "Vegan" | "Non-Veg")[];
    allergies?: string[];
    dislikes?: string[];
    typeOfDiet?: "lowCarb" | "mediterranean" | "keto" | "intermittentFasting";
};

type UserState = {
    userData: UserData;
    isLoading: boolean;

    setUserData: (data: UserData) => void;
    getUserData: () => UserData;
    updateUserData: (data: Partial<UserData>) => void;
    deleteUserData: () => void;
};

const mmkvStorage: StateStorage = {
    getItem: (name: string): string | null => {
        return storage.getString(name) || null;
    },
    setItem: (name: string, value: string): void => {
        storage.set(name, value);
    },
    removeItem: (name: string): void => {
        storage.delete(name);
    }
};

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            userData: {},
            isLoading: false,

            setUserData: (data: UserData) => {
                set({ userData: data });
            },
            getUserData: () => {
                return get().userData;
            },
            updateUserData: (data: Partial<UserData>) => {
                set((state) => ({
                    userData: { ...state.userData, ...data }
                }));
            },
            deleteUserData: () => {
                set({ userData: {} });
            },
        }),
        {
            name: "userData",
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
);

export function getFromStorage<T>(key: string): T | null {
    const value = storage.getString(key);
    if (!value) return null;

    try {
        return JSON.parse(value) as T;
    } catch (e) {
        console.error(`Failed to parse '${key}':`, e);
        deleteFromStorage(key);
        return null;
    }
}

export function updateStorage<T>(key: string, data: Partial<T>): T | null {
    const currentData = getFromStorage<T>(key) || {} as T;
    const updatedData = { ...currentData, ...data };

    try {
        storage.set(key, JSON.stringify(updatedData));
        return updatedData;
    } catch (e) {
        console.error(`Failed to update '${key}':`, e);
        return null;
    }
}

export function deleteFromStorage(key: string): void {
    storage.delete(key);
}

export function clearAllStorage(): void {
    storage.clearAll();
}