import React from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetPlayer, useGetPlayerStats } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

const AVAIL_MAP: Record<string, { label: string; color: string }> = {
  available_today: { label: 'Available Today', color: '#10B981' },
  available_weekend: { label: 'Weekend Only', color: '#3B82F6' },
  looking_for_team: { label: 'Looking for Team', color: '#F59E0B' },
  unavailable: { label: 'Away', color: '#64748B' },
};

interface Props {
  playerId: number | null;
  playerName?: string;
  onClose: () => void;
  onInvite?: (player: any) => void;
}

export default function PlayerProfileModal({ playerId, playerName, onClose, onInvite }: Props) {
  const colors = useColors();

  const { data: player, isLoading } = useGetPlayer(playerId ?? 0, {
    query: { enabled: !!playerId } as any,
  });
  const { data: stats, isLoading: statsLoading } = useGetPlayerStats(playerId ?? 0, {
    query: { enabled: !!playerId } as any,
  });

  const p = player as any;
  const s = stats as any;
  const avail = p?.availabilityStatus ? AVAIL_MAP[p.availabilityStatus] : null;
  const trustScore = p?.trustScore ?? 0;
  const trustColor = trustScore >= 80 ? '#10B981' : trustScore >= 50 ? '#F97316' : '#EF4444';

  return (
    <Modal
      visible={!!playerId}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Player Profile</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Hero */}
            <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.hero}>
              <View style={styles.avatarWrap}>
                <LinearGradient colors={['#F97316', '#EA580C']} style={styles.avatar}>
                  <Text style={styles.avatarText}>{(p?.name?.[0] ?? '?').toUpperCase()}</Text>
                </LinearGradient>
                {p?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                  </View>
                )}
              </View>
              <Text style={styles.heroName}>{p?.name ?? playerName ?? 'Player'}</Text>
              {p?.city && (
                <View style={styles.heroMeta}>
                  <Ionicons name="location-outline" size={13} color="#94A3B8" />
                  <Text style={styles.heroCity}>{p.city}</Text>
                </View>
              )}
              <View style={styles.chipRow}>
                {p?.playerRole && (
                  <View style={[styles.chip, { backgroundColor: '#3B82F625', borderColor: '#3B82F6' }]}>
                    <Text style={[styles.chipText, { color: '#3B82F6' }]}>
                      {p.playerRole.replace('_', ' ')}
                    </Text>
                  </View>
                )}
                {avail && (
                  <View style={[styles.chip, { backgroundColor: avail.color + '25', borderColor: avail.color }]}>
                    <Text style={[styles.chipText, { color: avail.color }]}>{avail.label}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Trust Score */}
            <View style={[styles.card, { backgroundColor: colors.card, marginTop: 0 }]}>
              <View style={styles.trustRow}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Trust Score</Text>
                <Text style={[styles.trustValue, { color: trustColor }]}>{trustScore}/100</Text>
              </View>
              <View style={[styles.trustBarBg, { backgroundColor: colors.border }]}>
                <View style={[styles.trustBarFill, { width: `${trustScore}%` as any, backgroundColor: trustColor }]} />
              </View>
              <Text style={[styles.trustHint, { color: colors.mutedForeground }]}>
                {trustScore >= 80 ? '🔥 Highly trusted by teams' : trustScore >= 50 ? '⚡ Building a good reputation' : '📈 New to the platform'}
              </Text>
            </View>

            {/* Stats */}
            {(isLoading || statsLoading) ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
            ) : (
              <View style={[styles.statsGrid, { backgroundColor: colors.card }]}>
                {[
                  { val: s?.totalMatches ?? 0, label: 'Matches', emoji: '🏏' },
                  { val: s?.totalRuns ?? 0, label: 'Runs', emoji: '🏃' },
                  { val: s?.totalWickets ?? 0, label: 'Wickets', emoji: '🎯' },
                  { val: `${s?.winPercentage ?? 0}%`, label: 'Win Rate', emoji: '🏆' },
                ].map((stat, i) => (
                  <View key={i} style={[styles.statCell, i < 3 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                    <Text style={styles.statEmoji}>{stat.emoji}</Text>
                    <Text style={[styles.statVal, { color: colors.text }]}>{stat.val}</Text>
                    <Text style={[styles.statLab, { color: colors.mutedForeground }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Batting & Bowling */}
            {(p?.battingStyle || p?.bowlingStyle) && (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 12 }]}>Batting & Bowling</Text>
                <View style={styles.styleRow}>
                  {p.battingStyle && (
                    <View style={[styles.styleChip, { backgroundColor: '#F9731620', borderColor: '#F97316' }]}>
                      <Text style={{ fontSize: 16 }}>🏏</Text>
                      <View>
                        <Text style={[styles.styleLabel, { color: colors.mutedForeground }]}>Batting</Text>
                        <Text style={[styles.styleValue, { color: colors.text }]}>{p.battingStyle}</Text>
                      </View>
                    </View>
                  )}
                  {p.bowlingStyle && (
                    <View style={[styles.styleChip, { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }]}>
                      <Text style={{ fontSize: 16 }}>🎯</Text>
                      <View>
                        <Text style={[styles.styleLabel, { color: colors.mutedForeground }]}>Bowling</Text>
                        <Text style={[styles.styleValue, { color: colors.text }]}>{p.bowlingStyle}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Additional info */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 12 }]}>Quick Stats</Text>
              {[
                { icon: 'users', label: 'Teams', val: p?.teamsCount ?? '—' },
                { icon: 'star', label: 'Rating', val: p?.overallRating ? `${(p.overallRating as number).toFixed(1)} ⭐` : '—' },
                { icon: 'shield', label: 'Fair Play', val: p?.fairPlayScore ? `${(p.fairPlayScore as number).toFixed(0)}/100` : '—' },
              ].map((row, i) => (
                <View key={i} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <View style={[styles.infoIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Feather name={row.icon as any} size={14} color={colors.primary} />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[styles.infoVal, { color: colors.text }]}>{row.val}</Text>
                </View>
              ))}
            </View>

            {/* Action */}
            {onInvite && (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onInvite(p);
                    onClose();
                  }}
                  style={styles.inviteBtn}
                >
                  <LinearGradient colors={['#F97316', '#EA580C']} style={styles.inviteBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="person-add" size={16} color="#fff" />
                    <Text style={styles.inviteBtnText}>Invite to Team</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: Platform.OS === 'web' ? 0 : 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 6 },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0F172A', borderRadius: 10 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroCity: { color: '#94A3B8', fontSize: 13 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16 },
  trustRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 15, fontWeight: '800' },
  trustValue: { fontSize: 15, fontWeight: '900' },
  trustBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  trustBarFill: { height: '100%', borderRadius: 4 },
  trustHint: { fontSize: 12 },
  statsGrid: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statEmoji: { fontSize: 20 },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLab: { fontSize: 11, fontWeight: '600' },
  styleRow: { flexDirection: 'row', gap: 10 },
  styleChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  styleLabel: { fontSize: 10, fontWeight: '600' },
  styleValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  infoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  infoVal: { fontSize: 13, fontWeight: '700' },
  actions: { marginHorizontal: 16, marginTop: 16 },
  inviteBtn: { borderRadius: 14, overflow: 'hidden' },
  inviteBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  inviteBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
