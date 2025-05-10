import { UserData } from '@/utils/useUserStore';
import apiClient from './client';

export const saveUserProfile = async (userProfile: UserData) => {
    const {
        allergies,
        dislikes,
        typeOfDiet,
        dob,
        ...rest
    } = userProfile;

    const cleanedProfile = {
        ...rest,
        dob: userProfile.dob ? new Date(userProfile.dob).toISOString() : undefined,
        ...(allergies && allergies.length > 0 ? { allergies } : {}),
        ...(dislikes && dislikes.length > 0 ? { dislikes } : {}),
        ...(typeOfDiet ? { typeOfDiet } : {}),
    };
    try {
        const response = await apiClient.post("/profile", cleanedProfile);
        console.log("saveUserProfile resp::", response.data);
        return response.data;
    } catch (error) {
        console.error('Error in saveUserProfile:', error);
        throw error;
    }
};

export const getUserProfile = async (userId: string) => {
    try {
        const response = await apiClient.get(`/${userId}/data`);
        console.log("getUserProfile resp::", response.data);
        return response.data;
    } catch (error) {
        console.error('Error in getUserProfile:', error);
        throw error;
    }
};

export const resetUserData = async (userId: string) => {
    try {
        const response = await apiClient.delete(`/${userId}/reset`);
        console.log("resetUserData resp::", response.data);
        return response.data;
    } catch (error) {
        console.error('Error in resetUserData:', error);
        throw error;
    }
};
