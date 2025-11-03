import React from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/AppStore';
import { OrderForm } from '../components/OrderForm';
import { darkTheme, lightTheme, spacing } from '../utils/theme';

export default function HomeScreen() {
  const { addOrder, theme: themeMode } = useAppStore();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const handleSave = async (orderData) => {
    try {
      await addOrder(orderData);
      
      // Успех - хаптика и уведомление
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Успех', 'Заказ сохранён!');
    } catch (error) {
      Alert.alert('❌ Ошибка', error.message || 'Не удалось сохранить заказ');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Заголовок */}
      <View style={styles.header}>
        <Ionicons name="flash" size={28} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Быстрый заказ</Text>
      </View>

      <OrderForm 
        onSubmit={handleSave}
        submitLabel="Сохранить заказ"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
