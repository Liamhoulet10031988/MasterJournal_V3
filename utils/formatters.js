/**
 * Форматирование суммы в рубли
 */
export const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0 ₽';
  return `${amount.toLocaleString('ru-RU')} ₽`;
};

/**
 * Форматирование даты
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Форматирование даты и времени
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

/**
 * Получение текста типа оплаты
 */
export const getPayTypeText = (payType) => {
  switch (payType) {
    case 'cash':
      return '💵 Наличные';
    case 'cashless':
      return '💳 Безналичные';
    case 'debt':
      return '⚠️ Долг';
    default:
      return payType;
  }
};

/**
 * Получение короткого текста типа оплаты
 */
export const getPayTypeShort = (payType) => {
  switch (payType) {
    case 'cash':
      return 'Нал';
    case 'cashless':
      return 'Безнал';
    case 'debt':
      return 'Долг';
    default:
      return payType;
  }
};

/**
 * Форматирование диапазона дат для статистики
 */
export const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  if (start === end) {
    return start;
  }
  
  return `${start} — ${end}`;
};

/**
 * Получение относительной даты
 */
export const getRelativeDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = date.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();
    
    if (dateStr === todayStr) {
      return 'Сегодня';
    } else if (dateStr === yesterdayStr) {
      return 'Вчера';
    } else {
      return formatDate(dateString);
    }
  } catch {
    return dateString;
  }
};
