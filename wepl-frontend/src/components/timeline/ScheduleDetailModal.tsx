import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useUpdateSchedule, useDeleteSchedule, useUpdateScheduleStatus } from '@/hooks/useSchedules';
import ChecklistPanel from './ChecklistPanel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScheduleDetailModalProps {
  tripId: string;
  schedule: any | null;
  visible: boolean;
  onClose: () => void;
}

const STATUS_LIST = ['PLANNED', 'ONGOING', 'COMPLETED', 'SKIPPED'];

export default function ScheduleDetailModal({
  tripId,
  schedule,
  visible,
  onClose,
}: ScheduleDetailModalProps) {
  const insets = useSafeAreaInsets();
  const updateMutation = useUpdateSchedule(tripId);
  const statusMutation = useUpdateScheduleStatus(tripId);
  const deleteMutation = useDeleteSchedule(tripId);

  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState('PLANNED');

  useEffect(() => {
    if (schedule) {
      setMemo(schedule.memo || '');
      setStatus(schedule.status || 'PLANNED');
    }
  }, [schedule]);

  if (!schedule) return null;

  const handleUpdateMemo = async () => {
    if (memo === schedule.memo) return;
    try {
      await updateMutation.mutateAsync({
        scheduleId: schedule.id,
        data: { memo },
      });
    } catch (e) {
      Alert.alert('오류', '메모 저장에 실패했습니다.');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    try {
      await statusMutation.mutateAsync({
        scheduleId: schedule.id,
        status: newStatus,
      });
    } catch (e) {
      setStatus(schedule.status);
    }
  };

  const handleDelete = () => {
    Alert.alert('일정 삭제', '이 일정을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteMutation.mutateAsync(schedule.id);
          onClose();
        },
      },
    ]);
  };

  const title = schedule.customTitle || schedule.wishlistPlace?.name || '일정';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.content, { paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <View style={styles.headerRow}>
                <Text style={styles.title}>{title}</Text>
                <Pressable onPress={handleDelete} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>삭제</Text>
                </Pressable>
              </View>

              <Text style={styles.timeText}>
                {schedule.date} {schedule.startTime && schedule.startTime.substring(0, 5)}
              </Text>

              {/* 상태 변경 */}
              <Text style={styles.sectionLabel}>상태</Text>
              <View style={styles.statusContainer}>
                {STATUS_LIST.map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.statusChip, status === s && styles.statusChipActive]}
                    onPress={() => handleStatusChange(s)}
                  >
                    <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 메모 */}
              <Text style={styles.sectionLabel}>메모</Text>
              <TextInput
                style={styles.memoInput}
                multiline
                value={memo}
                onChangeText={setMemo}
                onBlur={handleUpdateMemo}
                placeholder="일정에 대한 메모를 남겨보세요."
              />

              {/* 체크리스트 */}
              <ChecklistPanel tripId={tripId} scheduleId={schedule.id} />
              
            </ScrollView>
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
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 14,
    color: '#667eea',
    marginBottom: 20,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusChipTextActive: {
    color: '#fff',
  },
  memoInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#333',
  },
});
