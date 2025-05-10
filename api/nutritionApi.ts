import apiClient from './client';

export interface NutritionLogData {
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

export const getNutritionHistory = async (userId: string, startDate?: string, endDate?: string) => {
    try {
        const params: Record<string, string> = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await apiClient.get(`/${userId}/history`, { params });
        console.log("getNutritionHistory resp::", response.data);
        const transformedData = response.data.map((entry: any) => ({
            ...entry,
            meal_name: entry.mealName ?? entry.meal_name,
        }));

        return transformedData;
    } catch (error) {
        console.error('Error in getNutritionHistory:', error);
        throw error;
    }
};

export const logNutrition = async (data: NutritionLogData, userId: string) => {
    try {
        const payload = {
            ...data,
            image: data.imageUri || '',
        };

        const response = await apiClient.post(`/${userId}/log`, payload);
        console.log("logNutrition resp::", response.data);
        return response.data;
    } catch (error) {
        console.error('Error in logNutrition:', error);
        throw error;
    }
};