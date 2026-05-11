import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import {
  useListTeams, useGetTeam, useCreateTeam,
  useJoinTeam, useUpdateTeamMember, useGetMe,
} from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

const SPORT_OPTIONS = ['Cricket', 'Football', 'Badminton', 'Basketball'];

// ─── Team Card ────────────────────────────────────────────────────────────────
function TeamCard({ team, myId, onOpen }: { team: any; myId?: number; onOpen: () => void }) {
  const colors = useColors();
  const isCaptain = team.captainId === myId;
  const winRate = team.matchCount > 0 ? Math.round((team.winCount / team.matchCount) * 100) : 0;

  return (
    <Pressable onPress={onOpen} style={[styles.teamCard, { backgroundColor: colors.card }]}>
      <View style={styles.teamCardTop}>
        <View style={[styles.teamAvatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={styles.teamAvatarText}>{(team.name?.[0] ?? 'T').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{team.name}</Text>
            {isCaptain && (
              <View style={[styles.captainBadge, { backgroundColor: '#F9731620', borderColor: '#F97316' }]}>
                <Text style={styles.captainText}>👑 Captain</Text>
              </View>
            )}
          </View>
          <Text style={[styles.teamMeta, { color: colors.mutedForeground }]}>
            {team.sport ?? 'Cricket'} · {team.city ?? 'India'} · {team.memberCount ?? 0} members
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>

      <View style={[styles.teamStats, { borderTopColor: colors.border }]}>
        {[
          { label: 'Matches', val: team.matchCount ?? 0, emoji: '🏏' },
          { label: 'Wins', val: team.winCount ?? 0, emoji: '🏆' },
          { label: 'Win Rate', val: `${winRate}%`, emoji: '📊' },
          { label: 'Members', val: team.memberCount ?? 0, emoji: '👥' },
        ].map((s, i) => (
          <View key={i} style={styles.teamStat}>
            <Text style={styles.teamStatEmoji}>{s.emoji}</Text>
            <Text style={[styles.teamStatVal, { color: colors.text }]}>{s.val}</Text>
            <Text style={[styles.teamStatLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

// ─── Team Detail Modal ────────────────────────────────────────────────────────
function TeamDetailModal({ teamId, myId, onClose }: { teamId: number | null; myId?: number; onClose: () => void }) {
  const colors = useColors();
  const { data: team, isLoading, refetch } = useGetTeam(teamId ?? 0, {
    query: { enabled: !!teamId } as any,
  });
  const joinTeam = useJoinTeam();
  const updateMember = useUpdateTeamMember();

  const t = team as any;
  const isCaptain = t?.captainId === myId;
  const members: any[] = t?.members ?? [];
  const activeMembers = members.filter((m: any) => m.status === 'active');
  const pendingMembers = members.filter((m: any) => m.status === 'pending');
  const myMembership = members.find((m: any) => m.userId === myId);
  const alreadyMember = myMembership?.status === 'active';
  const pendingJoin = myMembership?.status === 'pending';

  const handleJoin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await joinTeam.mutateAsync({ teamId: teamId! });
      refetch();
      Alert.alert('Request Sent! 🎉', 'Your join request has been sent to the captain.');
    } catch (e: any) {
      Alert.alert('Error', e?.data?.error ?? e?.message ?? 'Failed to send join request');
    }
  };

  const handleMemberAction = async (memberId: number, status: 'active' | 'rejected') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateMember.mutateAsync({ teamId: teamId!, memberId, data: { status } });
      refetch();
    } catch (e: any) {
      Alert.alert('Error', e?.data?.error ?? e?.message ?? 'Failed to update member');
    }
  };

  return (
    <Modal visible={!!teamId} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Team Details</Text>
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
            <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.detailHero}>
              <View style={[styles.teamAvatarLarge, { backgroundColor: colors.primary + '25' }]}>
                <Text style={styles.teamAvatarLargeText}>{(t?.name?.[0] ?? 'T').toUpperCase()}</Text>
              </View>
              <Text style={styles.detailName}>{t?.name}</Text>
              <Text style={styles.detailSub}>
                {t?.sport ?? 'Cricket'} · {t?.city ?? 'India'} · Captain: {t?.captainName ?? '—'}
              </Text>
              <View style={styles.chipRow}>
                {isCaptain && (
                  <View style={[styles.chip, { backgroundColor: '#F9731625', borderColor: '#F97316' }]}>
                    <Text style={[styles.chipText, { color: '#F97316' }]}>👑 You are Captain</Text>
                  </View>
                )}
                {alreadyMember && !isCaptain && (
                  <View style={[styles.chip, { backgroundColor: '#10B98125', borderColor: '#10B981' }]}>
                    <Text style={[styles.chipText, { color: '#10B981' }]}>✓ Member</Text>
                  </View>
                )}
                {pendingJoin && (
                  <View style={[styles.chip, { backgroundColor: '#F59E0B25', borderColor: '#F59E0B' }]}>
                    <Text style={[styles.chipText, { color: '#F59E0B' }]}>⏳ Request Pending</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Stats */}
            <View style={[styles.statsRow, { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 12, borderRadius: 16 }]}>
              {[
                { val: t?.matchCount ?? 0, label: 'Matches', emoji: '🏏' },
                { val: t?.winCount ?? 0, label: 'Wins', emoji: '🏆' },
                { val: activeMembers.length, label: 'Players', emoji: '👥' },
              ].map((s, i) => (
                <View key={i} style={[styles.statCell, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                  <Text style={styles.statEmoji}>{s.emoji}</Text>
                  <Text style={[styles.statVal, { color: colors.text }]}>{s.val}</Text>
                  <Text style={[styles.statLab, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Join button */}
            {!alreadyMember && !isCaptain && !pendingJoin && (
              <Pressable
                onPress={handleJoin}
                disabled={joinTeam.isPending}
                style={[styles.joinBtnWrap, { marginHorizontal: 16, marginTop: 12 }]}
              >
                <LinearGradient colors={['#F97316', '#EA580C']} style={styles.joinBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {joinTeam.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                      <Ionicons name="person-add" size={16} color="#fff" />
                      <Text style={styles.joinBtnText}>Request to Join</Text>
                    </>
                  }
                </LinearGradient>
              </Pressable>
            )}

            {/* Pending requests (captain only) */}
            {isCaptain && pendingMembers.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>⏳ Join Requests</Text>
                  <View style={[styles.badge, { backgroundColor: '#F97316' }]}>
                    <Text style={styles.badgeText}>{pendingMembers.length}</Text>
                  </View>
                </View>
                {pendingMembers.map((m: any) => (
                  <View key={m.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: '#F9731620' }]}>
                      <Text style={[styles.memberAvatarText, { color: '#F97316' }]}>
                        {(m.userName?.[0] ?? '?').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberName, { color: colors.text }]}>{m.userName ?? `Player #${m.userId}`}</Text>
                      {m.playerRole && (
                        <Text style={[styles.memberRole, { color: colors.mutedForeground }]}>{m.playerRole.replace('_', ' ')}</Text>
                      )}
                    </View>
                    <View style={styles.memberActions}>
                      <Pressable
                        onPress={() => handleMemberAction(m.id, 'active')}
                        style={[styles.actionChip, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}
                      >
                        <Ionicons name="checkmark" size={14} color="#10B981" />
                        <Text style={[styles.actionChipText, { color: '#10B981' }]}>Accept</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleMemberAction(m.id, 'rejected')}
                        style={[styles.actionChip, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}
                      >
                        <Ionicons name="close" size={14} color="#EF4444" />
                        <Text style={[styles.actionChipText, { color: '#EF4444' }]}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Active Members */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
                👥 Squad ({activeMembers.length})
              </Text>
              {activeMembers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 32 }}>👥</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active members yet</Text>
                </View>
              ) : (
                activeMembers.map((m: any, i: number) => (
                  <View
                    key={m.id}
                    style={[styles.memberRow, i < activeMembers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.memberAvatarText, { color: colors.primary }]}>
                        {(m.userName?.[0] ?? '?').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.memberName, { color: colors.text }]}>{m.userName ?? `Player #${m.userId}`}</Text>
                        {m.userId === t?.captainId && (
                          <Text style={{ fontSize: 12 }}>👑</Text>
                        )}
                      </View>
                      {m.playerRole && (
                        <Text style={[styles.memberRole, { color: colors.mutedForeground }]}>{m.playerRole.replace('_', ' ')}</Text>
                      )}
                    </View>
                    <View style={[styles.activeBadge, { backgroundColor: '#10B98120' }]}>
                      <Text style={[styles.activeBadgeText, { color: '#10B981' }]}>Active</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Create Team Modal ────────────────────────────────────────────────────────
function CreateTeamModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const colors = useColors();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [sport, setSport] = useState('Cricket');
  const createTeam = useCreateTeam();

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Team Name Required', 'Please enter a team name.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await createTeam.mutateAsync({ data: { name: name.trim(), city: city.trim() || undefined, sport } });
      setName(''); setCity(''); setSport('Cricket');
      onCreated();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.data?.error ?? e?.message ?? 'Failed to create team');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Create a Team</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Team Name *</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="shield" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Mumbai Strikers"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                />
              </View>
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>City (optional)</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Mumbai, Delhi, Bengaluru..."
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Sport</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {SPORT_OPTIONS.map(s => (
                  <Pressable
                    key={s}
                    onPress={() => { Haptics.selectionAsync(); setSport(s); }}
                    style={[styles.sportChip, {
                      backgroundColor: sport === s ? colors.primary : colors.card,
                      borderColor: sport === s ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[styles.sportChipText, { color: sport === s ? '#fff' : colors.text }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Preview</Text>
              <View style={styles.previewRow}>
                <View style={[styles.previewAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.previewAvatarText, { color: colors.primary }]}>
                    {(name[0] ?? 'T').toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.previewName, { color: colors.text }]}>{name || 'Your Team Name'}</Text>
                  <Text style={[styles.previewMeta, { color: colors.mutedForeground }]}>{sport} · {city || 'India'}</Text>
                </View>
              </View>
            </View>

            <Pressable onPress={handleCreate} disabled={createTeam.isPending} style={styles.createBtnWrap}>
              <LinearGradient colors={['#F97316', '#EA580C']} style={styles.createBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {createTeam.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.createBtnText}>Create Team</Text>
                  </>
                }
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Teams Screen ────────────────────────────────────────────────────────
export default function TeamsScreen() {
  const colors = useColors();
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: me } = useGetMe();
  const myId = (me as any)?.id;

  const { data: teams, isLoading, refetch } = useListTeams();
  const allTeams: any[] = (teams as any[]) ?? [];

  const myTeams = allTeams.filter((t: any) =>
    t.captainId === myId || (t.members ?? []).some((m: any) => m.userId === myId && m.status === 'active')
  );
  const displayed = activeFilter === 'mine' ? myTeams : allTeams;

  return (
    <View style={[styles.teamsRoot, { backgroundColor: colors.background }]}>
      {/* Filter + Create */}
      <View style={[styles.teamsHeader, { backgroundColor: colors.background }]}>
        <View style={[styles.filterRow, { backgroundColor: colors.card }]}>
          {[
            { key: 'all', label: `All Teams (${allTeams.length})` },
            { key: 'mine', label: `My Teams (${myTeams.length})` },
          ].map(f => (
            <Pressable
              key={f.key}
              onPress={() => { Haptics.selectionAsync(); setActiveFilter(f.key as any); }}
              style={[styles.filterBtn, activeFilter === f.key && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.filterBtnText, { color: activeFilter === f.key ? '#fff' : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setCreateOpen(true)} style={styles.createTeamBtn}>
          <LinearGradient colors={['#F97316', '#EA580C']} style={styles.createTeamBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createTeamBtnText}>New Team</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
        ) : displayed.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🏏</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeFilter === 'mine' ? "You're not in any team" : 'No teams yet'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {activeFilter === 'mine' ? 'Create a team or request to join one' : 'Be the first to create a team!'}
            </Text>
            <Pressable onPress={() => setCreateOpen(true)} style={styles.emptyCreateBtn}>
              <LinearGradient colors={['#F97316', '#EA580C']} style={styles.emptyCreateBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="add-circle" size={16} color="#fff" />
                <Text style={styles.emptyCreateText}>Create a Team</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          displayed.map((team: any) => (
            <TeamCard
              key={team.id}
              team={team}
              myId={myId}
              onOpen={() => setSelectedTeamId(team.id)}
            />
          ))
        )}
      </ScrollView>

      <TeamDetailModal
        teamId={selectedTeamId}
        myId={myId}
        onClose={() => setSelectedTeamId(null)}
      />

      <CreateTeamModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: Platform.OS === 'web' ? 0 : 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  teamsRoot: { flex: 1 },
  teamsHeader: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  filterRow: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  filterBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  filterBtnText: { fontSize: 12, fontWeight: '700' },
  createTeamBtn: { borderRadius: 12, overflow: 'hidden' },
  createTeamBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  createTeamBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  teamCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  teamCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  teamAvatar: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  teamAvatarText: { fontSize: 22, fontWeight: '900', color: '#F97316' },
  teamName: { fontSize: 15, fontWeight: '800' },
  captainBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  captainText: { fontSize: 10, fontWeight: '700', color: '#F97316' },
  teamMeta: { fontSize: 12, marginTop: 2 },
  teamStats: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10 },
  teamStat: { flex: 1, alignItems: 'center', gap: 2 },
  teamStatEmoji: { fontSize: 16 },
  teamStatVal: { fontSize: 15, fontWeight: '900' },
  teamStatLabel: { fontSize: 10, fontWeight: '600' },
  detailHero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 6 },
  teamAvatarLarge: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  teamAvatarLargeText: { fontSize: 32, fontWeight: '900', color: '#F97316' },
  detailName: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  detailSub: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', overflow: 'hidden' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statEmoji: { fontSize: 20 },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLab: { fontSize: 11, fontWeight: '600' },
  joinBtnWrap: { borderRadius: 14, overflow: 'hidden' },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 16, fontWeight: '800' },
  memberName: { fontSize: 14, fontWeight: '700' },
  memberRole: { fontSize: 11, marginTop: 2 },
  memberActions: { flexDirection: 'row', gap: 8 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  actionChipText: { fontSize: 11, fontWeight: '700' },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 260 },
  emptyCreateBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  emptyCreateBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  emptyCreateText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 48, borderRadius: 14, borderWidth: 1 },
  input: { flex: 1, fontSize: 15 },
  sportChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  sportChipText: { fontSize: 13, fontWeight: '700' },
  previewCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
  previewLabel: { fontSize: 11, fontWeight: '700', marginBottom: 10 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewAvatar: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewAvatarText: { fontSize: 20, fontWeight: '900' },
  previewName: { fontSize: 15, fontWeight: '800' },
  previewMeta: { fontSize: 12, marginTop: 2 },
  createBtnWrap: { borderRadius: 14, overflow: 'hidden' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
