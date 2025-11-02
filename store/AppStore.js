import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storage from '../lib/storage';
import { formatDateToStore } from '../utils/formatters';

const AppStoreContext = createContext();

export const useAppStore = () => {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }
  return context;
};

export const AppStoreProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [debts, setDebts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    totalWork: 0,
    totalOurParts: 0,
    byType: [],
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const statsRangeRef = useRef({ startDate: null, endDate: null });

  // ИСПРАВЛЕНИЕ БАГ 10: Загружаем все заказы, а не только 100
  const refreshOrders = useCallback(async () => {
    try {
      const data = await storage.getAllOrders();
      setOrders(data);
      return data;
    } catch (error) {
      console.error('Refresh orders error:', error);
      return [];
    }
  }, []);

  const refreshDebts = useCallback(async () => {
    try {
      const data = await storage.getDebts(true);
      setDebts(data);
      return data;
    } catch (error) {
      console.error('Refresh debts error:', error);
      return [];
    }
  }, []);

  const refreshStats = useCallback(async (startDate, endDate) => {
    try {
      const now = new Date();
      const defaultEnd = formatDateToStore(now);
      const defaultStart = formatDateToStore(new Date(now.getFullYear(), now.getMonth(), 1));

      let nextStart = startDate;
      let nextEnd = endDate;

      if (!nextStart || !nextEnd) {
        if (statsRangeRef.current.startDate && statsRangeRef.current.endDate) {
          nextStart = statsRangeRef.current.startDate || defaultStart;
          nextEnd = statsRangeRef.current.endDate || defaultEnd;
        } else {
          nextStart = defaultStart;
          nextEnd = defaultEnd;
        }
      } else {
        nextStart = formatDateToStore(nextStart) || defaultStart;
        nextEnd = formatDateToStore(nextEnd) || defaultEnd;
      }

      const normalizedRange = { startDate: nextStart, endDate: nextEnd };
      statsRangeRef.current = normalizedRange;

      const data = await storage.getStats(normalizedRange.startDate, normalizedRange.endDate);
      setStats(data);
      return data;
    } catch (error) {
      console.error('Refresh stats error:', error);
      const fallback = { total: 0, totalWork: 0, totalOurParts: 0, byType: [], count: 0 };
      setStats(fallback);
      return fallback;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const { startDate, endDate } = statsRangeRef.current;
    await Promise.all([
      refreshOrders(),
      refreshDebts(),
      refreshStats(startDate, endDate),
    ]);
  }, [refreshOrders, refreshDebts, refreshStats]);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      await storage.initStorage();

      const savedTheme = await AsyncStorage.getItem('@theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }

      await refreshAll();
    } catch (error) {
      console.error('Store init error:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshAll]);

  useEffect(() => {
    init();
  }, [init]);

  // ==================== ЗАКАЗЫ ====================

  const addOrder = useCallback(async (orderData) => {
    try {
      const newOrder = await storage.saveOrder(orderData);

      // Обновляем все связанные данные
      await refreshAll();

      return newOrder;
    } catch (error) {
      console.error('Add order error:', error);
      throw error;
    }
  }, [refreshAll]);

  const updateOrder = useCallback(async (orderId, orderPatch) => {
    try {
      const updatedOrder = await storage.updateOrder(orderId, orderPatch);

      // Обновляем все связанные данные
      await refreshAll();

      return updatedOrder;
    } catch (error) {
      console.error('Update order error:', error);
      throw error;
    }
  }, [refreshAll]);

  const removeOrder = useCallback(async (orderId, deleteLinkedDebt = true) => {
    try {
      const result = await storage.deleteOrder(orderId, deleteLinkedDebt);

      // Обновляем все связанные данные
      await refreshAll();

      return result;
    } catch (error) {
      console.error('Remove order error:', error);
      throw error;
    }
  }, [refreshAll]);

  const undoRemove = useCallback(async (snapshotId) => {
    try {
      const result = await storage.undoDeleteOrder(snapshotId);

      // Обновляем все связанные данные
      await refreshAll();

      return result;
    } catch (error) {
      console.error('Undo remove error:', error);
      throw error;
    }
  }, [refreshAll]);

  const getOrderById = useCallback(async (orderId) => {
    try {
      return await storage.getOrderById(orderId);
    } catch (error) {
      console.error('Get order by ID error:', error);
      return null;
    }
  }, []);

  const searchByDateRange = useCallback(async (startDate, endDate) => {
    try {
      return await storage.searchByDateRange(startDate, endDate);
    } catch (error) {
      console.error('Search by date range error:', error);
      return [];
    }
  }, []);

  // ==================== ДОЛГИ ====================

  const closeDebtAction = useCallback(async (debtId) => {
    try {
      await storage.closeDebt(debtId);

      await refreshDebts();
      const { startDate, endDate } = statsRangeRef.current;
      await refreshStats(startDate, endDate);

      return true;
    } catch (error) {
      console.error('Close debt error:', error);
      throw error;
    }
  }, [refreshDebts, refreshStats]);

  // ==================== ПОДСКАЗКИ ====================

  // ИСПРАВЛЕНИЕ БАГ 11: Используем orders из стейта, не читаем AsyncStorage каждый раз
  const searchClients = useCallback(
    (query) => {
      if (!query || query.length < 2) return [];

      const lowercaseQuery = query.toLowerCase();
      const clients = new Set();

      orders.forEach((order) => {
        const client = (order.client || '').toLowerCase();
        if (client.includes(lowercaseQuery)) {
          clients.add(order.client);
        }
      });

      return Array.from(clients).slice(0, 5);
    },
    [orders],
  );

  const searchCars = useCallback(
    (query) => {
      if (!query || query.length < 2) return [];

      const lowercaseQuery = query.toLowerCase();
      const cars = new Set();

      orders.forEach((order) => {
        const car = (order.car || '').toLowerCase();
        if (car.includes(lowercaseQuery)) {
          cars.add(order.car);
        }
      });

      return Array.from(cars).slice(0, 5);
    },
    [orders],
  );

  // ==================== ЭКСПОРТ/ИМПОРТ ====================

  const exportData = useCallback(async (format = 'json') => {
    try {
      if (format === 'json') {
        return await storage.exportJSON();
      } else if (format === 'json-russian') {
        return await storage.exportJSONRussian();
      } else if (format === 'csv') {
        return await storage.exportCSV();
      } else if (format === 'xlsx') {
        return await storage.exportXLSX();
      } else if (format === 'pdf') {
        return await storage.exportPDF();
      }
      throw new Error('Неизвестный формат');
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }, []);

  const importData = useCallback(async (jsonString) => {
    try {
      const result = await storage.importJSON(jsonString);
      await refreshAll();
      return result;
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  }, [refreshAll]);

  // ==================== ТЕМА ====================

  const toggleTheme = useCallback(async () => {
    let nextTheme = 'dark';

    setTheme((prevTheme) => {
      nextTheme = prevTheme === 'dark' ? 'light' : 'dark';
      return nextTheme;
    });

    try {
      await AsyncStorage.setItem('@theme', nextTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, []);

  // ==================== КОНТЕКСТ ====================

  // ИСПРАВЛЕНИЕ БАГ 13: Мемоизация value для предотвращения лишних рендеров
  const value = useMemo(
    () => ({
      // Состояние
      orders,
      debts,
      stats,
      loading,
      theme,

      // Действия
      refreshAll,
      refreshOrders,
      refreshDebts,
      refreshStats,

      addOrder,
      updateOrder,
      removeOrder,
      undoRemove,
      getOrderById,
      searchByDateRange,

      closeDebt: closeDebtAction,

      searchClients,
      searchCars,

      exportData,
      importData,

      toggleTheme,
    }),
    [
      orders,
      debts,
      stats,
      loading,
      theme,
      refreshAll,
      refreshOrders,
      refreshDebts,
      refreshStats,
      addOrder,
      updateOrder,
      removeOrder,
      undoRemove,
      getOrderById,
      searchByDateRange,
      closeDebtAction,
      searchClients,
      searchCars,
      exportData,
      importData,
      toggleTheme,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
};
