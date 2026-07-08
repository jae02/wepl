import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import {
  useChecklist,
  useCreateChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
} from '@/hooks/useChecklist';

interface ChecklistPanelProps {
  tripId: string;
  scheduleId: string;
}

export default function ChecklistPanel({ tripId, scheduleId }: ChecklistPanelProps) {
  const { data: items, isLoading } = useChecklist(tripId, scheduleId);
  const createMutation = useCreateChecklistItem(tripId, scheduleId);
  const toggleMutation = useToggleChecklistItem(tripId, scheduleId);
  const deleteMutation = useDeleteChecklistItem(tripId, scheduleId);

  const [newItemTitle, setNewItemTitle] = useState('');

  const handleCreate = async () => {
    if (!newItemTitle.trim()) return;
    try {
      await createMutation.mutateAsync({ title: newItemTitle.trim() });
      setNewItemTitle('');
    } catch (e: any) {
      Alert.alert('오류', '체크리스트 추가에 실패했습니다.');
    }
  };

  const handleToggle = (itemId: string) => {
    toggleMutation.mutate(itemId);
  };

  const handleDelete = (itemId: string) => {
    Alert.alert('삭제', '이 항목을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteMutation.mutate(itemId) },
    ]);
  };

  if (isLoading) {
    return <ActivityIndicator style={{ margin: 20 }} color="#667eea" />;
  }

  const checklist = items || [];
  const completedCount = checklist.filter((i) => i.isChecked).length;
  const totalCount = checklist.length;
  const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  return (
    <View style={styles.container}>
      {/* 진행률 바 */}
      <View style={styles.header}>
        <Text style={styles.title}>체크리스트 ({completedCount}/{totalCount})</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* 리스트 */}
      {checklist.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <Pressable onPress={() => handleToggle(item.id)} style={styles.checkboxArea}>
            <Text style={styles.checkbox}>{item.isChecked ? '☑️' : '⬜'}</Text>
            <Text style={[styles.itemText, item.isChecked && styles.itemTextChecked]}>
              {item.title}
            </Text>
          </Pressable>
          <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>❌</Text>
          </Pressable>
        </View>
      ))}

      {/* 추가 폼 */}
      <View style={styles.addForm}>
        <TextInput
          style={styles.input}
          placeholder="새 체크리스트 항목 추가..."
          value={newItemTitle}
          onChangeText={setNewItemTitle}
          onSubmitEditing={handleCreate}
        />
        <Pressable onPress={handleCreate} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(128,128,128,0.05)',
    borderRadius: 12,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  checkboxArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    fontSize: 20,
    marginRight: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 12,
  },
  addForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  addBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#667eea',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
