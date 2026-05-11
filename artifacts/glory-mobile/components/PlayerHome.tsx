import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useGetMe, useGetPlayerStats, useGetLeaderboard,
  useListNeedPlayers, useListPlayers, useUpdateAvailability,
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

export default function PlayerHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [teamOpen, setTeamOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [available, setAvailable] = useState(true);

  const { data: me } = useGetMe();
  const { data: stats } = useGetPlayerStats(me?.id as number, {
    query: { enabled: !!me?.id } as any,
  });
  const { data: leaderboard } = useGetLeaderboard();
  const { data: needPlayers } = useListNeedPlayers();
  const { data: topPlayersResp, isLoading: loadingPlayers } = useListPlayers({ available: true });
  const topPlayers = (topPlayersResp as any)?.players ?? (Array.isArray(topPlayersResp) ? topPlayersResp : []);
  const updateAvail = useUpdateAvailability();

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  const toggleAvailability = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateAvail.mutateAsync({ data: { status: available ? 'unavailable' : 'available_today' } });
      setAvailable(v => !v);
    } catch { setAvailable(v => !v); }
  };

  const winPct = stats?.winPercentage != null ? `${Math.round(stats.winPercentage)}%` : '0%';
  const medalColors = ['#F59E0B', '#94A3B8', '#CD7C2F'];
  const medalEmoji = ['🥇', '🥈', '🥉'];

  return (
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
        <Pressable onPress={toggleAvailability} style={[styles.availBadge, { backgroundColor: available ? '#10B98120' : '#EF444420', borderColor: available ? '#10B981' : '#EF4444' }]}>
          <View style={[styles.availDot, { backgroundColor: available ? '#10B981' : '#EF4444' }]} />
          <Text style={[styles.availText, { color: available ? '#10B981' : '#EF4444' }]}>
            {available ? 'Available' : 'Away'}
          </Text>
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
            <Text style={styles.roleText}>🏏 Player</Text>
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
            ) : (topPlayers as any[]).slice(0, 6).map((p: any) => (
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
                  <Text style={[styles.trustScore, { color: '#F59E0B' }]}>⭐ {p.trustScore ?? 0}</Text>
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
            <Pressable style={[styles.createTeamBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="people" size={16} color="#fff" />
              <Text style={styles.createTeamText}>Create New Team</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Need Players Feed */}
      <View style={styles.feedHeader}>
        <Text style={[styles.feedTitle, { color: colors.text }]}>🔍 Need Players</Text>
        <Text style={[styles.feedSub, { color: colors.primary }]}>See all</Text>
      </View>
      {((needPlayers as any[]) ?? []).slice(0, 3).map((post: any) => (
        <View key={post.id} style={[styles.needCard, { backgroundColor: colors.card }]}>
          <View style={styles.needTop}>
            <View style={[styles.openBadge, { backgroundColor: '#10B98120' }]}>
              <Text style={styles.openBadgeText}>OPEN</Text>
            </View>
            <Text style={[styles.needCity, { color: colors.mutedForeground }]}>📍 {post.city}</Text>
          </View>
          <Text style={[styles.needTitle, { color: colors.text }]}>{post.title}</Text>
          <Text style={[styles.needRole, { color: colors.mutedForeground }]}>
            Sport: {post.sport ?? 'Cricket'} · Need {post.neededCount ?? 1} players
          </Text>
          <Pressable style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.joinBtnText}>Join Team</Text>
          </Pressable>
        </View>
      ))}

      {/* Leaderboard */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🏆 Leaderboard</Text>
        </View>
        {((leaderboard as any[]) ?? []).slice(0, 5).map((p: any, i: number) => (
          <View key={p.id ?? i} style={[styles.lbRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.lbRank, { color: i < 3 ? medalColors[i] : colors.mutedForeground }]}>
              {i < 3 ? medalEmoji[i] : `#${i + 1}`}
            </Text>
            <View style={[styles.lbAvatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.lbAvatarText, { color: colors.primary }]}>{(p.name?.[0] ?? '?').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lbName, { color: colors.text }]}>{p.name}</Text>
              <Text style={[styles.lbCity, { color: colors.mutedForeground }]}>{p.city}</Text>
            </View>
            <Text style={[styles.lbScore, { color: colors.primary }]}>{p.totalRuns ?? 0} runs</Text>
          </View>
        ))}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  greeting: { fontSize: 13, fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 12, fontWeight: '700' },
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
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  feedTitle: { fontSize: 16, fontWeight: '800' },
  feedSub: { fontSize: 13, fontWeight: '600' },
  needCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 14 },
  needTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  openBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  openBadgeText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  needCity: { fontSize: 12 },
  needTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  needRole: { fontSize: 12, marginBottom: 10 },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  lbRank: { width: 28, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  lbAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lbAvatarText: { fontSize: 14, fontWeight: '800' },
  lbName: { fontSize: 14, fontWeight: '700' },
  lbCity: { fontSize: 11 },
  lbScore: { fontSize: 13, fontWeight: '800' },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: 4 },
  qaCard: { width: '46%', borderRadius: 16, padding: 14, gap: 8 },
  qaIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 13, fontWeight: '700' },
});
