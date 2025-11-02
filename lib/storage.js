import AsyncStorage from '@react-native-async-storage/async-storage';
import * as XLSX from 'xlsx';

const ORDERS_KEY = '@orders';
const DEBTS_KEY = '@debts';
const DELETED_SNAPSHOTS_KEY = '@deleted_snapshots';
const MIGRATION_KEY = '@migration_v2';

/**
 * ИСПРАВЛЕНИЕ БАГ 9: Форматирование даты в локальном часовом поясе (YYYY-MM-DD)
 * без смещения UTC
 */
const formatLocalDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
export const initStorage = async () => {
  try {
    const orders = await AsyncStorage.getItem(ORDERS_KEY);
    if (!orders) {
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify([]));
    }
    
    const debts = await AsyncStorage.getItem(DEBTS_KEY);
    if (!debts) {
      await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify([]));
    }
    
    // Проверка миграции
    await migrateDataIfNeeded();
    
    console.log('✅ Storage initialized');
  } catch (error) {
    console.error('❌ Storage init error:', error);
    throw new Error('Не удалось инициализировать хранилище');
  }
};

// ==================== МИГРАЦИЯ ДАННЫХ ====================

/**
 * Миграция старых данных к новому формату
 */
const migrateDataIfNeeded = async () => {
  try {
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrated === 'v2') {
      return; // Уже мигрировано
    }
    
    const orders = await AsyncStorage.getItem(ORDERS_KEY);
    if (!orders) {
      await AsyncStorage.setItem(MIGRATION_KEY, 'v2');
      return;
    }
    
    const ordersList = JSON.parse(orders);
    let migrationNeeded = false;
    
    const migratedOrders = ordersList.map(order => {
      // Проверяем, нужна ли миграция для этого заказа
      if (!order.hasOwnProperty('workAmount') || !order.hasOwnProperty('totalAmount')) {
        migrationNeeded = true;
        
        // Миграция: старое amount становится workAmount
        const workAmount = order.amount || 0;
        const ourPartsAmount = 0;
        const totalAmount = workAmount + ourPartsAmount;
        
        return {
          ...order,
          workAmount,
          ourParts: '',
          ourPartsAmount,
          clientParts: order.parts || '',
          totalAmount,
          // Сохраняем старое amount для совместимости
          amount: totalAmount,
        };
      }
      
      // Заказ уже в новом формате, обновляем amount для совместимости
      return {
        ...order,
        amount: order.totalAmount || order.amount || 0,
      };
    });
    
    if (migrationNeeded) {
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(migratedOrders));
      console.log('✅ Data migrated to v2');
    }
    
    await AsyncStorage.setItem(MIGRATION_KEY, 'v2');
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
};

// ==================== ЗАКАЗЫ ====================

/**
 * Сохранение заказа
 * Если payType = 'debt', автоматически создаётся связанный открытый долг
 */
export const saveOrder = async (orderData) => {
  try {
    const orders = await AsyncStorage.getItem(ORDERS_KEY);
    const ordersList = orders ? JSON.parse(orders) : [];
    
    // Вычисляем totalAmount
    const workAmount = orderData.workAmount || 0;
    const ourPartsAmount = orderData.ourPartsAmount || 0;
    const totalAmount = workAmount + ourPartsAmount;
    
    const newOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: formatLocalDate(orderData.date), // ИСПРАВЛЕНИЕ: без UTC смещения
      client: orderData.client,
      car: orderData.car || '',
      job: orderData.job,
      workAmount,
      ourParts: orderData.ourParts || '',
      ourPartsAmount,
      clientParts: orderData.clientParts || '',
      totalAmount,
      payType: orderData.payType,
      freonGrams: orderData.freonGrams || null,
      comment: orderData.comment || '',
      createdAt: new Date().toISOString(),
      // Для совместимости со старым кодом
      amount: totalAmount,
      parts: orderData.clientParts || orderData.parts || '',
    };
    
    ordersList.unshift(newOrder);
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(ordersList));
    
    // ИСПРАВЛЕНИЕ БАГ 3: Транзакция - откат при ошибке создания долга
    if (orderData.payType === 'debt') {
      try {
        await createDebt({
          orderId: newOrder.id,
          client: orderData.client,
          car: orderData.car || '',
          amount: totalAmount,
        });
      } catch (debtError) {
        // Откат: удаляем заказ из хранилища
        console.error('❌ Failed to create debt, rolling back order:', debtError);
        const rollbackOrders = ordersList.filter(o => o.id !== newOrder.id);
        await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(rollbackOrders));
        throw new Error('Не удалось создать долг. Заказ не сохранён.');
      }
    }
    
    console.log('✅ Order saved:', newOrder.id);
    return newOrder;
  } catch (error) {
    console.error('❌ Save order error:', error);
    throw error;
  }
};

/**
 * Обновление заказа
 */
export const updateOrder = async (orderId, orderPatch) => {
  try {
    const orders = await AsyncStorage.getItem(ORDERS_KEY);
    const ordersList = orders ? JSON.parse(orders) : [];
    
    const orderIndex = ordersList.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Заказ не найден');
    }
    
    const existingOrder = ordersList[orderIndex];
    
    // Вычисляем новый totalAmount
    const workAmount = orderPatch.workAmount !== undefined ? orderPatch.workAmount : existingOrder.workAmount || 0;
    const ourPartsAmount = orderPatch.ourPartsAmount !== undefined ? orderPatch.ourPartsAmount : existingOrder.ourPartsAmount || 0;
    const totalAmount = workAmount + ourPartsAmount;
    
    const updatedOrder = {
      ...existingOrder,
      ...orderPatch,
      date: orderPatch.date ? formatLocalDate(orderPatch.date) : existingOrder.date, // ИСПРАВЛЕНИЕ: без UTC смещения
      workAmount,
      ourPartsAmount,
      totalAmount,
      // Для совместимости
      amount: totalAmount,
      parts: orderPatch.clientParts !== undefined ? orderPatch.clientParts : existingOrder.clientParts || existingOrder.parts || '',
      updatedAt: new Date().toISOString(),
    };
    
    ordersList[orderIndex] = updatedOrder;
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(ordersList));
    
    // ИСПРАВЛЕНИЕ БАГ 4: Управление долгом при смене payType
    const oldPayType = existingOrder.payType;
    const newPayType = updatedOrder.payType;
    
    // Найдем существующий долг
    const existingDebt = await findDebtByOrderId(orderId);
    
    if (oldPayType === 'debt' && newPayType !== 'debt') {
      // Долг был, теперь нет - удаляем/закрываем долг
      if (existingDebt) {
        const debts = await AsyncStorage.getItem(DEBTS_KEY);
        const debtsList = debts ? JSON.parse(debts) : [];
        const filteredDebts = debtsList.filter(d => d.id !== existingDebt.id);
        await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(filteredDebts));
        console.log('✅ Removed old debt:', existingDebt.id);
      }
    } else if (oldPayType !== 'debt' && newPayType === 'debt') {
      // Долга не было, теперь есть - создаем долг
      if (!existingDebt) {
        await createDebt({
          orderId: updatedOrder.id,
          client: updatedOrder.client,
          car: updatedOrder.car,
          amount: totalAmount,
        });
        console.log('✅ Created new debt for order:', orderId);
      }
    } else if (newPayType === 'debt') {
      // Долг был и остался - обновляем сумму/данные
      if (existingDebt && !existingDebt.closed) {
        const debts = await AsyncStorage.getItem(DEBTS_KEY);
        const debtsList = debts ? JSON.parse(debts) : [];
        const debtIndex = debtsList.findIndex(d => d.id === existingDebt.id);
        
        if (debtIndex !== -1) {
          debtsList[debtIndex].amount = totalAmount;
          debtsList[debtIndex].client = updatedOrder.client;
          debtsList[debtIndex].car = updatedOrder.car;
          await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(debtsList));
        }
      }
    }
    
    console.log('✅ Order updated:', orderId);
    return updatedOrder;
  } catch (error) {
    console.error('❌ Update order error:', error);
    throw error;
  }
};

/**
 * Получение заказа по ID
 */
export const getOrderById = async (orderId) => {
  try {
    const orders = await AsyncStorage.getItem(ORDERS_KEY);
    const ordersList = orders ? JSON.parse(orders) : [];
    return ordersList.find(o => o.id === orderId) || null;
  } catch (error) {
    console.error('❌ Get order by ID error:', error);
    return null;
  }
};

/**
 * Получение заказов с пагинацией
 * @param {number} limit - количество записей
 * @param {number} offset - смещение
 */
export const getOrders = async (limit = 100, offset = 0) => {
  try {
    const orders = await AsyncStorage.getItem(ORDERS_KEY);
    const ordersList = orders ? JSON.parse(orders) : [];
    
    return ordersList.slice(offset, offset + limit);
  } catch (error) {
    console.error('❌ Get orders error:', error);
    return [];
  }
};

/**
 * Получение всех заказов (для статистики и экспорта)
 */
export const getAllOrders = async () => {
  try {
    const orders = await AsyncStorage.getItem(ORDERS_KEY);
    return orders ? JSON.parse(orders) : [];
  } catch (error) {
    console.error('❌ Get all orders error:', error);
    return [];
  }
};

/**
 * Поиск заказов по диапазону дат
 * @param {string} startDate - начальная дата в формате YYYY-MM-DD
 * @param {string} endDate - конечная дата в формате YYYY-MM-DD
 */
export const searchByDateRange = async (startDate, endDate) => {
  try {
    const orders = await getAllOrders();
    
    return orders.filter(order => {
      return order.date >= startDate && order.date <= endDate;
    });
  } catch (error) {
    console.error('❌ Search by date range error:', error);
    return [];
  }
};

/**
 * Удаление заказа с созданием снапшота для Undo
 * @param {string} orderId 
 * @param {boolean} deleteLinkedDebt - удалять ли связанный открытый долг
 */
export const deleteOrder = async (orderId, deleteLinkedDebt = true) => {
  try {
    const orders = await AsyncStorage.getItem(ORDERS_KEY);
    const ordersList = orders ? JSON.parse(orders) : [];
    
    const orderIndex = ordersList.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Заказ не найден');
    }
    
    const deletedOrder = ordersList[orderIndex];
    
    // Создаем снапшот для Undo
    const snapshot = {
      id: `snapshot_${Date.now()}`,
      order: deletedOrder,
      deletedDebt: null,
      timestamp: Date.now(),
    };
    
    // Удаляем связанный долг если нужно
    let linkedDebt = null;
    if (deleteLinkedDebt && deletedOrder.payType === 'debt') {
      linkedDebt = await findDebtByOrderId(orderId);
      if (linkedDebt && !linkedDebt.closed) {
        await deleteDebt(linkedDebt.id);
        snapshot.deletedDebt = linkedDebt;
      }
    }
    
    // Удаляем заказ
    ordersList.splice(orderIndex, 1);
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(ordersList));
    
    // Сохраняем снапшот
    await saveSnapshot(snapshot);
    
    console.log('✅ Order deleted:', orderId);
    return { deletedOrder, linkedDebt, snapshotId: snapshot.id };
  } catch (error) {
    console.error('❌ Delete order error:', error);
    throw error;
  }
};

/**
 * Восстановление удаленного заказа (Undo)
 */
export const undoDeleteOrder = async (snapshotId) => {
  try {
    const snapshots = await AsyncStorage.getItem(DELETED_SNAPSHOTS_KEY);
    const snapshotsList = snapshots ? JSON.parse(snapshots) : [];
    
    const snapshot = snapshotsList.find(s => s.id === snapshotId);
    if (!snapshot) {
      throw new Error('Снапшот не найден');
    }
    
    // Восстанавливаем заказ
    const orders = await AsyncStorage.getItem(ORDERS_KEY);
    const ordersList = orders ? JSON.parse(orders) : [];
    ordersList.unshift(snapshot.order);
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(ordersList));
    
    // Восстанавливаем долг если был
    if (snapshot.deletedDebt) {
      const debts = await AsyncStorage.getItem(DEBTS_KEY);
      const debtsList = debts ? JSON.parse(debts) : [];
      debtsList.unshift(snapshot.deletedDebt);
      await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(debtsList));
    }
    
    // Удаляем снапшот
    const updatedSnapshots = snapshotsList.filter(s => s.id !== snapshotId);
    await AsyncStorage.setItem(DELETED_SNAPSHOTS_KEY, JSON.stringify(updatedSnapshots));
    
    console.log('✅ Order restored:', snapshot.order.id);
    return { order: snapshot.order, debt: snapshot.deletedDebt };
  } catch (error) {
    console.error('❌ Undo delete error:', error);
    throw error;
  }
};

// ==================== ДОЛГИ ====================

/**
 * Создание долга
 */
const createDebt = async (debtData) => {
  try {
    const debts = await AsyncStorage.getItem(DEBTS_KEY);
    const debtsList = debts ? JSON.parse(debts) : [];
    
    const newDebt = {
      id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...debtData,
      closed: false,
      closedAt: null,
      createdAt: new Date().toISOString(),
    };
    
    debtsList.unshift(newDebt);
    await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(debtsList));
    
    console.log('✅ Debt created:', newDebt.id);
    return newDebt;
  } catch (error) {
    console.error('❌ Create debt error:', error);
    throw error;
  }
};

/**
 * Получение долгов
 * @param {boolean} onlyOpen - только открытые долги
 */
export const getDebts = async (onlyOpen = true) => {
  try {
    const debts = await AsyncStorage.getItem(DEBTS_KEY);
    const debtsList = debts ? JSON.parse(debts) : [];
    
    if (onlyOpen) {
      return debtsList.filter(d => !d.closed);
    }
    
    return debtsList;
  } catch (error) {
    console.error('❌ Get debts error:', error);
    return [];
  }
};

/**
 * Закрытие долга
 */
export const closeDebt = async (debtId) => {
  try {
    const debts = await AsyncStorage.getItem(DEBTS_KEY);
    const debtsList = debts ? JSON.parse(debts) : [];
    
    const debtIndex = debtsList.findIndex(d => d.id === debtId);
    if (debtIndex === -1) {
      throw new Error('Долг не найден');
    }
    
    debtsList[debtIndex].closed = true;
    debtsList[debtIndex].closedAt = new Date().toISOString();
    
    await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(debtsList));
    
    console.log('✅ Debt closed:', debtId);
    return debtsList[debtIndex];
  } catch (error) {
    console.error('❌ Close debt error:', error);
    throw error;
  }
};

/**
 * Удаление долга (для каскадного удаления)
 */
const deleteDebt = async (debtId) => {
  try {
    const debts = await AsyncStorage.getItem(DEBTS_KEY);
    const debtsList = debts ? JSON.parse(debts) : [];
    
    const filtered = debtsList.filter(d => d.id !== debtId);
    await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(filtered));
    
    console.log('✅ Debt deleted:', debtId);
  } catch (error) {
    console.error('❌ Delete debt error:', error);
    throw error;
  }
};

/**
 * Поиск долга по ID заказа
 */
const findDebtByOrderId = async (orderId) => {
  try {
    const debts = await AsyncStorage.getItem(DEBTS_KEY);
    const debtsList = debts ? JSON.parse(debts) : [];
    
    return debtsList.find(d => d.orderId === orderId);
  } catch (error) {
    return null;
  }
};

// ==================== ПОДСКАЗКИ ====================

/**
 * Топ-5 уникальных клиентов по подстроке
 */
export const searchClients = async (query) => {
  try {
    const orders = await getAllOrders();
    
    const clients = [...new Set(
      orders
        .map(o => o.client)
        .filter(c => c && c.toLowerCase().includes(query.toLowerCase()))
    )];
    
    return clients.slice(0, 5);
  } catch (error) {
    return [];
  }
};

/**
 * Топ-5 уникальных авто по подстроке
 */
export const searchCars = async (query) => {
  try {
    const orders = await getAllOrders();
    
    const cars = [...new Set(
      orders
        .map(o => o.car)
        .filter(c => c && c.toLowerCase().includes(query.toLowerCase()))
    )];
    
    return cars.slice(0, 5);
  } catch (error) {
    return [];
  }
};

// ==================== СТАТИСТИКА ====================

/**
 * Статистика по диапазону дат
 */
export const getStats = async (startDate, endDate) => {
  try {
    const orders = await getAllOrders();
    
    const filtered = orders.filter(order => {
      return order.date >= startDate && order.date <= endDate;
    });
    
    // Общие суммы
    const totalAmount = filtered.reduce((sum, order) => sum + (order.totalAmount || order.amount || 0), 0);
    const totalWork = filtered.reduce((sum, order) => sum + (order.workAmount || 0), 0);
    const totalOurParts = filtered.reduce((sum, order) => sum + (order.ourPartsAmount || 0), 0);
    const count = filtered.length;
    
    // По типам оплаты
    const byType = filtered.reduce((acc, order) => {
      const existing = acc.find(item => item.payType === order.payType);
      const orderTotal = order.totalAmount || order.amount || 0;
      const orderWork = order.workAmount || 0;
      const orderOurParts = order.ourPartsAmount || 0;
      
      if (existing) {
        existing.total += orderTotal;
        existing.totalWork += orderWork;
        existing.totalOurParts += orderOurParts;
        existing.count += 1;
      } else {
        acc.push({
          payType: order.payType,
          total: orderTotal,
          totalWork: orderWork,
          totalOurParts: orderOurParts,
          count: 1,
        });
      }
      return acc;
    }, []);
    
    return { 
      total: totalAmount,
      totalWork,
      totalOurParts,
      byType, 
      count 
    };
  } catch (error) {
    console.error('❌ Get stats error:', error);
    return { total: 0, totalWork: 0, totalOurParts: 0, byType: [], count: 0 };
  }
};

// ==================== ЭКСПОРТ/ИМПОРТ ====================

/**
 * Получение дня недели на русском
 */
const getDayOfWeek = (dateString) => {
  try {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[date.getDay()];
  } catch {
    return '';
  }
};

/**
 * Экспорт в JSON (стандартный)
 */
export const exportJSON = async () => {
  try {
    const orders = await getAllOrders();
    const debts = await getDebts(false); // все долги
    
    // ИСПРАВЛЕНИЕ: Сохраняем id + добавляем версию схемы для миграций
    const exportData = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      orders,
      debts
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('❌ Export JSON error:', error);
    throw new Error('Не удалось экспортировать данные');
  }
};

/**
 * Экспорт в JSON с русскими ключами
 */
export const exportJSONRussian = async () => {
  try {
    const orders = await getAllOrders();
    
    const russianOrders = orders.map(order => ({
      дата: order.date,
      'день_недели': getDayOfWeek(order.date),
      клиент: order.client,
      авто: order.car || '',
      'работы_описание': order.job,
      'сумма_работы': order.workAmount || 0,
      'детали_наши': order.ourParts || '',
      'сумма_деталей_наших': order.ourPartsAmount || 0,
      'детали_клиента': order.clientParts || '',
      оплата: order.payType === 'cash' ? 'Нал' : order.payType === 'cashless' ? 'Безнал' : 'Долг',
      итого: order.totalAmount || order.amount || 0,
      фреон_граммы: order.freonGrams || '',
      комментарий: order.comment || '',
    }));
    
    return JSON.stringify({ заказы: russianOrders }, null, 2);
  } catch (error) {
    console.error('❌ Export JSON Russian error:', error);
    throw new Error('Не удалось экспортировать данные в русском формате');
  }
};

/**
 * Экспорт в CSV (оставлен для совместимости)
 */
export const exportCSV = async () => {
  try {
    const orders = await getAllOrders();
    
    // UTF-8 BOM
    const BOM = '\ufeff';
    
    // Заголовок
    let csv = BOM;
    csv += '"Дата";"День недели";"Клиент";"Авто";"Работы (описание)";"Сумма работы";"Детали наши";"Сумма деталей наших";"Детали клиента";"Оплата";"Итого";"Фреон (г)";"Комментарий"\r\n';
    
    let totalWork = 0;
    let totalOurParts = 0;
    let totalAmount = 0;
    let cashTotal = 0;
    let cashlessTotal = 0;
    let debtTotal = 0;
    
    // Экранирование для CSV
    const esc = (val) => {
      if (val === null || val === undefined) return '';
      return String(val).replace(/"/g, '""');
    };
    
    // Данные заказов
    orders.forEach(o => {
      const dayOfWeek = getDayOfWeek(o.date);
      const payText = o.payType === 'cash' ? 'Нал' : o.payType === 'cashless' ? 'Безнал' : 'Долг';
      const work = o.workAmount || 0;
      const parts = o.ourPartsAmount || 0;
      const total = o.totalAmount || o.amount || 0;
      
      csv += `"${esc(o.date)}";"${esc(dayOfWeek)}";"${esc(o.client)}";"${esc(o.car)}";"${esc(o.job)}";"${work}";"${esc(o.ourParts)}";"${parts}";"${esc(o.clientParts)}";"${payText}";"${total}";"${esc(o.freonGrams)}";"${esc(o.comment)}"\r\n`;
      
      totalWork += work;
      totalOurParts += parts;
      totalAmount += total;
      
      if (o.payType === 'cash') cashTotal += total;
      else if (o.payType === 'cashless') cashlessTotal += total;
      else if (o.payType === 'debt') debtTotal += total;
    });
    
    // Разделитель
    csv += '\r\n';
    csv += '"==========================";"";"";"";"";"";"";"";"";"";"";"";"";\r\n';
    csv += '\r\n';
    
    // Блок итогов
    csv += '">>> ИТОГОВЫЕ СУММЫ <<<";"";"";"";"";"";"";"";"";"";"";"";"";\r\n';
    csv += '"";"";"";"";"";"";"";"";"";"";"";"";"";\r\n';
    csv += '"";"";"";"";"";"' + totalWork + '";"";"";"";"";"";"";""\r\n';
    csv += '"";"";"";"";"";"";"";' + totalOurParts + '";"";"";"";"";""\r\n';
    csv += '"";"";"";"";"";"";"";"";"";"";' + totalAmount + ';"";"";\r\n';
    csv += '"";"";"";"";"";"";"";"";"";"";"";"";"";\r\n';
    
    // Итоги по оплате
    csv += '">>> РАЗБИВКА ПО ОПЛАТЕ <<<";"";"";"";"";"";"";"";"";"";"";"";"";\r\n';
    csv += '"Наличные:";"";"";"";"";"";"";"";"";"";' + cashTotal + ';"";"";\r\n';
    csv += '"Безналичные:";"";"";"";"";"";"";"";"";"";' + cashlessTotal + ';"";"";\r\n';
    csv += '"Долги:";"";"";"";"";"";"";"";"";"";' + debtTotal + ';"";"";\r\n';
    
    return csv;
  } catch (error) {
    console.error('❌ Export CSV error:', error);
    throw new Error('Не удалось экспортировать CSV');
  }
};

/**
 * Экспорт в PDF через expo-print (работает в Expo Go!)
 */
export const exportPDF = async () => {
  try {
    const { printToFileAsync } = require('expo-print');
    const orders = await getAllOrders();
    
    let totalWork = 0;
    let totalOurParts = 0;
    let totalAmount = 0;
    let cashTotal = 0;
    let cashlessTotal = 0;
    let debtTotal = 0;
    
    // Генерация строк таблицы
    let tableRows = '';
    orders.forEach(o => {
      const dayOfWeek = getDayOfWeek(o.date);
      const payText = o.payType === 'cash' ? 'Нал' : o.payType === 'cashless' ? 'Б/Н' : 'Долг';
      const work = o.workAmount || 0;
      const parts = o.ourPartsAmount || 0;
      const total = o.totalAmount || o.amount || 0;
      
      tableRows += `
        <tr>
          <td>${o.date}</td>
          <td>${dayOfWeek}</td>
          <td>${o.client}</td>
          <td>${o.car || ''}</td>
          <td class="wide">${o.job}</td>
          <td class="number">${work}</td>
          <td class="wide">${o.ourParts || ''}</td>
          <td class="number">${parts}</td>
          <td class="wide">${o.clientParts || ''}</td>
          <td class="center">${payText}</td>
          <td class="number"><strong>${total}</strong></td>
        </tr>
      `;
      
      totalWork += work;
      totalOurParts += parts;
      totalAmount += total;
      
      if (o.payType === 'cash') cashTotal += total;
      else if (o.payType === 'cashless') cashlessTotal += total;
      else if (o.payType === 'debt') debtTotal += total;
    });
    
    // HTML шаблон с CSS
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 15px;
          font-size: 9px;
        }
        h1 {
          text-align: center;
          color: #4472C4;
          margin-bottom: 3px;
          font-size: 16px;
        }
        .date {
          text-align: center;
          color: #666;
          margin-bottom: 12px;
          font-size: 9px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        th {
          background-color: #4472C4;
          color: white;
          padding: 6px 4px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #000;
          font-size: 8px;
        }
        td {
          padding: 4px;
          border: 1px solid #000;
          vertical-align: top;
          font-size: 8px;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .wide {
          max-width: 120px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .number {
          text-align: right;
        }
        .center {
          text-align: center;
        }
        .summary {
          margin-top: 15px;
          page-break-inside: avoid;
        }
        .summary-title {
          font-size: 12px;
          font-weight: bold;
          color: #4472C4;
          margin-bottom: 8px;
        }
        .summary-table {
          width: 50%;
          margin-bottom: 15px;
          border-collapse: collapse;
        }
        .summary-table td {
          padding: 6px;
          border: 1px solid #ddd;
          font-size: 9px;
        }
        .summary-table td:first-child {
          font-weight: bold;
          background-color: #f0f0f0;
          width: 60%;
        }
        .summary-table td:last-child {
          text-align: right;
          background-color: #FFF2CC;
          font-weight: bold;
          width: 40%;
        }
      </style>
    </head>
    <body>
      <h1>Отчёт по заказам</h1>
      <div class="date">Дата создания: ${new Date().toLocaleDateString('ru-RU')}</div>
      
      <table>
        <thead>
          <tr>
            <th>Дата</th>
            <th>День</th>
            <th>Клиент</th>
            <th>Авто</th>
            <th>Работы</th>
            <th>Сумма<br/>работы</th>
            <th>Детали<br/>наши</th>
            <th>Сумма<br/>деталей</th>
            <th>Детали<br/>клиента</th>
            <th>Оплата</th>
            <th>Итого</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div class="summary">
        <div class="summary-title">ИТОГОВЫЕ СУММЫ:</div>
        <table class="summary-table">
          <tr>
            <td>Сумма работы:</td>
            <td>${totalWork} ₽</td>
          </tr>
          <tr>
            <td>Сумма деталей наших:</td>
            <td>${totalOurParts} ₽</td>
          </tr>
          <tr>
            <td>ИТОГО:</td>
            <td>${totalAmount} ₽</td>
          </tr>
        </table>
      </div>
      
      <div class="summary">
        <div class="summary-title">РАЗБИВКА ПО ОПЛАТЕ:</div>
        <table class="summary-table">
          <tr>
            <td>Наличные:</td>
            <td>${cashTotal} ₽</td>
          </tr>
          <tr>
            <td>Безналичные:</td>
            <td>${cashlessTotal} ₽</td>
          </tr>
          <tr>
            <td>Долги:</td>
            <td>${debtTotal} ₽</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
    `;
    
    // Генерация PDF через expo-print
    const { uri } = await printToFileAsync({
      html: htmlContent,
      base64: false
    });
    
    return uri;
  } catch (error) {
    console.error('❌ Export PDF error:', error);
    throw new Error('Не удалось экспортировать PDF: ' + error.message);
  }
};

/**
 * Экспорт в XLSX с форматированием
 */
export const exportXLSX = async () => {
  try {
    // XLSX уже импортирован в начале файла
    const orders = await getAllOrders();
    
    // Подготовка данных для таблицы
    const data = [];
    
    // Заголовок
    data.push([
      'Дата',
      'День недели',
      'Клиент',
      'Авто',
      'Работы (описание)',
      'Сумма работы',
      'Детали наши',
      'Сумма деталей наших',
      'Детали клиента',
      'Оплата',
      'Итого',
      'Фреон (г)',
      'Комментарий'
    ]);
    
    let totalWork = 0;
    let totalOurParts = 0;
    let totalAmount = 0;
    let cashTotal = 0;
    let cashlessTotal = 0;
    let debtTotal = 0;
    
    // Данные заказов
    orders.forEach(o => {
      const dayOfWeek = getDayOfWeek(o.date);
      const payText = o.payType === 'cash' ? 'Нал' : o.payType === 'cashless' ? 'Безнал' : 'Долг';
      const work = o.workAmount || 0;
      const parts = o.ourPartsAmount || 0;
      const total = o.totalAmount || o.amount || 0;
      
      data.push([
        o.date,
        dayOfWeek,
        o.client,
        o.car || '',
        o.job,
        work,
        o.ourParts || '',
        parts,
        o.clientParts || '',
        payText,
        total,
        o.freonGrams || '',
        o.comment || ''
      ]);
      
      totalWork += work;
      totalOurParts += parts;
      totalAmount += total;
      
      if (o.payType === 'cash') cashTotal += total;
      else if (o.payType === 'cashless') cashlessTotal += total;
      else if (o.payType === 'debt') debtTotal += total;
    });
    
    // Пустая строка
    data.push([]);
    data.push([]);
    
    // ИТОГОВЫЕ СУММЫ
    data.push(['=== ИТОГОВЫЕ СУММЫ ===', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['', '', '', '', 'Сумма работы:', totalWork, '', '', '', '', '', '', '']);
    data.push(['', '', '', '', '', '', 'Сумма деталей наших:', totalOurParts, '', '', '', '', '']);
    data.push(['', '', '', '', '', '', '', '', '', '', 'ИТОГО:', totalAmount, '']);
    
    // Пустая строка
    data.push([]);
    
    // РАЗБИВКА ПО ОПЛАТЕ
    data.push(['=== РАЗБИВКА ПО ОПЛАТЕ ===', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['Наличные:', '', '', '', '', '', '', '', '', '', cashTotal, '', '']);
    data.push(['Безналичные:', '', '', '', '', '', '', '', '', '', cashlessTotal, '', '']);
    data.push(['Долги:', '', '', '', '', '', '', '', '', '', debtTotal, '', '']);
    
    // Создание worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Настройка ширины столбцов
    const colWidths = [
      { wch: 12 },  // Дата
      { wch: 15 },  // День недели
      { wch: 20 },  // Клиент
      { wch: 15 },  // Авто
      { wch: 40 },  // Работы (очень широкая)
      { wch: 15 },  // Сумма работы
      { wch: 30 },  // Детали наши
      { wch: 20 },  // Сумма деталей
      { wch: 30 },  // Детали клиента
      { wch: 12 },  // Оплата
      { wch: 15 },  // Итого
      { wch: 12 },  // Фреон
      { wch: 40 }   // Комментарий (очень широкая)
    ];
    ws['!cols'] = colWidths;
    
    // Создание workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Заказы');
    
    // Генерация файла
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    return wbout;
  } catch (error) {
    console.error('❌ Export XLSX error:', error);
    throw new Error('Не удалось экспортировать XLSX: ' + error.message);
  }
};

/**
 * Импорт из JSON (слияние без дублей)
 */
export const importJSON = async (jsonString) => {
  try {
    const imported = JSON.parse(jsonString);
    
    // Миграция старой схемы (без version)
    let orders = imported.orders || [];
    let debts = imported.debts || [];
    
    if (!orders.length && !debts.length) {
      throw new Error('Неверный формат JSON');
    }
    
    // Генерация id для заказов без id + обратная совместимость amount/totalAmount
    orders = orders.map(order => {
      const normalizedOrder = {
        ...order,
        id: order.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
        // ИСПРАВЛЕНИЕ: обратная совместимость
        totalAmount: order.totalAmount || order.amount || 0,
      };
      
      // Удаляем старое поле amount если есть
      if (order.amount !== undefined && !order.totalAmount) {
        delete normalizedOrder.amount;
      }
      
      return normalizedOrder;
    });
    
    // Генерация id для долгов без id
    debts = debts.map(debt => ({
      ...debt,
      id: debt.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
    }));
    
    // Слияние заказов
    const existingOrders = await getAllOrders();
    const existingOrderIds = new Set(existingOrders.map(o => o.id));
    
    const newOrders = orders.filter(o => !existingOrderIds.has(o.id));
    const mergedOrders = [...newOrders, ...existingOrders];
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(mergedOrders));
    
    // Слияние долгов
    const existingDebts = await getDebts(false);
    const existingDebtIds = new Set(existingDebts.map(d => d.id));
    
    const newDebts = debts.filter(d => !existingDebtIds.has(d.id));
    const mergedDebts = [...newDebts, ...existingDebts];
    await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(mergedDebts));
    
    console.log(`✅ Imported ${newOrders.length} orders, ${newDebts.length} debts`);
    return { importedOrders: newOrders.length, importedDebts: newDebts.length };
  } catch (error) {
    console.error('❌ Import JSON error:', error);
    throw new Error('Не удалось импортировать данные: ' + error.message);
  }
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ====================

/**
 * Сохранение снапшота для Undo
 */
const saveSnapshot = async (snapshot) => {
  try {
    const snapshots = await AsyncStorage.getItem(DELETED_SNAPSHOTS_KEY);
    const snapshotsList = snapshots ? JSON.parse(snapshots) : [];
    
    // Удаляем старые снапшоты (старше 5 минут)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const filtered = snapshotsList.filter(s => s.timestamp > fiveMinutesAgo);
    
    filtered.push(snapshot);
    await AsyncStorage.setItem(DELETED_SNAPSHOTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('❌ Save snapshot error:', error);
  }
};

/**
 * Очистка всех данных (для тестирования)
 */
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([ORDERS_KEY, DEBTS_KEY, DELETED_SNAPSHOTS_KEY, MIGRATION_KEY]);
    await initStorage();
    console.log('✅ All data cleared');
  } catch (error) {
    console.error('❌ Clear data error:', error);
    throw error;
  }
};
