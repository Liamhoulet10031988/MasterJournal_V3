import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/AppStore';
import { formatAmount } from '../utils/formatters';
import { darkTheme, lightTheme, spacing, borderRadius, fontSize, fontWeight } from '../utils/theme';

export default function DebtsScreen() {
  const { debts, closeDebt, refreshDebts, theme: themeMode } = useAppStore();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDebts();
    setRefreshing(false);
  }, []);

  const handleCloseDebt = (debt) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Alert.alert(
      '💰 Погасить долг?',
      `Клиент: ${debt.client}\nСумма: ${formatAmount(debt.amount)}`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: '✅ Погасить',
          onPress: async () => {
            try {
              await closeDebt(debt.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('✅ Успех', 'Долг погашен!');
            } catch (error) {
              Alert.alert('❌ Ошибка', error.message || 'Не удалось погасить долг');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="checkmark-circle-outline" size={64} color={theme.success} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Все долги погашены! 🎉
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
        Новые долги появятся при создании заказа с оплатой "Долг"
      </Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <DebtCard
      debt={item}
      theme={theme}
      onClose={() => handleCloseDebt(item)}
    />
  );

  const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.content}>
        {/* Заголовок */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="wallet" size={28} color={theme.debt} />
            <Text style={[styles.title, { color: theme.text }]}>Долги</Text>
          </View>
          {debts.length > 0 && (
            <View style={[styles.totalBadge, { backgroundColor: `${theme.debt}20`, borderColor: theme.debt }]}>
              <Text style={[styles.totalText, { color: theme.debt }]}>
                {formatAmount(totalDebt)}
              </Text>
            </View>
          )}
        </View>

        {/* Список долгов */}
        <FlatList
          data={debts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

// Компонент карточки долга
const DebtCard = ({ debt, theme, onClose }) => (
  <Card style={[styles.card, { backgroundColor: theme.surface }]}>
    <Card.Content>
      {/* Вертикальная полоса */}
      <View style={[styles.statusBar, { backgroundColor: theme.debt }]} />
      
      <View style={styles.cardContent}>
        {/* Клиент */}
        <View style={styles.clientRow}>
          <Ionicons name="person" size={20} color={theme.debt} />
          <Text style={[styles.client, { color: theme.text }]} numberOfLines={1}>
            {debt.client}
          </Text>
        </View>

        {/* Авто */}
        {debt.car && (
          <View style={styles.carRow}>
            <Ionicons name="car-sport" size={16} color={theme.textSecondary} />
            <Text style={[styles.car, { color: theme.textSecondary }]} numberOfLines={1}>
              {debt.car}
            </Text>
          </View>
        )}

        {/* Сумма и кнопка */}
        <View style={styles.footer}>
          <View style={[styles.amountContainer, { backgroundColor: `${theme.debt}15`, borderColor: theme.debt }]}>
            <Text style={[styles.amount, { color: theme.debt }]}>
              {formatAmount(debt.amount)}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: theme.success }]}
            contentStyle={styles.closeButtonContent}
            labelStyle={styles.closeButtonLabel}
            compact
          >
            Погасить
          </Button>
        </View>
      </View>
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  totalBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  totalText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
  },
  statusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    paddingLeft: spacing.sm,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  client: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  car: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  amountContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flex: 1,
  },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  closeButton: {
    borderRadius: borderRadius.md,
  },
  closeButtonContent: {
    paddingHorizontal: spacing.sm,
  },
  closeButtonLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
