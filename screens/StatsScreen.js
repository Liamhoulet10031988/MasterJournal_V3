import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/AppStore';
import { formatAmount } from '../utils/formatters';
import {
  darkTheme,
  lightTheme,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  getPayTypeColor,
} from '../utils/theme';

const PERIODS = [
  { label: 'Неделя', days: 7 },
  { label: 'Месяц', days: 30 },
  { label: '3 месяца', days: 90 },
  { label: 'Год', days: 365 },
];

// БАГ 8: Форматирование даты без UTC смещения
const formatLocalDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function StatsScreen() {
  const { stats, refreshStats, theme: themeMode } = useAppStore();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const [selectedPeriod, setSelectedPeriod] = useState(1); // Месяц по умолчанию

  // БАГ 8: useCallback с правильными зависимостями
  const loadStats = useCallback(async () => {
    const days = PERIODS[selectedPeriod].days;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const start = formatLocalDate(startDate); // БАГ 8: без UTC смещения
    const end = formatLocalDate(endDate); // БАГ 8: без UTC смещения

    await refreshStats(start, end);
  }, [selectedPeriod, refreshStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]); // БАГ 8: loadStats в зависимостях

  const selectPeriod = (index) => {
    setSelectedPeriod(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getPayTypeIcon = (payType) => {
    switch (payType) {
      case 'cash':
        return 'cash';
      case 'cashless':
        return 'card';
      case 'debt':
        return 'warning';
      default:
        return 'ellipse';
    }
  };

  const getPayTypeLabel = (payType) => {
    switch (payType) {
      case 'cash':
        return 'Наличные';
      case 'cashless':
        return 'Безналичные';
      case 'debt':
        return 'Долги';
      default:
        return payType;
    }
  };

  const workPercentage = stats.total > 0 ? (stats.totalWork / stats.total) * 100 : 0;
  const partsPercentage = stats.total > 0 ? (stats.totalOurParts / stats.total) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Ionicons name="stats-chart" size={28} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Статистика</Text>
        </View>

        {/* Выбор периода */}
        <View style={styles.periodSelector}>
          {PERIODS.map((period, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.periodButton,
                {
                  backgroundColor: selectedPeriod === index ? theme.primary : theme.surface,
                  borderColor: selectedPeriod === index ? theme.primary : theme.border,
                },
              ]}
              onPress={() => selectPeriod(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodText,
                  {
                    color: selectedPeriod === index ? theme.background : theme.text,
                    fontWeight: selectedPeriod === index ? '700' : '500',
                  },
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Общая статистика */}
        <Card style={[styles.totalCard, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <View style={styles.totalHeader}>
              <Ionicons name="trending-up" size={32} color={theme.primary} />
              <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>
                Всего за период
              </Text>
            </View>
            <Text style={[styles.totalAmount, { color: theme.primary }]}>
              {formatAmount(stats.total)}
            </Text>
            <View style={styles.totalFooter}>
              <View style={styles.countBadge}>
                <Ionicons name="receipt-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.countText, { color: theme.textSecondary }]}>
                  {stats.count} {stats.count === 1 ? 'заказ' : 'заказов'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Разбивка по работе и деталям */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>По видам работ:</Text>

        <Card style={[styles.breakdownCard, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Ionicons name="construct" size={24} color={theme.primary} />
                <Text style={[styles.breakdownLabel, { color: theme.text }]}>Работа</Text>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={[styles.breakdownAmount, { color: theme.primary }]}>
                  {formatAmount(stats.totalWork || 0)}
                </Text>
                <Text style={[styles.breakdownPercentage, { color: theme.textSecondary }]}>
                  {workPercentage.toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={[styles.progressBar, { backgroundColor: `${theme.primary}15` }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${workPercentage}%`,
                  },
                ]}
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.breakdownCard, { backgroundColor: theme.surface }]}>
          <Card.Content>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Ionicons name="settings" size={24} color={theme.cashless} />
                <Text style={[styles.breakdownLabel, { color: theme.text }]}>Наши детали</Text>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={[styles.breakdownAmount, { color: theme.cashless }]}>
                  {formatAmount(stats.totalOurParts || 0)}
                </Text>
                <Text style={[styles.breakdownPercentage, { color: theme.textSecondary }]}>
                  {partsPercentage.toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={[styles.progressBar, { backgroundColor: `${theme.cashless}15` }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.cashless,
                    width: `${partsPercentage}%`,
                  },
                ]}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Разбивка по типам оплаты */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>По типам оплаты:</Text>

        {stats.byType && stats.byType.length > 0 ? (
          stats.byType.map((item, index) => (
            <PayTypeCard
              key={index}
              payType={item.payType}
              amount={item.total}
              workAmount={item.totalWork || 0}
              partsAmount={item.totalOurParts || 0}
              count={item.count}
              percentage={(item.total / stats.total) * 100}
              theme={theme}
              icon={getPayTypeIcon(item.payType)}
              label={getPayTypeLabel(item.payType)}
            />
          ))
        ) : (
          <Card style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Card.Content>
              <View style={styles.emptyState}>
                <Ionicons name="pie-chart-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Нет данных за выбранный период
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Компонент карточки типа оплаты
const PayTypeCard = ({
  payType,
  amount,
  workAmount,
  partsAmount,
  count,
  percentage,
  theme,
  icon,
  label,
}) => {
  const color = getPayTypeColor(payType, theme);

  return (
    <Card style={[styles.payTypeCard, { backgroundColor: theme.surface }]}>
      <Card.Content>
        <View style={[styles.payTypeBar, { backgroundColor: color }]} />

        <View style={styles.payTypeContent}>
          <View style={styles.payTypeHeader}>
            <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon} size={24} color={color} />
            </View>
            <View style={styles.payTypeInfo}>
              <Text style={[styles.payTypeLabel, { color: theme.text }]}>{label}</Text>
              <Text style={[styles.payTypeCount, { color: theme.textSecondary }]}>
                {count} {count === 1 ? 'заказ' : 'заказов'}
              </Text>
            </View>
          </View>

          <View style={styles.payTypeFooter}>
            <Text style={[styles.payTypeAmount, { color }]}>{formatAmount(amount)}</Text>
            <Text style={[styles.payTypePercentage, { color: theme.textSecondary }]}>
              {percentage.toFixed(1)}%
            </Text>
          </View>

          {/* Дополнительная разбивка */}
          {(workAmount > 0 || partsAmount > 0) && (
            <View style={styles.payTypeBreakdown}>
              {workAmount > 0 && (
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownItemLabel, { color: theme.textTertiary }]}>
                    Работа:
                  </Text>
                  <Text style={[styles.breakdownItemValue, { color: theme.textSecondary }]}>
                    {formatAmount(workAmount)}
                  </Text>
                </View>
              )}
              {partsAmount > 0 && (
                <View style={styles.breakdownItem}>
                  <Text style={[styles.breakdownItemLabel, { color: theme.textTertiary }]}>
                    Детали:
                  </Text>
                  <Text style={[styles.breakdownItemValue, { color: theme.textSecondary }]}>
                    {formatAmount(partsAmount)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Прогресс-бар */}
          <View style={[styles.progressBar, { backgroundColor: `${color}15` }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: color,
                  width: `${percentage}%`,
                },
              ]}
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodText: {
    fontSize: fontSize.sm,
  },
  totalCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    elevation: 2,
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  totalAmount: {
    fontSize: 48,
    fontWeight: '700',
    marginVertical: spacing.sm,
  },
  totalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  breakdownCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    elevation: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  breakdownLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownAmount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  breakdownPercentage: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  payTypeCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    elevation: 1,
  },
  payTypeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  payTypeContent: {
    paddingLeft: spacing.sm,
  },
  payTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payTypeInfo: {
    flex: 1,
  },
  payTypeLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  payTypeCount: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  payTypeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  payTypeAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  payTypePercentage: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  payTypeBreakdown: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  breakdownItemLabel: {
    fontSize: fontSize.sm,
  },
  breakdownItemValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
});
