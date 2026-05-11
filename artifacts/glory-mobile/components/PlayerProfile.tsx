import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform,
  ActivityIndicator, TextInput, Animated, Alert,
  Dimensions, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import {
  useGetMe, useGetPlayerStats, useUpdateMyProfile,
  useListMatches, useListBookings, useGetPlayer, useUpdateAvailability,
} from '@workspace/api-client-react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

const PLAYER_ROLES = [
  { label: 'Batsman', value: 'batsman' },
  { label: 'Bowler', value: 'bowler' },
  { label: 'All-rounder', value: 'all_rounder' },
  { label: 'Keeper', value: 'wicket_keeper' },
];

const AVAIL_OPTIONS = [
  { key: 'available_today', label: 'Available Today', color: '#10B981' },
  { key: 'available_weekend', label: 'Weekend Only', color: '#3B82F6' },
  { key: 'looking_for_team', label: 'Looking for Team', color: '#F59E0B' },
  { key: 'unavailable', label: 'Away', color: '#EF4444' },
] as const;

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_W * 0.85;

export default function PlayerProfile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setToken } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<'matches' | 'bookings'>('matches');

  const drawerAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const { data: me, isLoading, refetch } = useGetMe();
  const { data: stats } = useGetPlayerStats(me?.id as number, { query: { enabled: !!me?.id } as any });
  const { data: matches } = useListMatches({ limit: 10 } as any);
  const { data: bookings } = useListBookings();

  const [city, setCity] = useState('');
  const [playerRole, setPlayerRole] = useState('');
  const [battingStyle, setBattingStyle] = useState('');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const updateProfile = useUpdateMyProfile();
  const updateAvail = useUpdateAvailability();
  const { data: playerProfile } = useGetPlayer(me?.id as number, { query: { enabled: !!me?.id } as any });

  useEffect(() => {
    if (me) { setCity(me.city || ''); }
    if (playerProfile) {
      setPlayerRole((playerProfile as any).playerRole || '');
      setBattingStyle((playerProfile as any).battingStyle || '');
      setBowlingStyle((playerProfile as any).bowlingStyle || '');
    }
  }, [me, playerProfile]);

  const openDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDrawerOpen(true);
    Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, damping: 20, mass: 0.8 }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, { toValue: DRAWER_WIDTH, duration: 260, useNativeDriver: true }).start(() => setDrawerOpen(false));
  };

  const handleUpdate = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await updateProfile.mutateAsync({ data: { city, playerRole: playerRole as any, battingStyle, bowlingStyle } });
      setEditOpen(false);
      refetch();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile');
    }
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => setToken(null) },
    ]);
  };

  const meAny = me as any;
  const pp = playerProfile as any;
  const trustScore = pp?.trustScore ?? 0;
  const trustColor = trustScore >= 80 ? '#10B981' : trustScore >= 50 ? '#F97316' : '#EF4444';
  const availStatus = pp?.availabilityStatus;
  const isAvailable = availStatus != null && availStatus !== 'unavailable';
  const currentAvail = AVAIL_OPTIONS.find(o => o.key === availStatus);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0), paddingBottom: 110 }}
      >
        {/* ─── Profile Hero ─── */}
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.heroGradient}>
          <View style={styles.heroTopRow}>
            <Text style={[styles.heroTitle, { color: colors.primary }]}>My Profile</Text>
            <Pressable onPress={openDrawer} style={styles.activityBtn}>
              <Ionicons name="pulse-outline" size={18} color={colors.primary} />
              <Text style={[styles.activityBtnText, { color: colors.primary }]}>Activity</Text>
            </Pressable>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <LinearGradient colors={['#F97316', '#EA580C']} style={styles.avatar}>
                <Text style={styles.avatarText}>{(me?.name?.[0] || '?').toUpperCase()}</Text>
              </LinearGradient>
              <View style={[styles.availBadge, { backgroundColor: isAvailable ? '#10B981' : '#64748B' }]} />
            </View>
            <Text style={styles.heroName}>{me?.name || 'Player'}</Text>
            {me?.city ? (
              <View style={styles.cityRow}>
                <Ionicons name="location-outline" size={13} color="#94A3B8" />
                <Text style={styles.heroCity}>{me.city}</Text>
              </View>
            ) : null}
            <View style={styles.chipRow}>
              <View style={[styles.chip, { backgroundColor: '#F9731625', borderColor: '#F97316' }]}>
                <Text style={[styles.chipText, { color: '#F97316' }]}>{me?.role?.toUpperCase()}</Text>
              </View>
              {pp?.playerRole ? (
                <View style={[styles.chip, { backgroundColor: '#3B82F625', borderColor: '#3B82F6' }]}>
                  <Text style={[styles.chipText, { color: '#3B82F6' }]}>{pp.playerRole.replace('_', ' ')}</Text>
                </View>
              ) : null}
              {currentAvail && (
                <Pressable
                  onPress={() => {
                    const nextIdx = (AVAIL_OPTIONS.findIndex(o => o.key === availStatus) + 1) % AVAIL_OPTIONS.length;
                    const next = AVAIL_OPTIONS[nextIdx]!;
                    Haptics.selectionAsync();
                    updateAvail.mutateAsync({ data: { status: next.key } });
                  }}
                  style={[styles.chip, { backgroundColor: currentAvail.color + '25', borderColor: currentAvail.color }]}
                >
                  <Text style={[styles.chipText, { color: currentAvail.color }]}>{currentAvail.label}</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Trust Score */}
          <View style={styles.trustSection}>
            <View style={styles.trustLabelRow}>
              <Text style={styles.trustLabel}>Trust Score</Text>
              <Text style={[styles.trustValue, { color: trustColor }]}>{trustScore}/100</Text>
            </View>
            <View style={styles.trustBarBg}>
              <View style={[styles.trustBarFill, { width: `${trustScore}%` as any, backgroundColor: trustColor }]} />
            </View>
            <Text style={styles.trustHint}>
              {trustScore >= 80 ? '🔥 Excellent — teams trust you!' : trustScore >= 50 ? '⚡ Good — keep playing consistently' : '📈 Build trust by verifying more matches'}
            </Text>
          </View>
        </LinearGradient>

        {/* ─── Stats Grid ─── */}
        <View style={[styles.statsGrid, { backgroundColor: colors.card }]}>
          {[
            { val: stats?.totalMatches ?? 0, lab: 'Matches', emoji: '🏏' },
            { val: stats?.totalRuns ?? 0, lab: 'Runs', emoji: '🏃' },
            { val: stats?.totalWickets ?? 0, lab: 'Wickets', emoji: '🎯' },
            { val: `${stats?.winPercentage ?? 0}%`, lab: 'Win Rate', emoji: '🏆' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCell, i < 3 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={[styles.statVal, { color: colors.text }]}>{s.val}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>{s.lab}</Text>
            </View>
          ))}
        </View>

        {/* ─── Recent Matches ─── */}
        <View style={[styles.card, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>🏆 Recent Matches</Text>
            <Pressable onPress={openDrawer}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </Pressable>
          </View>
          {!(matches as any[])?.length ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 28 }}>🏏</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No matches yet. Start playing!</Text>
            </View>
          ) : (
            (matches as any[]).slice(0, 3).map((m: any) => (
              <View key={m.id} style={[styles.matchRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.matchIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={{ fontSize: 16 }}>🏏</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.matchName, { color: colors.text }]} numberOfLines={1}>
                    {m.teamAName ?? 'Team A'} vs {m.teamBName ?? 'Team B'}
                  </Text>
                  <Text style={[styles.matchMeta, { color: colors.mutedForeground }]}>{m.status} · {m.matchDate ?? ''}</Text>
                </View>
                <View style={[styles.matchStatusBadge, {
                  backgroundColor: m.status === 'completed' ? '#10B98120' : m.status === 'in_progress' ? '#EF444420' : '#3B82F620'
                }]}>
                  <Text style={[styles.matchStatusText, {
                    color: m.status === 'completed' ? '#10B981' : m.status === 'in_progress' ? '#EF4444' : '#3B82F6'
                  }]}>{m.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ─── My Bookings ─── */}
        <View style={[styles.card, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>🏟️ My Bookings</Text>
          </View>
          {!(bookings as any[])?.length ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 28 }}>🏟️</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No bookings yet. Book a turf!</Text>
            </View>
          ) : (
            (bookings as any[]).slice(0, 3).map((b: any) => (
              <View key={b.id} style={[styles.matchRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.matchIcon, { backgroundColor: '#3B82F620' }]}>
                  <Text style={{ fontSize: 16 }}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.matchName, { color: colors.text }]}>{b.turfName || `Booking #${b.id}`}</Text>
                  <Text style={[styles.matchMeta, { color: colors.mutedForeground }]}>{b.date} · {b.startTime}</Text>
                </View>
                <View style={[styles.matchStatusBadge, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.matchStatusText, { color: '#10B981' }]}>{b.status || 'booked'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ─── Menu Actions ─── */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
          {[
            { icon: 'edit-2', label: 'Edit Profile', sub: 'Update name, city, role', onPress: () => setEditOpen(true), color: colors.text },
            { icon: 'pulse', label: 'Activity Drawer', sub: 'All scores & match history', onPress: openDrawer, color: colors.text, ionicon: true },
            { icon: 'shield', label: 'Trust & Verification', sub: 'Verify your matches', onPress: () => Alert.alert('Coming Soon', 'Match verification coming soon!'), color: colors.text },
            { icon: 'log-out', label: 'Sign Out', sub: 'See you on the pitch!', onPress: handleSignOut, color: '#EF4444' },
          ].map((item, i, arr) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={[styles.menuRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: item.color === '#EF4444' ? '#EF444420' : colors.primary + '15' }]}>
                {item.ionicon
                  ? <Ionicons name="pulse-outline" size={18} color={item.color === '#EF4444' ? '#EF4444' : colors.primary} />
                  : <Feather name={item.icon as any} size={18} color={item.color === '#EF4444' ? '#EF4444' : colors.primary} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: item.color }]}>{item.label}</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ─── Animated Activity Drawer ─── */}
      {drawerOpen && (
        <>
          <Pressable style={styles.drawerOverlay} onPress={closeDrawer} />
          <Animated.View style={[styles.drawer, { backgroundColor: colors.card, transform: [{ translateX: drawerAnim }] }]}>
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.drawerTitle, { color: colors.text }]}>Activity Feed</Text>
              <Pressable onPress={closeDrawer} style={styles.drawerClose}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={[styles.drawerTabs, { backgroundColor: colors.background }]}>
              {(['matches', 'bookings'] as const).map(tab => (
                <Pressable
                  key={tab}
                  onPress={() => { Haptics.selectionAsync(); setActiveActivity(tab); }}
                  style={[styles.drawerTab, activeActivity === tab && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.drawerTabText, { color: activeActivity === tab ? '#fff' : colors.mutedForeground }]}>
                    {tab === 'matches' ? '🏆 Matches' : '🏟️ Bookings'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
              {activeActivity === 'matches' ? (
                !(matches as any[])?.length ? (
                  <View style={styles.emptyState}>
                    <Text style={{ fontSize: 40 }}>🏏</Text>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No matches yet</Text>
                  </View>
                ) : (matches as any[]).map((m: any) => (
                  <View key={m.id} style={[styles.activityItem, { borderColor: colors.border }]}>
                    <View style={[styles.activityIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={{ fontSize: 18 }}>🏏</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activityTitle, { color: colors.text }]}>
                        {m.teamAName ?? 'Team A'} vs {m.teamBName ?? 'Team B'}
                      </Text>
                      <Text style={[styles.activitySub, { color: colors.mutedForeground }]}>{m.matchDate ?? ''}</Text>
                      {m.teamAScore != null && (
                        <Text style={[styles.scoreText, { color: colors.primary }]}>{m.teamAScore}/{m.teamAWickets} – {m.teamBScore}/{m.teamBWickets}</Text>
                      )}
                    </View>
                    <View style={[styles.matchStatusBadge, {
                      backgroundColor: m.status === 'completed' ? '#10B98120' : m.status === 'in_progress' ? '#EF444420' : '#3B82F620'
                    }]}>
                      <Text style={[styles.matchStatusText, {
                        color: m.status === 'completed' ? '#10B981' : m.status === 'in_progress' ? '#EF4444' : '#3B82F6'
                      }]}>{m.status}</Text>
                    </View>
                  </View>
                ))
              ) : (
                !(bookings as any[])?.length ? (
                  <View style={styles.emptyState}>
                    <Text style={{ fontSize: 40 }}>🏟️</Text>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No bookings yet</Text>
                  </View>
                ) : (bookings as any[]).map((b: any) => (
                  <View key={b.id} style={[styles.activityItem, { borderColor: colors.border }]}>
                    <View style={[styles.activityIcon, { backgroundColor: '#3B82F620' }]}>
                      <Text style={{ fontSize: 18 }}>📍</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activityTitle, { color: colors.text }]}>{b.turfName || `Turf #${b.turfId}`}</Text>
                      <Text style={[styles.activitySub, { color: colors.mutedForeground }]}>{b.date} · {b.startTime} → {b.endTime}</Text>
                      <Text style={[styles.activitySub, { color: colors.primary }]}>₹{b.totalAmount}</Text>
                    </View>
                    <View style={[styles.matchStatusBadge, { backgroundColor: '#10B98120' }]}>
                      <Text style={[styles.matchStatusText, { color: '#10B981' }]}>{b.status || 'booked'}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </>
      )}

      {/* ─── Edit Profile Bottom Sheet ─── */}
      {editOpen && (
        <Pressable style={styles.drawerOverlay} onPress={() => setEditOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.editSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
                <View style={[styles.editHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.editTitle, { color: colors.text }]}>Edit Profile</Text>
                  <Pressable onPress={() => setEditOpen(false)}>
                    <Ionicons name="close" size={22} color={colors.mutedForeground} />
                  </Pressable>
                </View>

                <ScrollView style={styles.editBody} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>City</Text>
                  <View style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="location-outline" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.editInputText, { color: colors.text }]}
                      value={city}
                      onChangeText={setCity}
                      placeholder="Mumbai, Delhi..."
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>

                  <Text style={[styles.editFieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Player Role</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {PLAYER_ROLES.map(r => (
                      <Pressable
                        key={r.value}
                        onPress={() => setPlayerRole(r.value)}
                        style={[styles.roleChip, {
                          backgroundColor: playerRole === r.value ? colors.primary : colors.background,
                          borderColor: playerRole === r.value ? colors.primary : colors.border,
                        }]}
                      >
                        <Text style={[styles.roleChipText, { color: playerRole === r.value ? '#fff' : colors.text }]}>{r.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={[styles.editFieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Batting Style</Text>
                  <View style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Feather name="activity" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.editInputText, { color: colors.text }]}
                      value={battingStyle}
                      onChangeText={setBattingStyle}
                      placeholder="Right-hand, Left-hand..."
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>

                  <Text style={[styles.editFieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Bowling Style</Text>
                  <View style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Feather name="rotate-cw" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.editInputText, { color: colors.text }]}
                      value={bowlingStyle}
                      onChangeText={setBowlingStyle}
                      placeholder="Fast, Spin, Medium..."
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>

                  <View style={[styles.editActions, { marginTop: 16 }]}>
                    <Pressable onPress={() => setEditOpen(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                      <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleUpdate} style={styles.saveBtn} disabled={updateProfile.isPending}>
                      <LinearGradient colors={['#F97316', '#EA580C']} style={styles.saveBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        {updateProfile.isPending
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={styles.saveBtnText}>Save Changes</Text>
                        }
                      </LinearGradient>
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroGradient: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  activityBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#F97316' },
  activityBtnText: { fontSize: 13, fontWeight: '700' },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: '900' },
  availBadge: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#0F172A' },
  heroName: { color: '#FAFAFA', fontSize: 24, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroCity: { color: '#94A3B8', fontSize: 14 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  trustSection: { marginTop: 16, gap: 6 },
  trustLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trustLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  trustValue: { fontSize: 14, fontWeight: '800' },
  trustBarBg: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  trustBarFill: { height: '100%', borderRadius: 4 },
  trustHint: { color: '#94A3B8', fontSize: 12 },
  statsGrid: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 20, marginTop: 16, marginBottom: 16 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statEmoji: { fontSize: 18 },
  statVal: { fontSize: 18, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  statLab: { fontSize: 11 },
  card: { borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  matchIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  matchName: { fontSize: 14, fontWeight: '600' },
  matchMeta: { fontSize: 12, marginTop: 2 },
  matchStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  matchStatusText: { fontSize: 10, fontWeight: '800' },
  menuCard: { borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700' },
  menuSub: { fontSize: 12, marginTop: 1 },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { fontSize: 13 },
  drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: DRAWER_WIDTH, shadowColor: '#000', shadowOpacity: 0.3,
    shadowRadius: 20, shadowOffset: { width: -4, height: 0 }, elevation: 20,
  },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  drawerTitle: { fontSize: 20, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  drawerClose: { padding: 4 },
  drawerTabs: { flexDirection: 'row', margin: 12, borderRadius: 12, padding: 4, gap: 4 },
  drawerTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  drawerTabText: { fontSize: 13, fontWeight: '700' },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  activityIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 14, fontWeight: '700' },
  activitySub: { fontSize: 12, marginTop: 2 },
  scoreText: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  editSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  editTitle: { fontSize: 18, fontWeight: '800' },
  editBody: { padding: 20, gap: 12, maxHeight: 480 },
  editFieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  editInput: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 50 },
  editInputText: { flex: 1, fontSize: 15 },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5 },
  roleChipText: { fontSize: 12, fontWeight: '700' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
