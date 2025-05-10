import apiClient from './client';
import * as FileSystem from 'expo-file-system';

export const scanFoodImage = async (imageUri: string) => {
    try {
        const base64Image = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        const response = await apiClient.post('/scan-image', {
            image: base64Image,
        });
        console.log("scan-image:::", response.data);

        return response.data;
    } catch (error) {
        console.error('Error in scanFoodImage:', error);
        throw error;
    }
};

export const getNutritionEstimate = async (mealData: { name: string, ingredients: string[] }) => {
    try {
        const response = await apiClient.post('/estimate', mealData);
        console.log("getNutritionEstimate response data:", response.data);
        return response.data;
    } catch (error) {
        console.error('Error in getNutritionEstimate:', error);
        throw error;
    }
};
