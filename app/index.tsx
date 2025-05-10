import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { UserData, getFromStorage } from '@/utils/useUserStore';

export default function Index() {
    const router = useRouter();
    const userData = getFromStorage<UserData>('userData');
    console.log(userData);

    useEffect(() => {
        const redirectUser = async () => {
            try {
                setTimeout(async () => {

                    if (userData) {
                        router.replace('/(tabs)');
                    } else {
                        router.replace('/onboarding');
                    }
                }, 0);
            } catch (error) {
                console.error('MMKV load error:', error);
                router.replace('/onboarding');
            }
        };

        redirectUser();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#5048E5" />
        </View>
    );
}
