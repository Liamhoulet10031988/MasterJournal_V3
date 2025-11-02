/**
 * Валидация заказа
 */
export const validateOrder = (orderData) => {
  const errors = {};
  
  // Клиент обязателен
  if (!orderData.client || !orderData.client.trim()) {
    errors.client = 'Введите имя клиента';
  } else if (orderData.client.trim().length < 2) {
    errors.client = 'Имя клиента слишком короткое';
  }
  
  // Работа обязательна
  if (!orderData.job || !orderData.job.trim()) {
    errors.job = 'Укажите выполненную работу';
  }
  
  // Сумма работы или деталей должна быть больше нуля
  const workAmount = orderData.workAmount || 0;
  const ourPartsAmount = orderData.ourPartsAmount || 0;
  const totalAmount = workAmount + ourPartsAmount;
  
  // Для обратной совместимости проверяем и старое поле amount
  const amount = orderData.amount || 0;
  
  if (totalAmount <= 0 && amount <= 0) {
    errors.amount = 'Укажите сумму работы или деталей';
  } else if (totalAmount > 1000000 || amount > 1000000) {
    errors.amount = 'Сумма слишком большая';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Валидация JSON импорта
 */
export const validateImportJSON = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.orders || !Array.isArray(data.orders)) {
      return { isValid: false, error: 'Неверный формат: отсутствует массив orders' };
    }
    
    if (!data.debts || !Array.isArray(data.debts)) {
      return { isValid: false, error: 'Неверный формат: отсутствует массив debts' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Некорректный JSON' };
  }
};

/**
 * Проверка непустой строки
 */
export const isNotEmpty = (value) => {
  return value && value.trim().length > 0;
};

/**
 * Проверка числа
 */
export const isPositiveNumber = (value) => {
  return !isNaN(value) && Number(value) > 0;
};
