import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, Snackbar, Portal, Modal, Button, Divider, TextInput } from 'react-native-paper';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/AppStore';
import { OrderCard } from '../components/OrderCard';
import { OrderForm } from '../components/OrderForm';
import { formatAmount, getPayTypeText } from '../utils/formatters';
import { darkTheme, lightTheme, spacing, borderRadius, fontSize } from '../utils/theme';

// Конфигурация локали для календаря
LocaleConfig.locales['ru'] = {
  monthNames: [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ],
  monthNamesShort: [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
  ],
  dayNames: [
    'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
    'Четверг', 'Пятница', 'Суббота'
  ],
  dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  today: 'Сегодня'
};
LocaleConfig.defaultLocale = 'ru';

export default function HistoryScreen() {
  const {
    orders,
    refreshOrders,
    removeOrder,
    updateOrder,
    undoRemove,
    searchByDateRange,
    theme: themeMode,
  } = useAppStore();
  
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState(orders);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [dateFilterModalVisible, setDateFilterModalVisible] = useState(false);
  
  // Фильтрация по датам
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDateFiltered, setIsDateFiltered] = useState(false);
  
  // Календарь
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  
  // Undo состояние
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [currentSnapshotId, setCurrentSnapshotId] = useState(null);

  useEffect(() => {
    handleSearch(searchQuery);
    updateMarkedDates();
  }, [orders, searchQuery, isDateFiltered, startDate, endDate, selectedDate, viewMode]);

  const updateMarkedDates = () => {
    const marked = {};
    
    orders.forEach(order => {
      if (!marked[order.date]) {
        marked[order.date] = {
          marked: true,
          dotColor: theme.primary,
        };
      }
    });
    
    // Добавляем выбранную дату
    if (selectedDate && marked[selectedDate]) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: theme.primary,
      };
    } else if (selectedDate) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: theme.primary,
      };
    }
    
    setMarkedDates(marked);
  };

  useEffect(() => {
    updateMarkedDates();
  }, [selectedDate, orders]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    let filtered = orders;
    
    // Фильтрация по датам
    if (isDateFiltered && startDate && endDate) {
      filtered = filtered.filter(order => 
        order.date >= startDate && order.date <= endDate
      );
    }
    
    // Фильтрация по тексту
    if (query.trim()) {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter(
        (order) => {
          // Защита от null/undefined
          const client = (order.client || '').toLowerCase();
          const car = (order.car || '').toLowerCase();
          const job = (order.job || '').toLowerCase();
          
          return client.includes(lowercaseQuery) ||
                 car.includes(lowercaseQuery) ||
                 job.includes(lowercaseQuery);
        }
      );
    }
    
    // Фильтрация по выбранной дате в календаре
    if (viewMode === 'calendar' && selectedDate) {
      filtered = filtered.filter(order => order.date === selectedDate);
    }
    
    setFilteredOrders(filtered);
  };

  const applyDateFilter = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Ошибка', 'Укажите начальную и конечную дату');
      return;
    }
    
    if (startDate > endDate) {
      Alert.alert('Ошибка', 'Начальная дата не может быть позже конечной');
      return;
    }
    
    setIsDateFiltered(true);
    setDateFilterModalVisible(false);
    handleSearch(searchQuery);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsDateFiltered(false);
    setDateFilterModalVisible(false);
    handleSearch(searchQuery);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshOrders();
    setRefreshing(false);
  }, []);

  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEditOrder = () => {
    if (!selectedOrder) {
      return;
    }

    setEditingOrder({ ...selectedOrder });
    setEditModalVisible(true);
    setModalVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingOrder(null);
  };

  const handleUpdateOrder = async (orderData) => {
    try {
      if (!editingOrder) {
        return;
      }

      const updatedOrder = await updateOrder(editingOrder.id, orderData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Успех', 'Заказ обновлён!');
      closeEditModal();
      setSelectedOrder(updatedOrder);
    } catch (error) {
      Alert.alert('❌ Ошибка', error.message || 'Не удалось обновить заказ');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  const handleDeleteOrder = (order) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Alert.alert(
      '🗑️ Удалить заказ?',
      `Дата: ${order.date}\nКлиент: ${order.client}\nСумма: ${formatAmount(order.totalAmount || order.amount)}\n\nЭто действие можно будет отменить в течение 5 минут.`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: '🗑️ Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const deleteLinkedDebt = order.payType === 'debt';
              const result = await removeOrder(order.id, deleteLinkedDebt);
              
              setModalVisible(false);
              setCurrentSnapshotId(result.snapshotId);
              setSnackbarVisible(true);
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('❌ Ошибка', error.message || 'Не удалось удалить заказ');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const handleUndo = async () => {
    try {
      await undoRemove(currentSnapshotId);
      setSnackbarVisible(false);
      setCurrentSnapshotId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('❌ Ошибка', 'Не удалось восстановить заказ');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setSelectedOrder(null); // сброс выбранного заказа
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'list' ? 'calendar' : 'list');
    setSelectedDate('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={theme.textTertiary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        {searchQuery || isDateFiltered || selectedDate ? 'Ничего не найдено' : 'Заказов пока нет'}
      </Text>
      {!searchQuery && !isDateFiltered && !selectedDate && (
        <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
          Создай первый заказ на вкладке "Заказ"
        </Text>
      )}
    </View>
  );

  const renderItem = ({ item }) => (
    <OrderCard
      order={item}
      theme={theme}
      onPress={() => showOrderDetails(item)}
    />
  );

  const calendarTheme = {
    calendarBackground: theme.surface,
    textSectionTitleColor: theme.textSecondary,
    selectedDayBackgroundColor: theme.primary,
    selectedDayTextColor: theme.background,
    todayTextColor: theme.primary,
    dayTextColor: theme.text,
    textDisabledColor: theme.textTertiary,
    monthTextColor: theme.text,
    arrowColor: theme.primary,
    textMonthFontWeight: '700',
    textDayFontSize: 14,
    textMonthFontSize: 16,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.content}>
        {/* Заголовок */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="list" size={28} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>История</Text>
          </View>
          
          <View style={styles.headerRight}>
            {/* Кнопка фильтра по датам */}
            <TouchableOpacity
              onPress={() => setDateFilterModalVisible(true)}
              style={[styles.iconButton, isDateFiltered && { backgroundColor: theme.primary + '20' }]}
            >
              <Ionicons 
                name="calendar-outline" 
                size={24} 
                color={isDateFiltered ? theme.primary : theme.textSecondary} 
              />
            </TouchableOpacity>
            
            {/* Переключатель вида */}
            <TouchableOpacity
              onPress={toggleViewMode}
              style={styles.iconButton}
            >
              <Ionicons 
                name={viewMode === 'list' ? 'calendar' : 'list'} 
                size={24} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Поиск */}
        <Searchbar
          placeholder="Поиск по клиенту, авто, работе..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.surface }]}
          inputStyle={[styles.searchInput, { color: theme.text }]}
          iconColor={theme.primary}
          placeholderTextColor={theme.textTertiary}
          theme={{ colors: { primary: theme.primary } }}
        />

        {/* Индикатор фильтра по датам */}
        {isDateFiltered && (
          <View style={[styles.filterBadge, { backgroundColor: theme.surfaceHighlight }]}>
            <Ionicons name="funnel" size={14} color={theme.primary} />
            <Text style={[styles.filterBadgeText, { color: theme.text }]}>
              {startDate} — {endDate}
            </Text>
            <TouchableOpacity onPress={clearDateFilter}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Календарь */}
        {viewMode === 'calendar' && (
          <View style={styles.calendarContainer}>
            <Calendar
              markedDates={markedDates}
              onDayPress={onDayPress}
              theme={calendarTheme}
              style={[styles.calendar, { backgroundColor: theme.surface }]}
              enableSwipeMonths={true}
              hideExtraDays={false}
            />
            {selectedDate && (
              <View style={styles.selectedDateInfo}>
                <Text style={[styles.selectedDateText, { color: theme.text }]}>
                  Заказы за {selectedDate}:
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Список заказов */}
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredOrders}
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

        {/* Модальное окно деталей */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            {selectedOrder && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.primary }]}>
                    Детали заказа
                  </Text>
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      onPress={handleEditOrder}
                      style={styles.modalActionButton}
                    >
                      <Ionicons name="create-outline" size={24} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteOrder(selectedOrder)}>
                      <Ionicons name="trash-outline" size={24} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Divider style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Дата:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedOrder.date}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Клиент:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedOrder.client}
                  </Text>
                </View>

                {selectedOrder.car && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Авто:</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {selectedOrder.car}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Работа:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedOrder.job}
                  </Text>
                </View>

                <Divider style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Сумма работы:</Text>
                  <Text style={[styles.detailValue, { color: theme.primary }]}>
                    {formatAmount(selectedOrder.workAmount || 0)}
                  </Text>
                </View>

                {selectedOrder.ourParts && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Детали наши:</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {selectedOrder.ourParts}
                    </Text>
                  </View>
                )}

                {(selectedOrder.ourPartsAmount > 0) && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Сумма деталей наших:</Text>
                    <Text style={[styles.detailValue, { color: theme.primary }]}>
                      {formatAmount(selectedOrder.ourPartsAmount || 0)}
                    </Text>
                  </View>
                )}

                {selectedOrder.clientParts && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Детали клиента:</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {selectedOrder.clientParts}
                    </Text>
                  </View>
                )}

                <Divider style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, styles.totalLabel, { color: theme.textSecondary }]}>
                    Итого:
                  </Text>
                  <Text style={[styles.detailValue, styles.amountText, { color: theme.primary }]}>
                    {formatAmount(selectedOrder.totalAmount || selectedOrder.amount || 0)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Оплата:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {getPayTypeText(selectedOrder.payType)}
                  </Text>
                </View>

                {selectedOrder.freonGrams && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Фреон:</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {selectedOrder.freonGrams} г
                    </Text>
                  </View>
                )}

                {selectedOrder.comment && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                      Комментарий:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {selectedOrder.comment}
                    </Text>
                  </View>
                )}

                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                  textColor={theme.textSecondary}
                >
                  Закрыть
                </Button>
              </ScrollView>
            )}
          </Modal>

          {/* Модальное окно редактирования */}
          <Modal
            visible={editModalVisible}
            onDismiss={closeEditModal}
            contentContainerStyle={[styles.modalContent, styles.editModal, { backgroundColor: theme.surface }]}
          >
            {editingOrder && (
              <View style={styles.editFormWrapper}>
                <OrderForm
                  initialOrder={editingOrder}
                  onSubmit={handleUpdateOrder}
                  onCancel={closeEditModal}
                  submitLabel="Сохранить изменения"
                  headerContent={(
                    <>
                      <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.primary }]}>
                          Редактирование заказа
                        </Text>
                      </View>
                      <Divider style={[styles.divider, { backgroundColor: theme.border }]} />
                    </>
                  )}
                />
              </View>
            )}
          </Modal>

          {/* Модальное окно фильтра по датам */}
          <Modal
            visible={dateFilterModalVisible}
            onDismiss={() => setDateFilterModalVisible(false)}
            contentContainerStyle={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>
                Фильтр по датам
              </Text>
              <Divider style={[styles.divider, { backgroundColor: theme.border }]} />

              <TextInput
                label="Начальная дата"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="ГГГГ-ММ-ДД"
                style={[styles.dateInput, { backgroundColor: theme.surface }]}
                mode="outlined"
                outlineColor={theme.border}
                activeOutlineColor={theme.primary}
                textColor={theme.text}
                theme={{ colors: { placeholder: theme.textTertiary } }}
              />

              <TextInput
                label="Конечная дата"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="ГГГГ-ММ-ДД"
                style={[styles.dateInput, { backgroundColor: theme.surface }]}
                mode="outlined"
                outlineColor={theme.border}
                activeOutlineColor={theme.primary}
                textColor={theme.text}
                theme={{ colors: { placeholder: theme.textTertiary } }}
              />

              <View style={styles.dateFilterButtons}>
                <Button
                  mode="contained"
                  onPress={applyDateFilter}
                  style={[styles.dateFilterButton, { backgroundColor: theme.primary }]}
                  textColor={theme.background}
                >
                  Применить
                </Button>
                <Button
                  mode="outlined"
                  onPress={clearDateFilter}
                  style={styles.dateFilterButton}
                  textColor={theme.textSecondary}
                >
                  Сбросить
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>

        {/* Snackbar для Undo */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => {
            setSnackbarVisible(false);
            setCurrentSnapshotId(null);
          }}
          duration={5000}
          action={{
            label: 'Отменить',
            onPress: handleUndo,
          }}
          style={{ backgroundColor: theme.surface }}
          theme={{ colors: { surface: theme.surface, accent: theme.primary } }}
        >
          <Text style={{ color: theme.text }}>Заказ удалён</Text>
        </Snackbar>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  searchBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    elevation: 0,
    borderRadius: borderRadius.lg,
  },
  searchInput: {
    fontSize: fontSize.md,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  filterBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  calendarContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  calendar: {
    borderRadius: borderRadius.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  selectedDateInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  selectedDateText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
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
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  modalContent: {
    margin: spacing.xl,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    maxHeight: '80%',
  },
  editModal: {
    maxHeight: '90%',
    padding: spacing.md,
  },
  editFormWrapper: {
    flex: 1,
    minHeight: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActionButton: {
    padding: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  divider: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: fontSize.lg,
  },
  detailValue: {
    fontSize: fontSize.md,
    flex: 1,
    textAlign: 'right',
  },
  amountText: {
    fontWeight: '700',
    fontSize: fontSize.xl,
  },
  closeButton: {
    marginTop: spacing.lg,
  },
  dateInput: {
    marginBottom: spacing.md,
  },
  dateFilterButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  dateFilterButton: {
    flex: 1,
  },
});
