import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableWithoutFeedback
} from 'react-native';
import { Button } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonType?: 'primary' | 'success' | 'danger' | 'warning' | 'info';
    icon?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmButtonType = 'primary',
    icon = 'help-circle-outline',
    onConfirm,
    onCancel
}) => {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onCancel}
        >
            <Animated.View
                style={styles.overlay}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
            >
                <TouchableWithoutFeedback onPress={onCancel}>
                    <View style={styles.background} />
                </TouchableWithoutFeedback>

                <View style={styles.centeredContainer}
                >
                    <Animated.View
                        style={styles.modalContainer}
                        entering={SlideInDown.springify().damping(15)}
                        exiting={SlideOutDown.springify().damping(15)}
                    >

                        <View style={styles.modalContent}>
                            <View style={styles.iconContainer}>
                                <Ionicons
                                    name={icon as any}
                                    size={32}
                                    color="#4F46E5"
                                />
                            </View>

                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.message}>{message}</Text>

                            <View style={styles.buttonContainer}>
                                <Button
                                    appearance="ghost"
                                    status="basic"
                                    onPress={onCancel}
                                    style={styles.cancelButton}
                                >
                                    {cancelText}
                                </Button>

                                <Button
                                    status={confirmButtonType}
                                    onPress={onConfirm}
                                    style={styles.confirmButton}
                                >
                                    {confirmText}
                                </Button>
                            </View>
                        </View>
                    </Animated.View>
                </View>

            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        justifyContent: 'center',
        alignItems: 'center',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
    },

    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalContent: {
        padding: 24,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        color: '#6B7280',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    cancelButton: {
        flex: 1,
        marginRight: 8,
    },
    confirmButton: {
        flex: 1,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});