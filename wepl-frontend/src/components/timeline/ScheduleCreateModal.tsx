import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCreateSchedule } from '@/hooks/useSchedules';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScheduleCreateModalProps {
  tripId: string;
  visible: boolean;
  onClose: () => void;
  initialDate?: string;
}

export default function ScheduleCreateModal({
  tripId,
  visible,
  onClose,
  initialDate,
}: ScheduleCreateModalProps) {
  const insets = useSafeAreaInsets();
  const createMutation = useCreateSchedule(tripId);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date(initialDate || Date.now()));
  const [startTime, setStartTime] = useState(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    if (!title.trim()) {
      setError('일정 제목을 입력해주세요.');
      return;
    }

    // Format date as YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    
    // Format time as HH:mm:00
    const hours = startTime.getHours().toString().padStart(2, '0');
    const minutes = startTime.getMinutes().toString().padStart(2, '0');
    const startTimeStr = `${hours}:${minutes}:00`;

    try {
      await createMutation.mutateAsync({
        date: dateStr,
        customTitle: title.trim(),
        orderIndex: 0, // 기본값
        startTime: startTimeStr,
      } as any);
      
      setTitle('');
      onClose();
    } catch (e: any) {
      setError('일정 생성에 실패했습니다.');
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) setStartTime(selectedTime);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.content, { paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.headerTitle}>새 일정 추가</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.label}>일정 제목</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 간사이 공항 도착"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>날짜</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                value={date.toISOString().split('T')[0]}
                editable={false}
              />
            ) : (
              <Pressable onPress={() => setShowDatePicker(true)} style={styles.datePickerBtn}>
                <Text style={styles.datePickerText}>{date.toISOString().split('T')[0]}</Text>
              </Pressable>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            <Text style={styles.label}>시작 시간</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                value={`${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`}
                editable={false}
              />
            ) : (
              <Pressable onPress={() => setShowTimePicker(true)} style={styles.datePickerBtn}>
                <Text style={styles.datePickerText}>
                  {startTime.getHours().toString().padStart(2, '0')}:{startTime.getMinutes().toString().padStart(2, '0')}
                </Text>
              </Pressable>
            )}

            {showTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}

            <Pressable
              style={[styles.submitBtn, createMutation.isPending && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>일정 생성</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a2e',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    fontSize: 15,
  },
  datePickerBtn: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 15,
    color: '#333',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: '#667eea',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
