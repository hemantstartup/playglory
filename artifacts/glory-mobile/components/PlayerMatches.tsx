import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Pressable, Platform, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useListMatches, useCreateMatch, useUpdateMatchScore,
  useVerifyMatch, useListTeams, useListTurfs, useGetMe,
} from '@workspace/api-client-react';
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

  // Create Match modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [teamAId, setTeamAId] = useState<number | null>(null);
  const [teamBId, setTeamBId] = useState<number | null>(null);
  const [turfId, setTurfId] = useState<number | null>(null);
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]!);
  const [overs, setOvers] = useState('10');
  const [matchType, setMatchType] = useState('T10');

  // Score update modal state
  const [scoreOpen, setScoreOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [aScore, setAScore] = useState('');
  const [aWickets, setAWickets] = useState('');
  const [bScore, setBScore] = useState('');
  const [bWickets, setBWickets] = useState('');
  const [winnerTeam, setWinnerTeam] = useState<'A' | 'B' | null>(null);

  const { data: me } = useGetMe();
  const { data: matches, isLoading, refetch } = useListMatches({ status: TAB_STATUS[activeTab] });
  const { data: teamsResp } = useListTeams({});
  const { data: turfs } = useListTurfs({ verified: true });
  const createMatch = useCreateMatch();
  const updateScore = useUpdateMatchScore();
  const verifyMatch = useVerifyMatch();

  const teams: any[] = Array.isArray(teamsResp) ? teamsResp : [];
  const turfList: any[] = Array.isArray(turfs) ? turfs : [];

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const handleCreateMatch = async () => {
    if (!teamAId || !teamBId || !turfId) {
      Alert.alert('Missing Fields', 'Please select Team A, Team B, and a Turf.');
      return;
    }
    if (teamAId === teamBId) {
      Alert.alert('Invalid', 'Team A and Team B must be different.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createMatch.mutateAsync({
        data: {
          teamAId, teamBId, turfId,
          matchDate, overs: parseInt(overs) || 10,
          matchType,
        },
      });
      setCreateOpen(false);
      setTeamAId(null); setTeamBId(null); setTurfId(null);
      setOvers('10'); setMatchDate(new Date().toISOString().split('T')[0]!);
      refetch();
      Alert.alert('Match Scheduled! 🏏', 'Your match has been created. Both teams have been notified.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create match.');
    }
  };

  const handleUpdateScore = async () => {
    if (!selectedMatch) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const winnerId = winnerTeam === 'A' ? selectedMatch.teamAId : winnerTeam === 'B' ? selectedMatch.teamBId : undefined;
      await updateScore.mutateAsync({
        matchId: selectedMatch.id,
        data: {
          teamAScore: aScore ? parseInt(aScore) : undefined,
          teamAWickets: aWickets ? parseInt(aWickets) : undefined,
          teamBScore: bScore ? parseInt(bScore) : undefined,
          teamBWickets: bWickets ? parseInt(bWickets) : undefined,
          winnerTeamId: winnerId,
          status: winnerTeam ? 'completed' : 'in_progress',
        },
      });
      setScoreOpen(false);
      refetch();
      Alert.alert('Score Updated!', 'Match score has been recorded.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update score.');
    }
  };

  const handleVerify = async (matchId: number, side: 'A' | 'B') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await verifyMatch.mutateAsync({ matchId, data: { verified: true, captainSide: side } });
      refetch();
      Alert.alert('Verified! ✅', 'You have verified the match result.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not verify match.');
    }
  };

  const openScoreModal = (match: any) => {
    setSelectedMatch(match);
    setAScore(match.teamAScore != null ? String(match.teamAScore) : '');
    setAWickets(match.teamAWickets != null ? String(match.teamAWickets) : '');
    setBScore(match.teamBScore != null ? String(match.teamBScore) : '');
    setBWickets(match.teamBWickets != null ? String(match.teamBWickets) : '');
    setWinnerTeam(null);
    setScoreOpen(true);
  };

  const statusColorMap: Record<string, string> = {
    in_progress: '#EF4444',
    scheduled: '#F97316',
    completed: '#10B981',
    verified: '#3B82F6',
    disputed: '#F59E0B',
    flagged: '#8B5CF6',
  };

  const MATCH_TYPES = ['T10', 'T20', 'ODI', 'Test', 'Friendly'];

  return (
    <>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), backgroundColor: colors.background }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Matches</Text>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setCreateOpen(true); }}
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
                  {activeTab === 'Upcoming' ? 'Tap + New to schedule your first match' : `No ${activeTab.toLowerCase()} matches found`}
                </Text>
                {activeTab === 'Upcoming' && (
                  <Pressable onPress={() => setCreateOpen(true)} style={[styles.scheduleBtn, { backgroundColor: colors.primary }]}>
                    <Text style={styles.scheduleBtnText}>Schedule Match</Text>
                  </Pressable>
                )}
              </View>
            }
            renderItem={({ item: match }: { item: any }) => {
              const statusColor = statusColorMap[match.status] ?? colors.primary;
              return (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (match.status === 'in_progress' || match.status === 'scheduled') {
                      openScoreModal(match);
                    } else if (match.status === 'completed') {
                      Alert.alert(
                        `${match.teamAName ?? 'Team A'} vs ${match.teamBName ?? 'Team B'}`,
                        `Score: ${match.teamAScore ?? '-'}/${match.teamAWickets ?? '-'} vs ${match.teamBScore ?? '-'}/${match.teamBWickets ?? '-'}\n\nVerify as captain?`,
                        [
                          { text: 'Verify (Team A)', onPress: () => handleVerify(match.id, 'A') },
                          { text: 'Verify (Team B)', onPress: () => handleVerify(match.id, 'B') },
                          { text: 'Close', style: 'cancel' },
                        ]
                      );
                    }
                  }}
                  style={[styles.matchCard, { backgroundColor: colors.card }]}
                >
                  <View style={[styles.statusBar, { backgroundColor: statusColor + '15' }]}>
                    <View style={styles.statusLeft}>
                      {match.status === 'in_progress' && <View style={styles.livePulse} />}
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {match.status === 'in_progress' ? '● LIVE' : match.status?.toUpperCase().replace('_', ' ')}
                      </Text>
                    </View>
                    <View style={styles.statusRight}>
                      {match.matchDate && (
                        <Text style={[styles.matchDate, { color: colors.mutedForeground }]}>
                          {new Date(match.matchDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </Text>
                      )}
                      {(match.status === 'in_progress' || match.status === 'scheduled') && (
                        <View style={[styles.updateBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.updateText, { color: colors.primary }]}>Update Score</Text>
                        </View>
                      )}
                    </View>
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
                      {match.mvpPlayerName && (
                        <Text style={[styles.mvp, { color: '#F59E0B' }]}>⭐ MVP: {match.mvpPlayerName}</Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </View>

      {/* Create Match Modal */}
      <Modal visible={createOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={() => setCreateOpen(false)}>
            <Pressable style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                <Text style={[styles.sheetTitle, { color: colors.text }]}>🏏 Schedule Match</Text>

                <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Team A *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 4 }}>
                  {teams.length === 0 ? (
                    <Text style={[styles.noTeamText, { color: colors.mutedForeground }]}>No teams found. Create a team first.</Text>
                  ) : teams.map((t: any) => (
                    <Pressable
                      key={t.id}
                      onPress={() => { Haptics.selectionAsync(); setTeamAId(t.id); }}
                      style={[styles.teamChip, {
                        backgroundColor: teamAId === t.id ? colors.primary : colors.background,
                        borderColor: teamAId === t.id ? colors.primary : colors.border,
                      }]}
                    >
                      <Text style={[styles.teamChipText, { color: teamAId === t.id ? '#fff' : colors.text }]}>{t.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Team B *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 4 }}>
                  {teams.map((t: any) => (
                    <Pressable
                      key={t.id}
                      onPress={() => { Haptics.selectionAsync(); setTeamBId(t.id); }}
                      style={[styles.teamChip, {
                        backgroundColor: teamBId === t.id ? '#8B5CF6' : colors.background,
                        borderColor: teamBId === t.id ? '#8B5CF6' : colors.border,
                      }]}
                    >
                      <Text style={[styles.teamChipText, { color: teamBId === t.id ? '#fff' : colors.text }]}>{t.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Turf *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 4 }}>
                  {turfList.length === 0 ? (
                    <Text style={[styles.noTeamText, { color: colors.mutedForeground }]}>No verified turfs found.</Text>
                  ) : turfList.map((t: any) => (
                    <Pressable
                      key={t.id}
                      onPress={() => { Haptics.selectionAsync(); setTurfId(t.id); }}
                      style={[styles.teamChip, {
                        backgroundColor: turfId === t.id ? '#10B981' : colors.background,
                        borderColor: turfId === t.id ? '#10B981' : colors.border,
                      }]}
                    >
                      <Text style={[styles.teamChipText, { color: turfId === t.id ? '#fff' : colors.text }]}>{t.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Match Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 4 }}>
                  {MATCH_TYPES.map(mt => (
                    <Pressable
                      key={mt}
                      onPress={() => { Haptics.selectionAsync(); setMatchType(mt); setOvers(mt === 'T10' ? '10' : mt === 'T20' ? '20' : mt === 'ODI' ? '50' : '90'); }}
                      style={[styles.teamChip, {
                        backgroundColor: matchType === mt ? '#F59E0B' : colors.background,
                        borderColor: matchType === mt ? '#F59E0B' : colors.border,
                      }]}
                    >
                      <Text style={[styles.teamChipText, { color: matchType === mt ? '#fff' : colors.text }]}>{mt}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Date *</Text>
                    <TextInput
                      style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.mutedForeground}
                      value={matchDate}
                      onChangeText={setMatchDate}
                    />
                  </View>
                  <View style={{ width: 100 }}>
                    <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Overs</Text>
                    <TextInput
                      style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder="10"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      value={overs}
                      onChangeText={setOvers}
                    />
                  </View>
                </View>

                <Pressable
                  onPress={handleCreateMatch}
                  disabled={createMatch.isPending}
                  style={[styles.sheetBtn, { backgroundColor: colors.primary }]}
                >
                  {createMatch.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sheetBtnText}>Schedule Match</Text>}
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Score Update Modal */}
      <Modal visible={scoreOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={() => setScoreOpen(false)}>
            <Pressable style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>📊 Update Score</Text>
              {selectedMatch && (
                <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                  {selectedMatch.teamAName} vs {selectedMatch.teamBName}
                </Text>
              )}

              <View style={styles.scoreRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetLabel, { color: colors.primary }]}>{selectedMatch?.teamAName ?? 'Team A'}</Text>
                  <TextInput
                    style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.primary }]}
                    placeholder="Runs"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    value={aScore}
                    onChangeText={setAScore}
                  />
                  <TextInput
                    style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginTop: 6 }]}
                    placeholder="Wickets"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    value={aWickets}
                    onChangeText={setAWickets}
                  />
                </View>
                <View style={styles.vsCenter}>
                  <Text style={[styles.vsLabel, { color: colors.mutedForeground }]}>vs</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetLabel, { color: '#8B5CF6' }]}>{selectedMatch?.teamBName ?? 'Team B'}</Text>
                  <TextInput
                    style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: '#8B5CF6' }]}
                    placeholder="Runs"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    value={bScore}
                    onChangeText={setBScore}
                  />
                  <TextInput
                    style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginTop: 6 }]}
                    placeholder="Wickets"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    value={bWickets}
                    onChangeText={setBWickets}
                  />
                </View>
              </View>

              <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Winner (optional)</Text>
              <View style={styles.winnerRow}>
                <Pressable
                  onPress={() => setWinnerTeam(winnerTeam === 'A' ? null : 'A')}
                  style={[styles.winnerBtn, { borderColor: colors.primary, backgroundColor: winnerTeam === 'A' ? colors.primary : 'transparent' }]}
                >
                  <Text style={[styles.winnerText, { color: winnerTeam === 'A' ? '#fff' : colors.primary }]}>
                    {selectedMatch?.teamAName ?? 'Team A'} Wins
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setWinnerTeam(winnerTeam === 'B' ? null : 'B')}
                  style={[styles.winnerBtn, { borderColor: '#8B5CF6', backgroundColor: winnerTeam === 'B' ? '#8B5CF6' : 'transparent' }]}
                >
                  <Text style={[styles.winnerText, { color: winnerTeam === 'B' ? '#fff' : '#8B5CF6' }]}>
                    {selectedMatch?.teamBName ?? 'Team B'} Wins
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleUpdateScore}
                disabled={updateScore.isPending}
                style={[styles.sheetBtn, { backgroundColor: colors.primary }]}
              >
                {updateScore.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sheetBtnText}>Save Score</Text>}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  scheduleBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  scheduleBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  matchCard: { borderRadius: 20, marginBottom: 14, overflow: 'hidden' },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  matchDate: { fontSize: 11 },
  updateBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  updateText: { fontSize: 10, fontWeight: '700' },
  teamsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  teamBlock: { flex: 1, alignItems: 'flex-start', gap: 6 },
  teamAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  teamName: { fontSize: 14, fontWeight: '800', maxWidth: '100%' },
  score: { fontSize: 20, fontWeight: '900' },
  vsBlock: { alignItems: 'center', width: 44 },
  vsText: { fontSize: 13, fontWeight: '900' },
  overs: { fontSize: 10, marginTop: 4 },
  matchFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, flexWrap: 'wrap' },
  matchVenue: { fontSize: 12, flex: 1 },
  mvp: { fontSize: 11, fontWeight: '700' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, marginBottom: 16 },
  sheetLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  sheetInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14 },
  sheetBtn: { borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 16 },
  sheetBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  teamChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  teamChipText: { fontSize: 13, fontWeight: '700' },
  noTeamText: { fontSize: 13, paddingVertical: 10 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  scoreRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  vsCenter: { justifyContent: 'center', paddingTop: 20 },
  vsLabel: { fontSize: 16, fontWeight: '900' },
  winnerRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  winnerBtn: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  winnerText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
