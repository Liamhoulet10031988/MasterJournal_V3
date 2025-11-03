import React, { createContext, useContext, useState, useEffect } from 'react';
import * as storage from '../lib/storage';

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
  const [stats, setStats] = useState({ total: 0, totalWork: 0, totalOurParts: 0, byType: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'

  // ==================== ИНИЦИАЛИЗАЦИЯ ====================
  
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      await storage.initStorage();
      await refreshAll();
    } catch (error) {
      console.error('Store init error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== ОБНОВЛЕНИЕ ДАННЫХ ====================

  const refreshAll = async () => {
    await Promise.all([
      refreshOrders(),
      refreshDebts(),
      refreshStats(),
    ]);
  };

  const refreshOrders = async () => {
    try {
      const data = await storage.getAllOrders(); // Загружаем ВСЕ заказы
      setOrders(data);
      return data;
    } catch (error) {
      console.error('Refresh orders error:', error);
      return [];
    }
  };

  const refreshDebts = async () => {
    try {
      const data = await storage.getDebts(true);
      setDebts(data);
      return data;
    } catch (error) {
      console.error('Refresh debts error:', error);
      return [];
    }
  };

  const refreshStats = async (startDate, endDate) => {
    try {
      // Если даты не указаны, берем текущий месяц
      if (!startDate || !endDate) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = now;
        
        startDate = start.toISOString().split('T')[0];
        endDate = end.toISOString().split('T')[0];
      }
      
      const data = await storage.getStats(startDate, endDate);
      setStats(data);
      return data;
    } catch (error) {
      console.error('Refresh stats error:', error);
      return { total: 0, totalWork: 0, totalOurParts: 0, byType: [], count: 0 };
    }
  };

  // ==================== ЗАКАЗЫ ====================

  const addOrder = async (orderData) => {
    try {
      const newOrder = await storage.saveOrder(orderData);
      
      // Обновляем все связанные данные
      await refreshAll();
      
      return newOrder;
    } catch (error) {
      console.error('Add order error:', error);
      throw error;
    }
  };

  const updateOrder = async (orderId, orderPatch) => {
    try {
      const updatedOrder = await storage.updateOrder(orderId, orderPatch);
      
      // Обновляем все связанные данные
      await refreshAll();
      
      return updatedOrder;
    } catch (error) {
      console.error('Update order error:', error);
      throw error;
    }
  };

  const removeOrder = async (orderId, deleteLinkedDebt = true) => {
    try {
      const result = await storage.deleteOrder(orderId, deleteLinkedDebt);
      
      // Обновляем все связанные данные
      await refreshAll();
      
      return result;
    } catch (error) {
      console.error('Remove order error:', error);
      throw error;
    }
  };

  const undoRemove = async (snapshotId) => {
    try {
      const result = await storage.undoDeleteOrder(snapshotId);
      
      // Обновляем все связанные данные
      await refreshAll();
      
      return result;
    } catch (error) {
      console.error('Undo remove error:', error);
      throw error;
    }
  };

  const getOrderById = async (orderId) => {
    try {
      return await storage.getOrderById(orderId);
    } catch (error) {
      console.error('Get order by ID error:', error);
      return null;
    }
  };

  const searchByDateRange = async (startDate, endDate) => {
    try {
      return await storage.searchByDateRange(startDate, endDate);
    } catch (error) {
      console.error('Search by date range error:', error);
      return [];
    }
  };

  // ==================== ДОЛГИ ====================

  const closeDebtAction = async (debtId) => {
    try {
      await storage.closeDebt(debtId);
      
      // Обновляем долги и статистику
      await refreshDebts();
      await refreshStats();
      
      return true;
    } catch (error) {
      console.error('Close debt error:', error);
      throw error;
    }
  };

  // ==================== ПОДСКАЗКИ ====================

  const searchClients = async (query) => {
    if (!query || query.length < 2) return [];
    return await storage.searchClients(query);
  };

  const searchCars = async (query) => {
    if (!query || query.length < 2) return [];
    return await storage.searchCars(query);
  };

  // ==================== ЭКСПОРТ/ИМПОРТ ====================

  const exportData = async (format = 'json') => {
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
  };

  const importData = async (jsonString) => {
    try {
      const result = await storage.importJSON(jsonString);
      await refreshAll();
      return result;
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  };

  // ==================== ТЕМА ====================

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // ==================== КОНТЕКСТ ====================

  const value = {
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
  };

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
};
