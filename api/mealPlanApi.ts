import apiClient from './client';

export interface NutritionValues {
    protein: number;
    carbs: number;
    fats: number;
    vitamin: number;
    calories: number;
}

export interface Meal {
    name: string;
    ingredients: string[];
    procedure: string[];
    timeInMinutes: number;
    nutritionValues: NutritionValues;
    image?: string;
    videoUrl?: string;
}

export interface DailyMeals {
    breakfast: Meal;
    lunch: Meal;
    snacks: Meal;
    dinner: Meal;
}

export interface MealPlanOptions {
    main_meal: DailyMeals;
    alternative_meal: DailyMeals;
}

export type WeeklyMealMap = {
    mon: MealPlanOptions;
    tue: MealPlanOptions;
    wed: MealPlanOptions;
    thu: MealPlanOptions;
    fri: MealPlanOptions;
    sat: MealPlanOptions;
    sun: MealPlanOptions;
};

export interface WeeklyMealPlan {
    userId: string;
    weeklyMealPlan: WeeklyMealMap;
}

export const getMealPlan = async (userId: string): Promise<WeeklyMealPlan> => {
    try {
        const response = await apiClient.get<WeeklyMealPlan>(`/${userId}`);
        console.log("getMealPlan resp::", response.data);
        return response.data;
    } catch (error) {
        console.error('Error in getMealPlan:', error);
        throw error;
    }
};

export const generateMealPlan = async (
    userId: string,
    userProfile: any
): Promise<WeeklyMealPlan> => {
    try {
        const response = await apiClient.post<WeeklyMealPlan>(`/${userId}/generate`, userProfile);
        console.log("generateMealPlan resp::", response.data);
        return response.data;
    } catch (error) {
        console.error('Error in generateMealPlan:', error);
        throw error;
    }
};

export const getMealDetails = async (
    userId: string,
    mealName: string
): Promise<Meal> => {
    try {
        const response = await apiClient.get<Meal>(`/${userId}/details/${mealName}`);
        console.log("getMealDetails resp::", response.data);
        return response.data;
    } catch (error) {
        console.error('Error in getMealDetails:', error);
        throw error;
    }
};
