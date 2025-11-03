import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, Switch, Button, Divider, Dialog, Portal, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../store/AppStore';
import { darkTheme, lightTheme, spacing, borderRadius, fontSize } from '../utils/theme';

export default function SettingsScreen() {
  const { theme: themeMode, toggleTheme, exportData, importData, refreshAll } = useAppStore();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const [importDialogVisible, setImportDialogVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

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

  // Экспорт XLSX
  const handleExportXLSX = async () => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const xlsxData = await exportData('xlsx');
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `orders-${timestamp}.xlsx`;

      if (Platform.OS === 'web') {
        // Web - создаем Blob и скачиваем
        const blob = new Blob([Uint8Array.from(atob(xlsxData), c => c.charCodeAt(0))], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Mobile - сохраняем и шарим
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, xlsxData, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Экспорт заказов (Excel)',
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Успех', 'Отчёт Excel создан!');
    } catch (error) {
      console.error('Export XLSX error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Ошибка', 'Не удалось создать Excel: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

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
            title="Режим для шефа"
            description={themeMode === 'dark' ? 'Тёмная тема (CYBER-GARAGE)' : 'Светлая тема (CLEAN BUSINESS)'}
            titleStyle={{ color: theme.text, fontSize: fontSize.lg }}
            descriptionStyle={{ color: theme.textSecondary }}
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
            title="📄 Экспорт в PDF"
            description="Красивая таблица с рамками и форматированием"
            titleStyle={{ color: theme.text, fontSize: fontSize.lg, fontWeight: '600' }}
            descriptionStyle={{ color: theme.textSecondary }}
            left={(props) => <List.Icon {...props} icon="file-pdf-box" color="#D32F2F" />}
            right={(props) => <List.Icon {...props} icon="download" color={theme.textTertiary} />}
            onPress={handleExportPDF}
            disabled={exporting}
            style={[styles.listItem, { backgroundColor: theme.surface, borderLeftWidth: 3, borderLeftColor: '#D32F2F' }]}
          />
          
          <List.Item
            title="📊 Экспорт в Excel (XLSX)"
            description="Таблица с форматированием и рамками"
            titleStyle={{ color: theme.text, fontSize: fontSize.lg, fontWeight: '600' }}
            descriptionStyle={{ color: theme.textSecondary }}
            left={(props) => <List.Icon {...props} icon="file-excel" color="#217346" />}
            right={(props) => <List.Icon {...props} icon="download" color={theme.textTertiary} />}
            onPress={handleExportXLSX}
            disabled={exporting}
            style={[styles.listItem, { backgroundColor: theme.surface, borderLeftWidth: 3, borderLeftColor: '#217346' }]}
          />
          
          <List.Item
            title="Экспорт в JSON"
            description="Полная копия всех данных"
            titleStyle={{ color: theme.text, fontSize: fontSize.lg }}
            descriptionStyle={{ color: theme.textSecondary }}
            left={(props) => <List.Icon {...props} icon="code-json" color={theme.info} />}
            right={(props) => <List.Icon {...props} icon="download" color={theme.textTertiary} />}
            onPress={handleExportJSON}
            disabled={exporting}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />

          <List.Item
            title="Экспорт в JSON (Русский)"
            description="JSON с русскими ключами"
            titleStyle={{ color: theme.text, fontSize: fontSize.lg }}
            descriptionStyle={{ color: theme.textSecondary }}
            left={(props) => <List.Icon {...props} icon="code-json" color={theme.primary} />}
            right={(props) => <List.Icon {...props} icon="download" color={theme.textTertiary} />}
            onPress={handleExportJSONRussian}
            disabled={exporting}
            style={[styles.listItem, { backgroundColor: theme.surface }]}
          />

          <List.Item
            title="Экспорт в CSV"
            description="Таблицы для Excel/Google Sheets"
            titleStyle={{ color: theme.text, fontSize: fontSize.lg }}
            descriptionStyle={{ color: theme.textSecondary }}
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
            Master Journal v2.0
          </Text>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            CYBER-GARAGE Edition 💎
          </Text>
          <Text style={[styles.aboutText, { color: theme.textTertiary, marginTop: spacing.sm }]}>
            Made with ❤️ by Claude
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
});