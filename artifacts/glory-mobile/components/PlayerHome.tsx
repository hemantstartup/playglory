import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Platform, Alert,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useGetMe, useGetPlayerStats, useGetLeaderboard,
  useListNeedPlayers, useListPlayers, useUpdateAvailability,
  useCreateNeedPlayersPost, useGetPlayer, useJoinNeedPlayersPost,
  useListTeams, useCreateTeam,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={pillStyles.wrap}>
      <Text style={[pillStyles.val, { color: color ?? '#fff' }]}>{value}</Text>
      <Text style={pillStyles.lbl}>{label}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  wrap: { alignItems: 'center', flex: 1 },
  val: { fontSize: 20, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  lbl: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', marginTop: 2 },
});

const AVAIL_OPTIONS = [
  { key: 'available_today', label: 'Available Today', color: '#10B981' },
  { key: 'available_weekend', label: 'Weekend Only', color: '#3B82F6' },
  { key: 'looking_for_team', label: 'Looking for Team', color: '#F59E0B' },
  { key: 'unavailable', label: 'Away', color: '#EF4444' },
] as const;

type AvailStatus = typeof AVAIL_OPTIONS[number]['key'];

export default function PlayerHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [teamOpen, setTeamOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [availStatus, setAvailStatus] = useState<AvailStatus>('available_today');
  const [availPickerOpen, setAvailPickerOpen] = useState(false);

  // Need Players post modal
  const [npOpen, setNpOpen] = useState(false);
  const [npTitle, setNpTitle] = useState('');
  const [npCity, setNpCity] = useState('');
  const [npCount, setNpCount] = useState('2');
  const [npDesc, setNpDesc] = useState('');

  // Create Team modal
  const [ctOpen, setCtOpen] = useState(false);
  const [ctName, setCtName] = useState('');
  const [ctCity, setCtCity] = useState('');

  const { data: me } = useGetMe();
  const { data: playerProfile, refetch: refetchProfile } = useGetPlayer(me?.id as number, {
    query: { enabled: !!me?.id } as any,
  });
  const { data: stats, refetch: refetchStats } = useGetPlayerStats(me?.id as number, {
    query: { enabled: !!me?.id } as any,
  });
  const { data: leaderboard, refetch: refetchLb } = useGetLeaderboard({ limit: 5 });
  const { data: needPlayers, refetch: refetchNp } = useListNeedPlayers({ city: me?.city ?? undefined });
  const { data: topPlayersResp, isLoading: loadingPlayers, refetch: refetchPlayers } = useListPlayers({ available: true, limit: 8 });
  const topPlayers: any[] = (topPlayersResp as any)?.players ?? (Array.isArray(topPlayersResp) ? topPlayersResp : []);

  const updateAvail = useUpdateAvailability();
  const createNP = useCreateNeedPlayersPost();
  const joinNP = useJoinNeedPlayersPost();
  const createTeam = useCreateTeam();
  const { data: myTeams, refetch: refetchTeams } = useListTeams({});

  // Sync availability from profile
  useEffect(() => {
    if (playerProfile?.availabilityStatus) {
      setAvailStatus(playerProfile.availabilityStatus as AvailStatus);
    }
  }, [playerProfile?.availabilityStatus]);

  useEffect(() => {
    if (me?.city) setNpCity(me.city);
  }, [me?.city]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchStats(), refetchLb(), refetchNp(), refetchPlayers(), refetchTeams()]);
    setRefreshing(false);
  };

  const handleAvailChange = async (status: AvailStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAvailStatus(status);
    setAvailPickerOpen(false);
    try {
      await updateAvail.mutateAsync({ data: { status } });
    } catch {
      // revert on failure
      if (playerProfile?.availabilityStatus) setAvailStatus(playerProfile.availabilityStatus as AvailStatus);
    }
  };

  const handlePostNP = async () => {
    if (!npTitle || !npCity || !npCount) { Alert.alert('Missing Fields', 'Title, city and player count are required.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await createNP.mutateAsync({
        data: { title: npTitle, city: npCity, neededCount: parseInt(npCount), description: npDesc, sport: 'cricket' } as any,
      });
      setNpOpen(false);
      setNpTitle(''); setNpDesc('');
      refetchNp();
      Alert.alert('Posted!', 'Your need-players post is live. Players can now join.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to post. Try again.');
    }
  };

  const handleJoinPost = async (postId: number, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await joinNP.mutateAsync({ postId });
      refetchNp();
      Alert.alert('Joined! 🎉', `You've joined "${title}". The organiser will be notified.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not join. You may already be in this team.');
    }
  };

  const handleCreateTeam = async () => {
    if (!ctName) { Alert.alert('Missing Fields', 'Team name is required.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await createTeam.mutateAsync({ data: { name: ctName, city: ctCity, sport: 'cricket' } });
      setCtOpen(false); setCtName(''); setCtCity('');
      refetchTeams();
      Alert.alert('Team Created! 🏏', `${ctName} is ready. Start inviting players.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create team.');
    }
  };

  const currentAvail = AVAIL_OPTIONS.find(o => o.key === availStatus) ?? AVAIL_OPTIONS[0];
  const winPct = stats?.winPercentage != null ? `${Math.round(stats.winPercentage)}%` : '0%';
  const medalColors = ['#F59E0B', '#94A3B8', '#CD7C2F'];
  const medalEmoji = ['🥇', '🥈', '🥉'];

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{getGreeting()} 👋</Text>
            <Text style={[styles.name, { color: colors.text }]}>{me?.name?.split(' ')[0] ?? 'Player'}</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setAvailPickerOpen(true); }}
            style={[styles.availBadge, { backgroundColor: currentAvail.color + '20', borderColor: currentAvail.color }]}
          >
            <View style={[styles.availDot, { backgroundColor: currentAvail.color }]} />
            <Text style={[styles.availText, { color: currentAvail.color }]}>{currentAvail.label}</Text>
          </Pressable>
        </View>

        {/* Hero Stats Card */}
        <LinearGradient colors={['#F97316', '#C2410C']} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Your Stats</Text>
              <Text style={styles.heroCity}>📍 {me?.city ?? 'Your City'}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>🏏 {playerProfile?.playerRole?.replace('_', ' ') ?? 'Player'}</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <StatPill label="Matches" value={stats?.totalMatches ?? 0} />
            <View style={styles.statDiv} />
            <StatPill label="Runs" value={stats?.totalRuns ?? 0} />
            <View style={styles.statDiv} />
            <StatPill label="Wickets" value={stats?.totalWickets ?? 0} />
            <View style={styles.statDiv} />
            <StatPill label="Win %" value={winPct} color="#FCD34D" />
          </View>
        </LinearGradient>

        {/* Build Your Team */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setTeamOpen(!teamOpen); }}
            style={styles.sectionHeader}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🤝 Build Your Team</Text>
            <Ionicons name={teamOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
          </Pressable>
          {teamOpen && (
            <>
              {loadingPlayers ? (
                <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
              ) : topPlayers.slice(0, 6).map((p: any) => (
                <View key={p.id} style={[styles.playerRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.playerAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.playerAvatarText, { color: colors.primary }]}>
                      {(p.name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.playerName, { color: colors.text }]}>{p.name}</Text>
                    <Text style={[styles.playerRole, { color: colors.mutedForeground }]}>
                      {p.playerRole?.replace('_', ' ') ?? 'All-rounder'} · {p.city ?? 'India'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.trustScore, { color: '#F59E0B' }]}>⭐ {p.overallRating?.toFixed(1) ?? '0.0'}</Text>
                    <Pressable
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Invite Sent!', `${p.name} has been invited to join your team.`);
                      }}
                      style={[styles.inviteBtn, { borderColor: colors.primary }]}
                    >
                      <Text style={[styles.inviteBtnText, { color: colors.primary }]}>Invite</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setCtOpen(true); }}
                style={[styles.createTeamBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="people" size={16} color="#fff" />
                <Text style={styles.createTeamText}>Create New Team</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Need Players Feed */}
        <View style={styles.feedHeader}>
          <Text style={[styles.feedTitle, { color: colors.text }]}>🔍 Need Players</Text>
          <Pressable onPress={() => { Haptics.selectionAsync(); setNpOpen(true); }}>
            <Text style={[styles.feedSub, { color: colors.primary }]}>+ Post</Text>
          </Pressable>
        </View>
        {((needPlayers as any[]) ?? []).length === 0 ? (
          <View style={[styles.emptyFeed, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 32 }}>📭</Text>
            <Text style={[styles.emptyFeedText, { color: colors.mutedForeground }]}>No open calls in your city yet</Text>
            <Pressable onPress={() => { Haptics.selectionAsync(); setNpOpen(true); }} style={[styles.postBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.postBtnText}>Post One</Text>
            </Pressable>
          </View>
        ) : (
          ((needPlayers as any[]) ?? []).slice(0, 5).map((post: any) => {
            const spotsLeft = (post.neededCount ?? 1) - (post.joinedCount ?? 0);
            return (
              <View key={post.id} style={[styles.needCard, { backgroundColor: colors.card }]}>
                <View style={styles.needTop}>
                  <View style={[styles.openBadge, { backgroundColor: spotsLeft > 0 ? '#10B98120' : '#64748B20' }]}>
                    <Text style={[styles.openBadgeText, { color: spotsLeft > 0 ? '#10B981' : '#64748B' }]}>
                      {spotsLeft > 0 ? 'OPEN' : 'FULL'}
                    </Text>
                  </View>
                  <Text style={[styles.needCity, { color: colors.mutedForeground }]}>📍 {post.city}</Text>
                  {post.matchDate && (
                    <Text style={[styles.needCity, { color: colors.mutedForeground }]}>
                      📅 {new Date(post.matchDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  )}
                </View>
                <Text style={[styles.needTitle, { color: colors.text }]}>{post.title}</Text>
                <Text style={[styles.needRole, { color: colors.mutedForeground }]}>
                  {post.sport ?? 'Cricket'} · Need {spotsLeft} more player{spotsLeft !== 1 ? 's' : ''} · By {post.userName ?? 'Organiser'}
                </Text>
                {post.description ? (
                  <Text style={[styles.needDesc, { color: colors.mutedForeground }]}>{post.description}</Text>
                ) : null}
                <Pressable
                  disabled={spotsLeft <= 0 || joinNP.isPending}
                  onPress={() => handleJoinPost(post.id, post.title)}
                  style={[styles.joinBtn, { backgroundColor: spotsLeft > 0 ? colors.primary : colors.muted }]}
                >
                  <Text style={styles.joinBtnText}>{spotsLeft > 0 ? 'Join Team' : 'Team Full'}</Text>
                </Pressable>
              </View>
            );
          })
        )}

        {/* Leaderboard */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🏆 Leaderboard</Text>
          </View>
          {((leaderboard as any[]) ?? []).length === 0 ? (
            <Text style={[styles.noData, { color: colors.mutedForeground }]}>No leaderboard data yet</Text>
          ) : (
            ((leaderboard as any[]) ?? []).slice(0, 5).map((p: any, i: number) => (
              <View key={p.playerId ?? i} style={[styles.lbRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.lbRank, { color: i < 3 ? medalColors[i] : colors.mutedForeground }]}>
                  {i < 3 ? medalEmoji[i] : `#${p.rank ?? i + 1}`}
                </Text>
                <View style={[styles.lbAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.lbAvatarText, { color: colors.primary }]}>{(p.name?.[0] ?? '?').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lbName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.lbCity, { color: colors.mutedForeground }]}>{p.city ?? 'India'} · {p.matchesPlayed ?? 0} matches</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.lbScore, { color: colors.primary }]}>{p.totalRuns ?? 0} runs</Text>
                  <Text style={[styles.lbWickets, { color: colors.mutedForeground }]}>{p.totalWickets ?? 0} wkts</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.qaGrid}>
          {[
            { icon: 'map-pin', label: 'Book Turf', color: '#F97316' },
            { icon: 'users', label: 'Find Team', color: '#3B82F6' },
            { icon: 'award', label: 'My Matches', color: '#8B5CF6' },
            { icon: 'search', label: 'Discover', color: '#10B981' },
          ].map(q => (
            <Pressable key={q.label} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={[styles.qaCard, { backgroundColor: colors.card }]}>
              <View style={[styles.qaIcon, { backgroundColor: q.color + '20' }]}>
                <Feather name={q.icon as any} size={20} color={q.color} />
              </View>
              <Text style={[styles.qaLabel, { color: colors.text }]}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Availability Picker Modal */}
      <Modal visible={availPickerOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setAvailPickerOpen(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Set Availability</Text>
            {AVAIL_OPTIONS.map(opt => (
              <Pressable
                key={opt.key}
                onPress={() => handleAvailChange(opt.key)}
                style={[styles.pickerRow, availStatus === opt.key && { backgroundColor: opt.color + '15' }]}
              >
                <View style={[styles.pickerDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.pickerLabel, { color: availStatus === opt.key ? opt.color : colors.text }]}>{opt.label}</Text>
                {availStatus === opt.key && <Ionicons name="checkmark" size={18} color={opt.color} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Post Need Players Modal */}
      <Modal visible={npOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={() => setNpOpen(false)}>
            <Pressable style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>🔍 Post Need Players</Text>
              <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Title *</Text>
              <TextInput
                style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Need batsman for Sunday match"
                placeholderTextColor={colors.mutedForeground}
                value={npTitle}
                onChangeText={setNpTitle}
              />
              <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>City *</Text>
              <TextInput
                style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Mumbai, Delhi, Bangalore..."
                placeholderTextColor={colors.mutedForeground}
                value={npCity}
                onChangeText={setNpCity}
              />
              <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Players Needed *</Text>
              <TextInput
                style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="2"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                value={npCount}
                onChangeText={setNpCount}
              />
              <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Description (optional)</Text>
              <TextInput
                style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, height: 70, textAlignVertical: 'top' }]}
                placeholder="Any skill level welcome. Bring your own bat."
                placeholderTextColor={colors.mutedForeground}
                value={npDesc}
                onChangeText={setNpDesc}
                multiline
              />
              <Pressable
                onPress={handlePostNP}
                disabled={createNP.isPending}
                style={[styles.sheetBtn, { backgroundColor: colors.primary }]}
              >
                {createNP.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sheetBtnText}>Post Now</Text>}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Team Modal */}
      <Modal visible={ctOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={() => setCtOpen(false)}>
            <Pressable style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>🏏 Create New Team</Text>
              <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Team Name *</Text>
              <TextInput
                style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Mumbai Warriors"
                placeholderTextColor={colors.mutedForeground}
                value={ctName}
                onChangeText={setCtName}
              />
              <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>City</Text>
              <TextInput
                style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Mumbai"
                placeholderTextColor={colors.mutedForeground}
                value={ctCity}
                onChangeText={setCtCity}
              />
              <Pressable
                onPress={handleCreateTeam}
                disabled={createTeam.isPending}
                style={[styles.sheetBtn, { backgroundColor: colors.primary }]}
              >
                {createTeam.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sheetBtnText}>Create Team</Text>}
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  greeting: { fontSize: 13, fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 11, fontWeight: '700' },
  heroCard: { marginHorizontal: 16, borderRadius: 24, padding: 20, marginBottom: 16 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  heroCity: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  statDiv: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
  section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  playerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  playerAvatarText: { fontSize: 16, fontWeight: '800' },
  playerName: { fontSize: 14, fontWeight: '700' },
  playerRole: { fontSize: 11, marginTop: 2 },
  trustScore: { fontSize: 12, fontWeight: '700' },
  inviteBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1.5 },
  inviteBtnText: { fontSize: 11, fontWeight: '700' },
  createTeamBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 14, padding: 12, borderRadius: 14 },
  createTeamText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  feedTitle: { fontSize: 16, fontWeight: '800' },
  feedSub: { fontSize: 14, fontWeight: '700' },
  emptyFeed: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  emptyFeedText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  postBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  postBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  needCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 14 },
  needTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  openBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  openBadgeText: { fontSize: 10, fontWeight: '800' },
  needCity: { fontSize: 12 },
  needTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  needRole: { fontSize: 12, marginBottom: 6 },
  needDesc: { fontSize: 12, marginBottom: 8, lineHeight: 17 },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  noData: { padding: 20, textAlign: 'center', fontSize: 13 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  lbRank: { width: 28, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  lbAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lbAvatarText: { fontSize: 14, fontWeight: '800' },
  lbName: { fontSize: 14, fontWeight: '700' },
  lbCity: { fontSize: 11 },
  lbScore: { fontSize: 13, fontWeight: '800' },
  lbWickets: { fontSize: 10 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: 4 },
  qaCard: { width: '46%', borderRadius: 16, padding: 14, gap: 8 },
  qaIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 13, fontWeight: '700' },
  // Modal styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerSheet: { margin: 20, borderRadius: 20, padding: 20, gap: 4, marginBottom: 40 },
  pickerTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  pickerDot: { width: 10, height: 10, borderRadius: 5 },
  pickerLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  sheetLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  sheetInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, marginTop: 4 },
  sheetBtn: { borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 12 },
  sheetBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
