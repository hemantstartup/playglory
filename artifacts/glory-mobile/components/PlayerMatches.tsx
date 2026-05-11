import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Pressable, Platform, RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useListMatches } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type MatchTab = 'Upcoming' | 'Live' | 'Completed';

const TAB_STATUS: Record<MatchTab, string> = {
  Upcoming: 'scheduled',
  Live: 'in_progress',
  Completed: 'completed',
};

export default function PlayerMatches() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MatchTab>('Upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const { data: matches, isLoading, refetch } = useListMatches({ status: TAB_STATUS[activeTab] });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const statusColorMap: Record<string, string> = {
    in_progress: '#EF4444',
    scheduled: '#F97316',
    completed: '#10B981',
    verified: '#3B82F6',
    disputed: '#F59E0B',
    flagged: '#8B5CF6',
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Matches</Text>
          <Pressable
            onPress={() => Alert.alert('Create Match', 'Match creation coming soon!')}
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>New</Text>
          </Pressable>
        </View>
        <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
          {(['Upcoming', 'Live', 'Completed'] as MatchTab[]).map(tab => (
            <Pressable
              key={tab}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
              style={[styles.tabBtn, activeTab === tab && { backgroundColor: colors.primary }]}
            >
              {tab === 'Live' && activeTab === tab && <View style={styles.liveDot} />}
              <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : colors.mutedForeground }]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={(matches as any[]) ?? []}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🏏</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No {activeTab} Matches</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {activeTab === 'Upcoming' ? 'Schedule your first match to get started' : `No ${activeTab.toLowerCase()} matches found`}
              </Text>
            </View>
          }
          renderItem={({ item: match }: { item: any }) => {
            const statusColor = statusColorMap[match.status] ?? colors.primary;
            return (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); Alert.alert('Match', `${match.teamAName ?? 'Team A'} vs ${match.teamBName ?? 'Team B'}`); }}
                style={[styles.matchCard, { backgroundColor: colors.card }]}
              >
                <View style={[styles.statusBar, { backgroundColor: statusColor + '15' }]}>
                  <View style={styles.statusLeft}>
                    {match.status === 'in_progress' && <View style={styles.livePulse} />}
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {match.status === 'in_progress' ? '● LIVE' : match.status?.toUpperCase()}
                    </Text>
                  </View>
                  {match.matchDate && (
                    <Text style={[styles.matchDate, { color: colors.mutedForeground }]}>
                      {new Date(match.matchDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  )}
                </View>

                <View style={styles.teamsRow}>
                  <View style={styles.teamBlock}>
                    <View style={[styles.teamAvatar, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={{ fontSize: 22 }}>🏏</Text>
                    </View>
                    <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                      {match.teamAName ?? 'Team A'}
                    </Text>
                    {match.teamAScore != null && (
                      <Text style={[styles.score, { color: colors.primary }]}>
                        {match.teamAScore}/{match.teamAWickets ?? 0}
                      </Text>
                    )}
                  </View>

                  <View style={styles.vsBlock}>
                    <Text style={[styles.vsText, { color: colors.mutedForeground }]}>VS</Text>
                    {match.overs != null && (
                      <Text style={[styles.overs, { color: colors.mutedForeground }]}>{match.overs} ov</Text>
                    )}
                  </View>

                  <View style={[styles.teamBlock, { alignItems: 'flex-end' }]}>
                    <View style={[styles.teamAvatar, { backgroundColor: '#8B5CF620' }]}>
                      <Text style={{ fontSize: 22 }}>🏏</Text>
                    </View>
                    <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                      {match.teamBName ?? 'Team B'}
                    </Text>
                    {match.teamBScore != null && (
                      <Text style={[styles.score, { color: '#8B5CF6' }]}>
                        {match.teamBScore}/{match.teamBWickets ?? 0}
                      </Text>
                    )}
                  </View>
                </View>

                {match.turfName && (
                  <View style={[styles.matchFooter, { borderTopColor: colors.border }]}>
                    <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.matchVenue, { color: colors.mutedForeground }]}>{match.turfName}</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabText: { fontSize: 13, fontWeight: '700' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  matchCard: { borderRadius: 20, marginBottom: 14, overflow: 'hidden' },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  matchDate: { fontSize: 11 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  teamBlock: { flex: 1, alignItems: 'flex-start', gap: 6 },
  teamAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  teamName: { fontSize: 14, fontWeight: '800', maxWidth: '100%' },
  score: { fontSize: 20, fontWeight: '900' },
  vsBlock: { alignItems: 'center', width: 44 },
  vsText: { fontSize: 13, fontWeight: '900' },
  overs: { fontSize: 10, marginTop: 4 },
  matchFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  matchVenue: { fontSize: 12 },
});
