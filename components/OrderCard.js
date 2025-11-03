import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatAmount } from '../utils/formatters';
import { getPayTypeColor } from '../utils/theme';
import { spacing, borderRadius, fontSize, fontWeight } from '../utils/theme';

/**
 * Карточка заказа с вертикальной цветной полосой и неоновым эффектом
 */
export const OrderCard = ({ order, onPress, theme }) => {
  const payTypeColor = getPayTypeColor(order.payType, theme);
  
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: theme.surface }]}
    >
      {/* Вертикальная полоса по типу оплаты */}
      <View
        style={[
          styles.statusBar,
          {
            backgroundColor: payTypeColor,
            shadowColor: payTypeColor,
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      />
      
      <View style={styles.content}>
        {/* Заголовок: клиент + дата */}
        <View style={styles.header}>
          <View style={styles.clientInfo}>
            <Ionicons name="person" size={16} color={theme.primary} />
            <Text style={[styles.client, { color: theme.text }]} numberOfLines={1}>
              {order.client}
            </Text>
          </View>
          <Text style={[styles.date, { color: theme.textTertiary }]}>
            {order.date}
          </Text>
        </View>
        
        {/* Авто */}
        {order.car && (
          <View style={styles.row}>
            <Ionicons name="car-sport" size={14} color={theme.textSecondary} />
            <Text style={[styles.car, { color: theme.textSecondary }]} numberOfLines={1}>
              {order.car}
            </Text>
          </View>
        )}
        
        {/* Работа */}
        <Text style={[styles.job, { color: theme.text }]} numberOfLines={2}>
          {order.job}
        </Text>
        
        {/* Нижний ряд: доп. инфо + сумма */}
        <View style={styles.footer}>
          <View style={styles.tags}>
            {order.freonGrams && (
              <View style={[styles.tag, { backgroundColor: theme.surfaceHighlight }]}>
                <Ionicons name="snow" size={12} color={theme.info} />
                <Text style={[styles.tagText, { color: theme.info }]}>
                  {order.freonGrams}г
                </Text>
              </View>
            )}
            {order.parts && (
              <View style={[styles.tag, { backgroundColor: theme.surfaceHighlight }]}>
                <Ionicons name="build" size={12} color={theme.warning} />
                <Text style={[styles.tagText, { color: theme.warning }]}>
                  Детали
                </Text>
              </View>
            )}
          </View>
          
          {/* Сумма с неоновым эффектом */}
          <View
            style={[
              styles.amountContainer,
              {
                backgroundColor: `${payTypeColor}10`,
                borderColor: payTypeColor,
              },
            ]}
          >
            <Text
              style={[
                styles.amount,
                {
                  color: payTypeColor,
                  textShadowColor: payTypeColor,
                  textShadowRadius: Platform.OS === 'ios' ? 8 : 0,
                },
              ]}
            >
              {formatAmount(order.amount)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    overflow: 'hidden',
    // Тень для глубины
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBar: {
    width: 4,
    // Неоновое свечение на iOS
    ...(Platform.OS === 'ios' && {
      shadowOffset: { width: 0, height: 0 },
    }),
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  client: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
    flex: 1,
  },
  date: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  car: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
    flex: 1,
  },
  job: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.md,
    fontWeight: fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  amountContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
});
