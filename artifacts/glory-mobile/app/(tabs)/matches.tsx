import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetMe, useGetPlayerStats, useUpdateMyProfile } from '@workspace/api-client-react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setToken } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const { data: me, isLoading, refetch } = useGetMe();
  const { data: stats } = useGetPlayerStats(me?.id as number, { query: { enabled: !!me?.id } });
  
  const updateProfile = useUpdateMyProfile();
  
  const [name, setName] = useState(me?.name || '');
  const [city, setCity] = useState(me?.city || '');

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setToken(null);
  };

  const handleUpdate = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile.mutateAsync({ data: { name, city } });
    setIsEditing(false);
    refetch();
  };

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0), paddingBottom: 120 }}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{me?.name?.[0]?.toUpperCase()}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{me?.name}</Text>
        <Text style={[styles.city, { color: colors.mutedForeground }]}>{me?.city}</Text>
        
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: colors.muted }]}>
            <Text style={[styles.chipText, { color: colors.text }]}>{me?.playerRole}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: me?.availabilityStatus === 'AVAILABLE' ? '#10B981' : colors.muted }]}>
            <Text style={[styles.chipText, { color: '#fff' }]}>{me?.availabilityStatus}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.text }]}>{stats?.totalMatches || 0}</Text>
          <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Matches</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.text }]}>{stats?.totalRuns || 0}</Text>
          <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Runs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.text }]}>{stats?.totalWickets || 0}</Text>
          <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Wickets</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.text }]}>{stats?.winPercentage || 0}%</Text>
          <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Win%</Text>
        </View>
      </View>

      <View style={[styles.trustCard, { backgroundColor: colors.card }]}>
        <View style={styles.trustHeader}>
          <Text style={[styles.trustTitle, { color: colors.text }]}>Trust Score</Text>
          <Text style={[styles.trustVal, { color: colors.primary }]}>{me?.trustScore}/100</Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${me?.trustScore || 0}%` }]} />
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => setIsEditing(true)} style={[styles.actionBtn, { backgroundColor: colors.card }]}>
          <Feather name="edit-2" size={20} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>Edit Profile</Text>
        </Pressable>
        <Pressable onPress={handleSignOut} style={[styles.actionBtn, { backgroundColor: colors.card }]}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={[styles.actionText, { color: "#EF4444" }]}>Sign Out</Text>
        </Pressable>
      </View>

      {isEditing && (
        <View style={[styles.editOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.editContent, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <Text style={[styles.editTitle, { color: colors.text }]}>Edit Profile</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Name"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={city}
              onChangeText={setCity}
              placeholder="City"
            />
            <View style={styles.editActions}>
              <Pressable onPress={() => setIsEditing(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.mutedForeground }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleUpdate} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold' },
  city: { fontSize: 16, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  chipText: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', margin: 20, padding: 20, borderRadius: 20, justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  statLab: { fontSize: 12, marginTop: 4 },
  trustCard: { marginHorizontal: 20, padding: 20, borderRadius: 20, gap: 12 },
  trustHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trustTitle: { fontSize: 16, fontWeight: '700' },
  trustVal: { fontSize: 16, fontWeight: 'bold' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%' },
  actions: { padding: 20, gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12 },
  actionText: { fontSize: 16, fontWeight: '600' },
  editOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  editContent: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 16 },
  editTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  cancelBtn: { padding: 12 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
});
