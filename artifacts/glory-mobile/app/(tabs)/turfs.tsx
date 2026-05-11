import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListMatches, useVerifyMatch, useGetMe } from '@workspace/api-client-react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function MatchesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Live' | 'Completed'>('Upcoming');

  const { data: me } = useGetMe();
  const { data: matches, isLoading, refetch } = useListMatches({ 
    status: activeTab === 'Upcoming' ? 'SCHEDULED' : activeTab === 'Live' ? 'LIVE' : 'COMPLETED'
  });

  const verifyMatch = useVerifyMatch();

  const handleVerify = async (matchId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await verifyMatch.mutateAsync({ 
      matchId, 
      data: { captainSide: 'TEAM_A' } // Simplified for now
    });
    refetch();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'LIVE': return '#EF4444';
      case 'SCHEDULED': return colors.primary;
      case 'COMPLETED': return '#10B981';
      default: return colors.mutedForeground;
    }
  };

  const renderMatch = ({ item }: { item: any }) => (
    <View style={[styles.matchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.matchHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        <Text style={[styles.matchDate, { color: colors.mutedForeground }]}>
          {new Date(item.scheduledAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamInfo}>
          <View style={[styles.teamAvatar, { backgroundColor: colors.muted }]}>
            <Text style={[styles.teamInit, { color: colors.text }]}>{item.teamAName?.[0]}</Text>
          </View>
          <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{item.teamAName}</Text>
        </View>
        <Text style={[styles.vs, { color: colors.mutedForeground }]}>VS</Text>
        <View style={styles.teamInfo}>
          <View style={[styles.teamAvatar, { backgroundColor: colors.muted }]}>
            <Text style={[styles.teamInit, { color: colors.text }]}>{item.teamBName?.[0]}</Text>
          </View>
          <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{item.teamBName}</Text>
        </View>
      </View>

      {item.status === 'COMPLETED' && (
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreText, { color: colors.text }]}>{item.teamAScore || 0} - {item.teamBScore || 0}</Text>
          {!item.isVerified && (
            <Pressable 
              onPress={() => handleVerify(item.id)}
              style={[styles.verifyBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.verifyText}>Verify Score</Text>
            </Pressable>
          )}
          {item.isVerified && (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.verifiedText, { color: '#10B981' }]}>Verified</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.venueRow}>
        <Feather name="map-pin" size={14} color={colors.mutedForeground} />
        <Text style={[styles.venueText, { color: colors.mutedForeground }]}>{item.venue || 'TBD'}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.tabs}>
        {['Upcoming', 'Live', 'Completed'].map((tab: any) => (
          <Pressable 
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id.toString()}
          renderItem={renderMatch}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No {activeTab.toLowerCase()} matches</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabText: { fontWeight: 'bold', fontSize: 14 },
  matchCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16, gap: 16 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  matchDate: { fontSize: 12 },
  teamsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamInfo: { flex: 1, alignItems: 'center', gap: 8 },
  teamAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  teamInit: { fontSize: 20, fontWeight: 'bold' },
  teamName: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  vs: { fontSize: 16, fontWeight: 'bold' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#334155' },
  scoreText: { fontSize: 24, fontWeight: 'bold' },
  verifyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  verifyText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 12, fontWeight: '600' },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  venueText: { fontSize: 12 },
  empty: { marginTop: 80, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
});
