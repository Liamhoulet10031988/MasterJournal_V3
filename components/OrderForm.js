import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, RadioButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/AppStore';
import { darkTheme, lightTheme, spacing, borderRadius, fontSize } from '../utils/theme';

const QUICK_JOBS = [
  { name: 'Заправка кондиционера', price: 1500 },
  { name: 'Диагностика', price: 500 },
  { name: 'Замена масла', price: 800 },
  { name: 'Ремонт стартера', price: 2000 },
  { name: 'Замена свечей', price: 1000 },
  { name: 'Замена АКБ', price: 1200 },
];

export const OrderForm = ({ initialOrder, onSubmit, onCancel, submitLabel = 'Сохранить заказ', isModal = false }) => {
  const { searchClients, searchCars, theme: themeMode } = useAppStore();
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const [client, setClient] = useState(initialOrder?.client || '');
  const [car, setCar] = useState(initialOrder?.car || '');
  const [job, setJob] = useState(initialOrder?.job || '');
  const [workAmount, setWorkAmount] = useState(initialOrder?.workAmount?.toString() || '');
  const [ourParts, setOurParts] = useState(initialOrder?.ourParts || '');
  const [ourPartsAmount, setOurPartsAmount] = useState(initialOrder?.ourPartsAmount?.toString() || '');
  const [clientParts, setClientParts] = useState(initialOrder?.clientParts || '');
  const [payType, setPayType] = useState(initialOrder?.payType || 'cash');
  const [freonGrams, setFreonGrams] = useState(initialOrder?.freonGrams?.toString() || '');
  const [comment, setComment] = useState(initialOrder?.comment || '');
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [carSuggestions, setCarSuggestions] = useState([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showCarSuggestions, setShowCarSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const clientBlurTimer = useRef(null);
  const carBlurTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (clientBlurTimer.current) clearTimeout(clientBlurTimer.current);
      if (carBlurTimer.current) clearTimeout(carBlurTimer.current);
    };
  }, []);

  const resetForm = () => {
    setClient('');
    setCar('');
    setJob('');
    setWorkAmount('');
    setOurParts('');
    setOurPartsAmount('');
    setClientParts('');
    setPayType('cash');
    setFreonGrams('');
    setComment('');
  };

  // Подсказки клиентов
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (client.length >= 2) {
        try {
          const results = await searchClients(client);
          setClientSuggestions(results);
        } catch (error) {
          console.error('Ошибка поиска клиента:', error);
          setClientSuggestions([]);
        }
      } else {
        setClientSuggestions([]);
      }
    };
    
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [client]);

  // Подсказки авто
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (car.length >= 2) {
        try {
          const results = await searchCars(car);
          setCarSuggestions(results);
        } catch (error) {
          console.error('Ошибка поиска авто:', error);
          setCarSuggestions([]);
        }
      } else {
        setCarSuggestions([]);
      }
    };
    
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [car]);

  const selectQuickJob = (jobItem) => {
    setJob(jobItem.name);
    setWorkAmount(jobItem.price.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    const clientTrimmed = client.trim();
    const jobTrimmed = job.trim();
    
    // Валидация формата чисел
    if (workAmount && !/^\d+$/.test(workAmount)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('⚠️ Ошибка валидации', 'Сумма работы должна содержать только цифры');
      return;
    }
    
    if (ourPartsAmount && !/^\d+$/.test(ourPartsAmount)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('⚠️ Ошибка валидации', 'Стоимость деталей должна содержать только цифры');
      return;
    }
    
    if (freonGrams && !/^\d+$/.test(freonGrams)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('⚠️ Ошибка валидации', 'Граммы фреона должны содержать только цифры');
      return;
    }
    
    const workAmountNum = parseInt(workAmount) || 0;
    const ourPartsAmountNum = parseInt(ourPartsAmount) || 0;

    if (!clientTrimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('⚠️ Ошибка валидации', 'Поле "Клиент" обязательно для заполнения');
      return;
    }

    if (!jobTrimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('⚠️ Ошибка валидации', 'Поле "Работа" обязательно для заполнения');
      return;
    }

    if (workAmountNum <= 0 && ourPartsAmountNum <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('⚠️ Ошибка валидации', 'Укажите сумму работы или стоимость деталей');
      return;
    }

    const orderData = {
      date: initialOrder?.date || new Date().toISOString().split('T')[0],
      client: clientTrimmed,
      car: car.trim(),
      job: jobTrimmed,
      workAmount: workAmountNum,
      ourParts: ourParts.trim(),
      ourPartsAmount: ourPartsAmountNum,
      clientParts: clientParts.trim(),
      payType,
      freonGrams: freonGrams ? parseInt(freonGrams) : null,
      comment: comment.trim(),
    };

    setSaving(true);
    try {
      await onSubmit(orderData);
      
      if (!initialOrder) {
        resetForm();
      }
      
      return { isValid: true };
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('❌ Ошибка', error.message || 'Не удалось сохранить заказ');
      return { isValid: false, error: error.message };
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = (parseInt(workAmount) || 0) + (parseInt(ourPartsAmount) || 0);

  const content = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
    >
      <View style={[styles.formContainer, { backgroundColor: theme.surface }]}>
          {/* Клиент */}
          <View style={styles.inputContainer}>
            <TextInput
              label="Клиент *"
              value={client}
              onChangeText={setClient}
              onFocus={() => setShowClientSuggestions(true)}
              onBlur={() => {
                clientBlurTimer.current = setTimeout(() => setShowClientSuggestions(false), 200);
              }}
              style={[styles.input, { backgroundColor: theme.surface }]}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor={theme.primary}
              textColor={theme.text}
              theme={{ colors: { placeholder: theme.textTertiary } }}
            />
            {showClientSuggestions && clientSuggestions.length > 0 && (
              <View style={[styles.suggestions, { backgroundColor: theme.surface }]}>
                {clientSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setClient(suggestion);
                      setShowClientSuggestions(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.suggestionText, { color: theme.text }]}>
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {/* Авто */}
          <View style={styles.inputContainer}>
            <TextInput
              label="Машина"
              value={car}
              onChangeText={setCar}
              onFocus={() => setShowCarSuggestions(true)}
              onBlur={() => {
                carBlurTimer.current = setTimeout(() => setShowCarSuggestions(false), 200);
              }}
              style={[styles.input, { backgroundColor: theme.surface }]}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor={theme.primary}
              textColor={theme.text}
              placeholder="Lada Priora"
              theme={{ colors: { placeholder: theme.textTertiary } }}
            />
            {showCarSuggestions && carSuggestions.length > 0 && (
              <View style={[styles.suggestions, { backgroundColor: theme.surface }]}>
                {carSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setCar(suggestion);
                      setShowCarSuggestions(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="car-sport-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.suggestionText, { color: theme.text }]}>
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {!initialOrder && (
            <>
              {/* Быстрые работы */}
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Быстрые работы:
              </Text>
              <View style={styles.quickJobs}>
                {QUICK_JOBS.map((jobItem, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.quickJobChip, {
                      backgroundColor: theme.surfaceHighlight,
                      borderColor: theme.border,
                    }]}
                    onPress={() => selectQuickJob(jobItem)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flash" size={14} color={theme.primary} />
                    <Text style={[styles.quickJobText, { color: theme.text }]}>
                      {jobItem.name}
                    </Text>
                    <Text style={[styles.quickJobPrice, { color: theme.primary }]}>
                      {jobItem.price}₽
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          {/* Работа */}
          <TextInput
            label="Работа *"
            value={job}
            onChangeText={setJob}
            style={[styles.input, { backgroundColor: theme.surface }]}
            mode="outlined"
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
            textColor={theme.text}
            multiline
            numberOfLines={2}
            theme={{ colors: { placeholder: theme.textTertiary } }}
          />
          {/* Сумма работы */}
          <TextInput
            label="Сумма работы, ₽ *"
            value={workAmount}
            onChangeText={setWorkAmount}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.surface }]}
            mode="outlined"
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
            textColor={theme.text}
            theme={{ colors: { placeholder: theme.textTertiary } }}
          />
          {/* Наши детали */}
          <TextInput
            label="Детали наши (описание)"
            value={ourParts}
            onChangeText={setOurParts}
            style={[styles.input, { backgroundColor: theme.surface }]}
            mode="outlined"
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
            textColor={theme.text}
            placeholder="Фильтр, масло..."
            theme={{ colors: { placeholder: theme.textTertiary } }}
          />
          {/* Сумма наших деталей */}
          <TextInput
            label="Сумма деталей наших, ₽"
            value={ourPartsAmount}
            onChangeText={setOurPartsAmount}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.surface }]}
            mode="outlined"
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
            textColor={theme.text}
            theme={{ colors: { placeholder: theme.textTertiary } }}
          />
          {/* Детали клиента */}
          <TextInput
            label="Детали клиента"
            value={clientParts}
            onChangeText={setClientParts}
            style={[styles.input, { backgroundColor: theme.surface }]}
            mode="outlined"
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
            textColor={theme.text}
            placeholder="Что принёс клиент..."
            theme={{ colors: { placeholder: theme.textTertiary } }}
          />
          {/* Итоговая сумма (только отображение) */}
          {totalAmount > 0 && (
            <View style={[styles.totalContainer, { backgroundColor: theme.surfaceHighlight }]}>
              <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>
                Итого:
              </Text>
              <Text style={[styles.totalAmount, { color: theme.primary }]}>
                {totalAmount.toLocaleString('ru-RU')} ₽
              </Text>
            </View>
          )}
          {/* Оплата */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Оплата:
          </Text>
          <RadioButton.Group onValueChange={setPayType} value={payType}>
            <View style={[styles.radioContainer, { backgroundColor: theme.surface }]}>
              <TouchableOpacity
                style={styles.radioItem}
                onPress={() => {
                  setPayType('cash');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <RadioButton value="cash" color={theme.cash} />
                <Text style={[styles.radioLabel, { color: theme.text }]}>💵 Нал</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioItem}
                onPress={() => {
                  setPayType('cashless');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <RadioButton value="cashless" color={theme.cashless} />
                <Text style={[styles.radioLabel, { color: theme.text }]}>💳 Безнал</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioItem}
                onPress={() => {
                  setPayType('debt');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <RadioButton value="debt" color={theme.debt} />
                <Text style={[styles.radioLabel, { color: theme.text }]}>⚠️ Долг</Text>
              </TouchableOpacity>
            </View>
          </RadioButton.Group>
          {/* Фреон */}
          <TextInput
            label="Граммы фреона"
            value={freonGrams}
            onChangeText={setFreonGrams}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.surface }]}
            mode="outlined"
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
            textColor={theme.text}
            placeholder="250"
            theme={{ colors: { placeholder: theme.textTertiary } }}
          />
          {/* Комментарий */}
          <TextInput
            label="Комментарий"
            value={comment}
            onChangeText={setComment}
            style={[styles.input, { backgroundColor: theme.surface }]}
            mode="outlined"
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
            textColor={theme.text}
            multiline
            numberOfLines={3}
            theme={{ colors: { placeholder: theme.textTertiary } }}
          />
          {/* Кнопки */}
          <View style={styles.buttonsContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              contentStyle={styles.buttonContent}
              labelStyle={[styles.buttonLabel, { color: theme.background }]}
              icon="check-circle"
              loading={saving}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : submitLabel}
            </Button>
            {onCancel && (
              <Button
                mode="outlined"
                onPress={onCancel}
                style={styles.cancelButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                textColor={theme.textSecondary}
                disabled={saving}
              >
                Отмена
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
  );

  return isModal ? content : (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {content}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    flex: 1, // ✅ Обязательно добавлено
    padding: spacing.lg,
    paddingBottom: 100, // Для кнопок
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  input: {
    marginBottom: spacing.md,
  },
  suggestions: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    borderRadius: borderRadius.md,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: fontSize.md,
    flex: 1,
  },
  quickJobs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickJobChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  quickJobText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  quickJobPrice: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioLabel: {
    fontSize: fontSize.md,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  buttonsContainer: {
    marginTop: spacing.xl,
  },
  submitButton: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  cancelButton: {
    borderRadius: borderRadius.lg,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  buttonLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});