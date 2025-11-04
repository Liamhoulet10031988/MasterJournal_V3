import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Alert,
  Share,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, Switch, Button, Divider, Dialog, Portal, TextInput } from 'react-native-paper';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../store/AppStore';
import { darkTheme, lightTheme, spacing, borderRadius, fontSize } from '../utils/theme';

LocaleConfig.locales['ru'] = {
  monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  monthNamesShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  dayNames: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  today: 'Сегодня'
};
LocaleConfig.defaultLocale = 'ru';

export default function SettingsScreen() {
  const { theme: themeMode, toggleTheme, exportData, importData, refreshAll } = useAppStore();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const [importDialogVisible, setImportDialogVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // PDF фильтр
  const [pdfFilterVisible, setPdfFilterVisible] = useState(false);
  const [pdfFilterMode, setPdfFilterMode] = useState('range'); // 'range' | 'specific'
  const [pdfStartDate, setPdfStartDate] = useState('');
  const [pdfEndDate, setPdfEndDate] = useState('');
  const [pdfSelectedDates, setPdfSelectedDates] = useState({});
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Экспорт JSON
  const handleExportJSON = async () => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const jsonData = await exportData('json');
      const fileName = `master-journal-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        // Веб-версия
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Мобильная версия
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonData);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Экспорт данных Master Journal',
          });
        } else {
          // Fallback на обычный Share
          await Share.share({
            message: jsonData,
            title: 'Экспорт Master Journal',
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Успех', 'Данные экспортированы в JSON!');
    } catch (error) {
      console.error('Export error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Ошибка', 'Не удалось экспортировать данные');
    } finally {
      setExporting(false);
    }
  };

  // Экспорт JSON с русскими ключами
  const handleExportJSONRussian = async () => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const jsonData = await exportData('json-russian');
      const fileName = `master-journal-ru-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonData);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Экспорт данных Master Journal (Русский)',
          });
        } else {
          await Share.share({
            message: jsonData,
            title: 'Экспорт Master Journal (Русский)',
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Успех', 'Данные экспортированы в JSON (русский формат)!');
    } catch (error) {
      console.error('Export russian JSON error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Ошибка', 'Не удалось экспортировать данные');
    } finally {
      setExporting(false);
    }
  };

  // Экспорт PDF
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const pdfUri = await exportData('pdf');

      // Шарим файл через expo-sharing
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Экспорт отчёта (PDF)',
        UTI: 'com.adobe.pdf'
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Успех', 'PDF отчёт создан!');
    } catch (error) {
      console.error('Export PDF error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Ошибка', 'Не удалось создать PDF: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  // Экспорт PDF с фильтрами
  const handleExportPDFFiltered = async () => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let filterOptions = {};
      
      if (pdfFilterMode === 'range') {
        if (!pdfStartDate || !pdfEndDate) {
          Alert.alert('Ошибка', 'Укажите начальную и конечную дату');
          setExporting(false);
          return;
        }
        filterOptions = { startDate: pdfStartDate, endDate: pdfEndDate };
      } else {
        const selectedDatesArray = Object.keys(pdfSelectedDates).filter(date => pdfSelectedDates[date].selected);
        if (selectedDatesArray.length === 0) {
          Alert.alert('Ошибка', 'Выберите хотя бы одну дату');
          setExporting(false);
          return;
        }
        filterOptions = { dates: selectedDatesArray };
      }

      const pdfUri = await exportData('pdf-filtered', filterOptions);
      
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Экспорт отчёта (PDF)',
        UTI: 'com.adobe.pdf'
      });

      setPdfFilterVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Успех', 'PDF отчёт создан!');
    } catch (error) {
      console.error('Export PDF filtered error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Ошибка', error.message || 'Не удалось создать PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleDayPress = (day) => {
    const dateString = day.dateString;
    setPdfSelectedDates(prev => ({
      ...prev,
      [dateString]: {
        selected: !prev[dateString]?.selected,
        selectedColor: theme.primary,
      }
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStartDateSelect = (day) => {
    setPdfStartDate(day.dateString);
    setShowStartCalendar(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEndDateSelect = (day) => {
    setPdfEndDate(day.dateString);
    setShowEndCalendar(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Экспорт XLSX
  // Экспорт CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const csvData = await exportData('csv');
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `orders-${timestamp}.csv`;

      if (Platform.OS === 'web') {
        // Экспорт заказов
        const ordersBlob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
        const ordersUrl = URL.createObjectURL(ordersBlob);
        const ordersLink = document.createElement('a');
        ordersLink.href = ordersUrl;
        ordersLink.download = fileName;
        ordersLink.click();
        URL.revokeObjectURL(ordersUrl);
      } else {
        // Мобильная версия
        const ordersUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(ordersUri, csvData, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(ordersUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Экспорт заказов',
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Успех', 'Данные экспортированы в CSV!');
    } catch (error) {
      console.error('Export CSV error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Ошибка', 'Не удалось экспортировать CSV');
    } finally {
      setExporting(false);
    }
  };

  // Импорт JSON
  const handleImportJSON = async () => {
    try {
      setImporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (Platform.OS === 'web') {
        // Веб - показываем диалог для вставки JSON
        setImportDialogVisible(true);
      } else {
        // Мобильная - выбор файла
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          setImporting(false);
          return;
        }

        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
        await performImport(fileContent);
      }
    } catch (error) {
      console.error('Import error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Ошибка', 'Не удалось импортировать данные');
      setImporting(false);
    }
  };

  // Выполнение импорта
  const performImport = async (jsonString) => {
    try {
      const result = await importData(jsonString);
      await refreshAll();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Успех',
        `Импортировано:\n• Заказов: ${result.importedOrders}\n• Долгов: ${result.importedDebts}`
      );
      
      setImportDialogVisible(false);
      setImportText('');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Ошибка', error.message || 'Неверный формат данных');
    } finally {
      setImporting(false);
    }
  };

  // Очистка всех данных
  const handleClearData = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Alert.alert(
      '⚠️ Внимание!',
      'Вы уверены что хотите удалить ВСЕ данные?\n\nЭто действие нельзя отменить!\n\nРекомендуем сначала сделать экспорт.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: '🗑️ Удалить всё',
          style: 'destructive',
          onPress: async () => {
            try {
              const { clearAllData } = await import('../lib/storage');
              await clearAllData();
              await refreshAll();
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('✅ Успех', 'Все данные удалены!');
            } catch (error) {
              Alert.alert('❌ Ошибка', 'Не удалось очистить данные');
            }
          },
        },
      ]
    );
  };

  // Переключение темы
  const handleToggleTheme = () => {
    toggleTheme();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Заголовок */}
        <View style={styles.header}>
          <Ionicons name="settings" size={28} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Настройки</Text>
        </View>

        {/* Тема */}
        <List.Section>
          <List.Subheader style={{ color: theme.textSecondary, fontSize: fontSize.md }}>
            Оформление
          </List.Subheader>
          <List.Item
            title="Тема оформления"
            description={themeMode === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
            titleStyle={{ color: theme.text, fontSize: fontSize.md }}
            descriptionStyle={{ color: theme.textSecondary, fontSize: fontSize.sm }}
            left={(props) => (
              <List.Icon
                {...props}
                icon={themeMode === 'dark' ? 'weather-night' : 'white-balance-sunny'}
                color={theme.primary}
              />
            )}
            right={() => (
              <Switch
                value={themeMode === 'light'}
                onValueChange={handleToggleTheme}
                color={theme.primary}
              />
            )}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />
        </List.Section>

        <Divider style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Экспорт */}
        <List.Section>
          <List.Subheader style={{ color: theme.textSecondary, fontSize: fontSize.md }}>
            Экспорт данных
          </List.Subheader>
          
          <List.Item
            title="📄 Экспорт в PDF (полный)"
            description="Все заказы в одном документе"
            titleStyle={{ color: theme.text, fontSize: fontSize.md }}
            descriptionStyle={{ color: theme.textSecondary, fontSize: fontSize.sm }}
            left={(props) => <List.Icon {...props} icon="file-pdf-box" color="#D32F2F" />}
            right={(props) => <List.Icon {...props} icon="download" color={theme.textTertiary} />}
            onPress={handleExportPDF}
            disabled={exporting}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />
          
          <List.Item
            title="📄 Экспорт в PDF (фильтр)"
            description="По выбранным датам или диапазону"
            titleStyle={{ color: theme.text, fontSize: fontSize.md }}
            descriptionStyle={{ color: theme.textSecondary, fontSize: fontSize.sm }}
            left={(props) => <List.Icon {...props} icon="calendar-range" color="#D32F2F" />}
            right={(props) => <List.Icon {...props} icon="tune" color={theme.textTertiary} />}
            onPress={() => {
              setPdfFilterVisible(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            disabled={exporting}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />
          
          <List.Item
            title="Экспорт в JSON"
            description="Полная копия всех данных"
            titleStyle={{ color: theme.text, fontSize: fontSize.md }}
            descriptionStyle={{ color: theme.textSecondary, fontSize: fontSize.sm }}
            left={(props) => <List.Icon {...props} icon="code-json" color={theme.info} />}
            right={(props) => <List.Icon {...props} icon="download" color={theme.textTertiary} />}
            onPress={handleExportJSON}
            disabled={exporting}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />

          <List.Item
            title="Экспорт в JSON (Русский)"
            description="JSON с русскими ключами"
            titleStyle={{ color: theme.text, fontSize: fontSize.md }}
            descriptionStyle={{ color: theme.textSecondary, fontSize: fontSize.sm }}
            left={(props) => <List.Icon {...props} icon="code-json" color={theme.primary} />}
            right={(props) => <List.Icon {...props} icon="download" color={theme.textTertiary} />}
            onPress={handleExportJSONRussian}
            disabled={exporting}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />

          <List.Item
            title="Экспорт в CSV"
            description="Таблицы для Excel/Google Sheets"
            titleStyle={{ color: theme.text, fontSize: fontSize.md }}
            descriptionStyle={{ color: theme.textSecondary, fontSize: fontSize.sm }}
            left={(props) => <List.Icon {...props} icon="table" color={theme.success} />}
            right={(props) => <List.Icon {...props} icon="download" color={theme.textTertiary} />}
            onPress={handleExportCSV}
            disabled={exporting}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />
        </List.Section>

        <Divider style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Импорт */}
        <List.Section>
          <List.Subheader style={{ color: theme.textSecondary, fontSize: fontSize.md }}>
            Импорт данных
          </List.Subheader>
          
          <List.Item
            title="Импорт из JSON"
            description="Восстановление или слияние данных"
            titleStyle={{ color: theme.text, fontSize: fontSize.lg }}
            descriptionStyle={{ color: theme.textSecondary }}
            left={(props) => <List.Icon {...props} icon="upload" color={theme.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.textTertiary} />}
            onPress={handleImportJSON}
            disabled={importing}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />
        </List.Section>

        <Divider style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Опасная зона */}
        <List.Section>
          <List.Subheader style={{ color: theme.error, fontSize: fontSize.md }}>
            Опасная зона
          </List.Subheader>
          
          <List.Item
            title="Очистить все данные"
            description="Удалить все заказы и долги"
            titleStyle={{ color: theme.error, fontSize: fontSize.lg }}
            descriptionStyle={{ color: theme.textSecondary }}
            left={(props) => <List.Icon {...props} icon="delete" color={theme.error} />}
            right={(props) => <List.Icon {...props} icon="alert" color={theme.error} />}
            onPress={handleClearData}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />
        </List.Section>

        <Divider style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* О приложении */}
        <View style={styles.about}>
          <Text style={[styles.aboutTitle, { color: theme.text }]}>
            Master Journal Aleshkin
          </Text>
        </View>
      </ScrollView>

      {/* Диалог импорта (для веб) */}
      <Portal>
        <Dialog
          visible={importDialogVisible}
          onDismiss={() => {
            setImportDialogVisible(false);
            setImportText('');
            setImporting(false);
          }}
          style={{ backgroundColor: theme.surface }}
        >
          <Dialog.Title style={{ color: theme.text }}>Импорт JSON</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.textSecondary, marginBottom: spacing.md }}>
              Вставьте JSON-данные для импорта:
            </Text>
            <TextInput
              value={importText}
              onChangeText={setImportText}
              multiline
              numberOfLines={10}
              style={{ backgroundColor: theme.background }}
              textColor={theme.text}
              placeholder='{"orders": [...], "debts": [...]}'
              placeholderTextColor={theme.textTertiary}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setImportDialogVisible(false);
                setImportText('');
                setImporting(false);
              }}
              textColor={theme.textSecondary}
            >
              Отмена
            </Button>
            <Button
              onPress={() => performImport(importText)}
              loading={importing}
              disabled={importing || !importText.trim()}
              textColor={theme.primary}
            >
              Импортировать
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Модалка PDF фильтра */}
        <Dialog
          visible={pdfFilterVisible}
          onDismiss={() => {
            setPdfFilterVisible(false);
            setPdfStartDate('');
            setPdfEndDate('');
            setPdfSelectedDates({});
            setShowStartCalendar(false);
            setShowEndCalendar(false);
          }}
          style={{ backgroundColor: theme.surface, maxHeight: '90%' }}
        >
          <Dialog.Title style={{ color: theme.primary }}>
            Фильтр для PDF экспорта
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: spacing.md }}
            >
              {/* Выбор режима */}
              <View style={styles.pdfFilterModeButtons}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    {
                      backgroundColor: pdfFilterMode === 'range' ? theme.primary : theme.background,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => {
                    setPdfFilterMode('range');
                    setPdfSelectedDates({});
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      { color: pdfFilterMode === 'range' ? theme.background : theme.text },
                    ]}
                  >
                    Диапазон дат
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    {
                      backgroundColor: pdfFilterMode === 'specific' ? theme.primary : theme.background,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => {
                    setPdfFilterMode('specific');
                    setPdfStartDate('');
                    setPdfEndDate('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      { color: pdfFilterMode === 'specific' ? theme.background : theme.text },
                    ]}
                  >
                    Конкретные даты
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Диапазон дат */}
              {pdfFilterMode === 'range' && (
                <View>
                  <View style={styles.datePickerContainer}>
                    <Text style={[styles.dateLabel, { color: theme.text }]}>Начальная дата:</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { 
                        backgroundColor: theme.background, 
                        borderColor: showStartCalendar ? theme.primary : theme.border 
                      }]}
                      onPress={() => {
                        setShowStartCalendar(!showStartCalendar);
                        setShowEndCalendar(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons 
                        name="calendar-outline" 
                        size={20} 
                        color={pdfStartDate ? theme.primary : theme.textSecondary} 
                      />
                      <Text style={[styles.dateButtonText, { 
                        color: pdfStartDate ? theme.text : theme.textTertiary 
                      }]}>
                        {pdfStartDate || 'Выберите дату'}
                      </Text>
                    </TouchableOpacity>
                    
                    {showStartCalendar && (
                      <View style={styles.calendarWrapper}>
                        <Calendar
                          current={pdfStartDate || new Date().toISOString().split('T')[0]}
                          onDayPress={handleStartDateSelect}
                          markedDates={{
                            [pdfStartDate]: { selected: true, selectedColor: theme.primary }
                          }}
                          theme={{
                            calendarBackground: theme.surface,
                            textSectionTitleColor: theme.textSecondary,
                            selectedDayBackgroundColor: theme.primary,
                            selectedDayTextColor: theme.background,
                            todayTextColor: theme.primary,
                            dayTextColor: theme.text,
                            textDisabledColor: theme.textTertiary,
                            monthTextColor: theme.text,
                            arrowColor: theme.primary,
                          }}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.datePickerContainer}>
                    <Text style={[styles.dateLabel, { color: theme.text }]}>Конечная дата:</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { 
                        backgroundColor: theme.background, 
                        borderColor: showEndCalendar ? theme.primary : theme.border 
                      }]}
                      onPress={() => {
                        setShowEndCalendar(!showEndCalendar);
                        setShowStartCalendar(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons 
                        name="calendar-outline" 
                        size={20} 
                        color={pdfEndDate ? theme.primary : theme.textSecondary} 
                      />
                      <Text style={[styles.dateButtonText, { 
                        color: pdfEndDate ? theme.text : theme.textTertiary 
                      }]}>
                        {pdfEndDate || 'Выберите дату'}
                      </Text>
                    </TouchableOpacity>
                    
                    {showEndCalendar && (
                      <View style={styles.calendarWrapper}>
                        <Calendar
                          current={pdfEndDate || pdfStartDate || new Date().toISOString().split('T')[0]}
                          onDayPress={handleEndDateSelect}
                          markedDates={{
                            [pdfEndDate]: { selected: true, selectedColor: theme.primary }
                          }}
                          theme={{
                            calendarBackground: theme.surface,
                            textSectionTitleColor: theme.textSecondary,
                            selectedDayBackgroundColor: theme.primary,
                            selectedDayTextColor: theme.background,
                            todayTextColor: theme.primary,
                            dayTextColor: theme.text,
                            textDisabledColor: theme.textTertiary,
                            monthTextColor: theme.text,
                            arrowColor: theme.primary,
                          }}
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Конкретные даты */}
              {pdfFilterMode === 'specific' && (
                <View>
                  <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    Выберите даты на календаре (можно выбрать несколько):
                  </Text>
                  <View style={styles.calendarWrapper}>
                    <Calendar
                      onDayPress={handleDayPress}
                      markedDates={pdfSelectedDates}
                      markingType={'multi-dot'}
                      theme={{
                        calendarBackground: theme.surface,
                        textSectionTitleColor: theme.textSecondary,
                        selectedDayBackgroundColor: theme.primary,
                        selectedDayTextColor: theme.background,
                        todayTextColor: theme.primary,
                        dayTextColor: theme.text,
                        textDisabledColor: theme.textTertiary,
                        monthTextColor: theme.text,
                        arrowColor: theme.primary,
                      }}
                    />
                  </View>
                  <Text style={[styles.selectedCount, { color: theme.primary }]}>
                    Выбрано дат: {Object.keys(pdfSelectedDates).filter(date => pdfSelectedDates[date].selected).length}
                  </Text>
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setPdfFilterVisible(false);
                setPdfStartDate('');
                setPdfEndDate('');
                setPdfSelectedDates({});
              }}
              textColor={theme.textSecondary}
            >
              Отмена
            </Button>
            <Button
              onPress={handleExportPDFFiltered}
              loading={exporting}
              disabled={exporting}
              textColor={theme.primary}
            >
              Экспортировать
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  listItem: {
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  divider: {
    marginVertical: spacing.lg,
  },
  about: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  aboutTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  aboutText: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  pdfFilterModeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  modeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  datePickerContainer: {
    marginBottom: spacing.xl,
  },
  dateLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing.md,
    minHeight: 56,
  },
  dateButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  calendarWrapper: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  infoText: {
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
    lineHeight: 22,
    textAlign: 'center',
  },
  selectedCount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.lg,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});