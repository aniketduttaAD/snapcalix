import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@ui-kitten/components';
import { router } from 'expo-router';
import { useUserStore } from '@/utils/useUserStore';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
    const isProfileLoading = useUserStore((state) => state.isProfileLoading);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Image
                    source={require('../../assets/welcome-image.jpg')}
                    style={styles.image}
                    resizeMode="contain"
                />

                <Text style={styles.title}>SnapCalix</Text>
                <Text style={styles.subtitle}>AI-Powered Calorie Tracking</Text>

                <View style={styles.features}>
                    <Feature
                        title="Scan Your Food"
                        description="Take a photo of your meal and get instant nutrition info"
                        icon="📸"
                    />
                    <Feature
                        title="Personalized Meal Plans"
                        description="Receive custom meal plans based on your goals"
                        icon="🍽️"
                    />
                    <Feature
                        title="Track Your Progress"
                        description="Monitor your calories, macros and weight over time"
                        icon="📊"
                    />
                </View>

                <Button
                    style={styles.button}
                    size="large"
                    onPress={() => router.push('/onboarding/basic-info')}
                    disabled={isProfileLoading}
                >
                    Get Started
                </Button>
            </View>
        </SafeAreaView>
    );
}

interface FeatureProps {
    title: string;
    description: string;
    icon: string;
}

const Feature: React.FC<FeatureProps> = ({ title, description, icon }) => (
    <View style={styles.featureItem}>
        <Text style={styles.featureIcon}>{icon}</Text>
        <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: width * 0.8,
        height: width * 0.5,
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#4F46E5',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 40,
    },
    features: {
        width: '100%',
        marginBottom: 40,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    featureIcon: {
        fontSize: 28,
        marginRight: 16,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        color: '#6B7280',
    },
    button: {
        width: '100%',
    },
});