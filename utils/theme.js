/**
 * CYBER-GARAGE Theme (Dark) - Основная тема
 */
export const darkTheme = {
  // Фон и поверхности
  background: '#0B0E11',
  surface: '#121418',
  surfaceHighlight: '#1B1F24',

  // Текст
  text: '#E6EAF2',
  textSecondary: '#9AA4B2',
  textTertiary: '#7A8694',

  // Акцент (циан)
  primary: '#00E0FF',
  primaryGlow: 'rgba(0, 224, 255, 0.2)',

  // Статусы
  success: '#22C55E',
  info: '#3B82F6',
  warning: '#F59E0B',
  error: '#EF4444',

  // Типы оплаты
  cash: '#22C55E',
  cashless: '#3B82F6',
  debt: '#F59E0B',

  // Границы и делители
  border: '#262B31',
  divider: 'rgba(38, 43, 49, 0.2)',

  // Тени и свечение (неон)
  shadow: 'rgba(0, 0, 0, 0.5)',
  glow: 'rgba(0, 224, 255, 0.15)',

  // Прозрачности
  overlay: 'rgba(11, 14, 17, 0.95)',
  backdrop: 'rgba(0, 0, 0, 0.7)',
};

/**
 * CLEAN BUSINESS Theme (Light) - "Режим для шефа"
 */
export const lightTheme = {
  // Фон и поверхности
  background: '#F6F7FA',
  surface: '#FFFFFF',
  surfaceHighlight: '#EEF2F6',

  // Текст
  text: '#0E1420',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',

  // Акцент
  primary: '#2563EB',
  primaryGlow: 'rgba(37, 99, 235, 0.1)',

  // Статусы
  success: '#16A34A',
  info: '#2563EB',
  warning: '#F59E0B',
  error: '#DC2626',

  // Типы оплаты
  cash: '#16A34A',
  cashless: '#2563EB',
  debt: '#F59E0B',

  // Границы и делители
  border: '#E5E7EB',
  divider: 'rgba(229, 231, 235, 0.6)',

  // Тени
  shadow: 'rgba(0, 0, 0, 0.1)',
  glow: 'rgba(37, 99, 235, 0.05)',

  // Прозрачности
  overlay: 'rgba(255, 255, 255, 0.95)',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

/**
 * Получение цвета по типу оплаты
 */
export const getPayTypeColor = (payType, theme) => {
  switch (payType) {
    case 'cash':
      return theme.cash;
    case 'cashless':
      return theme.cashless;
    case 'debt':
      return theme.debt;
    default:
      return theme.textSecondary;
  }
};

/**
 * Общие константы стиля
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
};

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 22,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

/**
 * Анимации
 */
export const animation = {
  fast: 150,
  normal: 220,
  slow: 300,
};

/**
 * Размеры тач-зон
 */
export const touchSize = {
  min: 44,
  comfortable: 56,
};
