import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  FlatList, ActivityIndicator, RefreshControl, Platform,
  TextInput, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import {
  useListNeedPlayers, useJoinNeedPlayersPost, useGetLeaderboard,
  useGetMe, useUpdateAvailability, useListPlayers, useGetPlayerStats,
} from '@workspace/api-client-react';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [cityFilter, setCityFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [teamBuilderOpen, setTeamBuilderOpen] = useState(false);

  const { data: me, refetch: refetchMe } = useGetMe();
  const { data: stats } = useGetPlayerStats(me?.id as number, { query: { enabled: !!me?.id } });
  const { data: posts, isLoading: loadingPosts, refetch: refetchPosts } = useListNeedPlayers({ city: cityFilter || undefined });
  const { data: leaderboard } = useGetLeaderboard({ limit: 5 });
  const { data: topPlayers, isLoading: loadingPlayers } = useListPlayers({ limit: 8, availabilityStatus: 'AVAILABLE' } as any);

  const updateAvailability = useUpdateAvailability();
  const joinPost = useJoinNeedPlayersPost();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMe(), refetchPosts()]);
    setRefreshing(false);
  };

  const handleToggleAvailability = async () => {
    if (!me) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateAvailability.mutateAsync({
      data: { status: me.availabilityStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE' }
    });
    refetchMe();
  };

  const handleJoin = async (postId: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await joinPost.mutateAsync({ needPlayersPostId: postId });
      refetchPosts();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not join');
    }
  };

  const isAvailable = me?.availabilityStatus === 'AVAILABLE';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {getGreeting()}{me?.name ? `, ${me.name.split(' ')[0]}` : ''} 👋
          </Text>
          <Text style={[styles.wordmark, { color: colors.primary }]}>GLORY SPORTS</Text>
        </View>
        <Pressable style={[styles.iconBtn, { backgroundColor: colors.card }]}>
          <Feather name="bell" size={20} color={colors.text} />
          <View style={styles.notifDot} />
        </Pressable>
      </View>

      {/* ─── Hero Card: Availability + Quick Stats ─── */}
      <LinearGradient
        colors={['#F97316', '#EA580C']}
        style={styles.heroCard}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Player Status</Text>
            <Text style={styles.heroStatus}>{isAvailable ? '🟢 Visible to Teams' : '⚫ Invisible'}</Text>
          </View>
          <Pressable onPress={handleToggleAvailability} style={[styles.toggle, { backgroundColor: isAvailable ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)' }]}>
            <View style={[styles.toggleKnob, { marginLeft: isAvailable ? 22 : 2 }]} />
          </Pressable>
        </View>
        <View style={styles.heroStats}>
          {[
            { val: stats?.totalMatches ?? 0, lab: 'Matches' },
            { val: stats?.totalRuns ?? 0, lab: 'Runs' },
            { val: stats?.totalWickets ?? 0, lab: 'Wickets' },
            { val: `${stats?.winPercentage ?? 0}%`, lab: 'Win Rate' },
          ].map((s, i) => (
            <View key={i} style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{s.val}</Text>
              <Text style={styles.heroStatLab}>{s.lab}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ─── Build Your Team ─── */}
      <View style={[styles.teamBuilderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.teamBuilderHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🏏 Build Your Team</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Top rated available players near you</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setTeamBuilderOpen(!teamBuilderOpen); }}
            style={[styles.expandBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name={teamBuilderOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#fff" />
          </Pressable>
        </View>

        {teamBuilderOpen && (
          <>
            {loadingPlayers ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
            ) : !topPlayers?.length ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No available players found right now.</Text>
            ) : (
              <FlatList
                data={topPlayers}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4, paddingTop: 12, gap: 12 }}
                renderItem={({ item }) => (
                  <View style={[styles.playerChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={[styles.playerAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.playerAvatarText}>{(item.name?.[0] || '?').toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.playerChipName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.playerChipRole, { color: colors.mutedForeground }]}>{item.playerRole || 'Player'}</Text>
                    <View style={[styles.trustPill, { backgroundColor: '#F9731620' }]}>
                      <Text style={[styles.trustPillText, { color: colors.primary }]}>⭐ {item.trustScore}</Text>
                    </View>
                    <Pressable
                      onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Invitation Sent', `${item.name} has been invited to your team!`); }}
                      style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.inviteBtnText}>Invite</Text>
                    </Pressable>
                  </View>
                )}
              />
            )}
            <Pressable
              style={[styles.createTeamBtn, { borderColor: colors.primary }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Alert.alert('Create Team', 'Team creation flow coming in next update!'); }}
            >
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={[styles.createTeamText, { color: colors.primary }]}>Create New Team</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* ─── Need Players ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Need Players</Text>
          <View style={[styles.filterPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
            <TextInput
              style={[styles.filterInput, { color: colors.text }]}
              placeholder="City"
              placeholderTextColor={colors.mutedForeground}
              value={cityFilter}
              onChangeText={setCityFilter}
            />
          </View>
        </View>

        {loadingPosts ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
        ) : !posts?.length ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 32 }}>🏏</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No open posts right now</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, gap: 12 }}
            renderItem={({ item }) => (
              <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <LinearGradient colors={['#F9731615', '#F9731605']} style={styles.postCardGradient}>
                  <View style={styles.postCardTop}>
                    <View style={[styles.postTeamIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={{ fontSize: 20 }}>🏏</Text>
                    </View>
                    <View style={styles.postVsBadge}>
                      <Text style={[styles.postVsText, { color: colors.primary }]}>OPEN</Text>
                    </View>
                  </View>
                  <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={1}>{item.teamName}</Text>
                  <Text style={[styles.postRole, { color: colors.mutedForeground }]}>Needs: {item.roleRequired}</Text>
                  <View style={styles.postMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.postCity, { color: colors.mutedForeground }]}>{item.city}</Text>
                  </View>
                  <Pressable onPress={() => handleJoin(item.id)} style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
                    <Text style={styles.joinBtnText}>Join Team</Text>
                  </Pressable>
                </LinearGradient>
              </View>
            )}
          />
        )}
      </View>

      {/* ─── Leaderboard ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🏆 Leaderboard</Text>
          <Text style={[styles.seeAll, { color: colors.primary }]}>Top 5</Text>
        </View>
        <View style={[styles.leaderCard, { backgroundColor: colors.card }]}>
          {(leaderboard || []).map((player, index) => (
            <View
              key={player.playerId}
              style={[styles.leaderRow, index < (leaderboard?.length ?? 0) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <View style={styles.leaderLeft}>
                <View style={[styles.rankBadge, {
                  backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : colors.muted
                }]}>
                  <Text style={[styles.rankText, { color: index < 3 ? '#fff' : colors.text }]}>{index + 1}</Text>
                </View>
                <View style={[styles.leaderAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.leaderAvatarText, { color: colors.primary }]}>{(player.playerName?.[0] || '?').toUpperCase()}</Text>
                </View>
                <Text style={[styles.leaderName, { color: colors.text }]}>{player.playerName}</Text>
              </View>
              <View style={styles.leaderRight}>
                <Text style={[styles.leaderScore, { color: colors.primary }]}>{player.trustScore}</Text>
                <Text style={[styles.leaderScoreLab, { color: colors.mutedForeground }]}>pts</Text>
              </View>
            </View>
          ))}
          {!leaderboard?.length && (
            <Text style={[styles.emptyText, { color: colors.mutedForeground, padding: 20 }]}>No leaderboard data yet</Text>
          )}
        </View>
      </View>

      {/* ─── Quick Actions ─── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>⚡ Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: 'map', label: 'Book Turf', emoji: '🏟️', bg: '#3B82F620' },
            { icon: 'users', label: 'Find Team', emoji: '👥', bg: '#10B98120' },
            { icon: 'award', label: 'My Matches', emoji: '🏆', bg: '#F9731620' },
            { icon: 'search', label: 'Discover', emoji: '🔍', bg: '#8B5CF620' },
          ].map(action => (
            <Pressable
              key={action.label}
              style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Haptics.selectionAsync()}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: action.bg }]}>
                <Text style={{ fontSize: 22 }}>{action.emoji}</Text>
              </View>
              <Text style={[styles.quickLabel, { color: colors.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 20 },
  greeting: { fontSize: 13, marginBottom: 2 },
  wordmark: { fontSize: 24, fontWeight: '900', letterSpacing: 2, fontFamily: 'Inter_700Bold' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },

  heroCard: { marginHorizontal: 20, borderRadius: 24, padding: 20, marginBottom: 20, gap: 16 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },
  heroStatus: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
  toggle: { width: 48, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between' },
  heroStatItem: { alignItems: 'center' },
  heroStatVal: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  heroStatLab: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },

  teamBuilderCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 24 },
  teamBuilderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expandBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playerChip: { width: 140, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 6 },
  playerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  playerAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  playerChipName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  playerChipRole: { fontSize: 11, textAlign: 'center' },
  trustPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  trustPillText: { fontSize: 11, fontWeight: '700' },
  inviteBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10, marginTop: 4 },
  inviteBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  createTeamBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  createTeamText: { fontSize: 14, fontWeight: '700' },

  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  sectionSub: { fontSize: 12, marginTop: 2 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  filterPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 30, borderRadius: 15, borderWidth: 1, gap: 4 },
  filterInput: { fontSize: 12, width: 55 },

  postCard: { width: 195, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  postCardGradient: { padding: 16, gap: 6 },
  postCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  postTeamIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  postVsBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F9731620', borderRadius: 8 },
  postVsText: { fontSize: 11, fontWeight: '800' },
  postTitle: { fontSize: 15, fontWeight: '700' },
  postRole: { fontSize: 12 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postCity: { fontSize: 11 },
  joinBtn: { paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  leaderCard: { marginHorizontal: 20, borderRadius: 20, overflow: 'hidden' },
  leaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  leaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '800' },
  leaderAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  leaderAvatarText: { fontSize: 14, fontWeight: '700' },
  leaderName: { fontSize: 14, fontWeight: '600' },
  leaderRight: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  leaderScore: { fontSize: 18, fontWeight: '800' },
  leaderScoreLab: { fontSize: 11 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  quickBtn: { width: '46%', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 8 },
  quickIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '700' },

  emptyCard: { marginHorizontal: 20, padding: 32, borderRadius: 20, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
