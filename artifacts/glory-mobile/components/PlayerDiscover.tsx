import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useListPlayers, useListTurfs, useFetchTurfSlotAvailability } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import PlayerProfileModal from './PlayerProfileModal';
import TeamsScreen from './TeamsScreen';
import { useRazorpayCheckout } from './RazorpayCheckout';

const ROLES: { label: string; apiValue?: string }[] = [
  { label: 'All' },
  { label: 'Batsman', apiValue: 'batsman' },
  { label: 'Bowler', apiValue: 'bowler' },
  { label: 'All-rounder', apiValue: 'all_rounder' },
  { label: 'Keeper', apiValue: 'wicket_keeper' },
];
const TABS = ['Players', 'Teams', 'Turfs'];

export default function PlayerDiscover() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Players' | 'Teams' | 'Turfs'>('Players');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Player profile modal
  const [profilePlayerId, setProfilePlayerId] = useState<number | null>(null);
  const [profilePlayerName, setProfilePlayerName] = useState<string | undefined>(undefined);

  // Turf booking state
  const [expandedTurf, setExpandedTurf] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!);
  const { openCheckout, isPending: paymentPending, RazorpayWebViewModal } = useRazorpayCheckout();
  const [successBooking, setSuccessBooking] = useState<any>(null);
  const { data: slots, isLoading: loadingSlots } = useFetchTurfSlotAvailability(
    expandedTurf ?? 0,
    selectedDate,
    { query: { enabled: !!expandedTurf } as any }
  );

  const selectedRole = ROLES.find(r => r.label === roleFilter);

  const { data: playersResp, isLoading: loadingPlayers } = useListPlayers({
    search: search.length >= 2 ? search : undefined,
    role: selectedRole?.apiValue,
    limit: 30,
  });
  const { data: turfs, isLoading: loadingTurfs } = useListTurfs({
    verified: true,
  });

  const players: any[] = (playersResp as any)?.players ?? (Array.isArray(playersResp) ? playersResp : []);

  const filteredTurfs = ((turfs as any[]) ?? []).filter((t: any) =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBook = (turf: any, slot: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openCheckout(
      {
        turfId: turf.id,
        turfName: turf.name,
        date: selectedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        pricePerHour: slot.price ?? turf.pricePerHour,
      },
      (result) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessBooking({ ...result.booking, turfName: turf.name, slot });
      },
      (msg) => {
        if (msg !== 'Payment cancelled') {
          Alert.alert('Payment Failed', msg);
        }
      },
    );
  };

  const openProfile = useCallback((id: number, name?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfilePlayerName(name);
    setProfilePlayerId(id);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Discover</Text>

        {/* Only show search bar for Players and Turfs tabs */}
        {activeTab !== 'Teams' && (
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={activeTab === 'Players' ? 'Search players, city...' : 'Search turfs, city...'}
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        )}

        {/* Tab bar */}
        <View style={[styles.tabRow, { backgroundColor: colors.card }]}>
          {TABS.map(t => (
            <Pressable
              key={t}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(t as any); setSearch(''); }}
              style={[styles.tabBtn, activeTab === t && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.tabText, { color: activeTab === t ? '#fff' : colors.mutedForeground }]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {/* Role chips (Players tab only) */}
        {activeTab === 'Players' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
            {ROLES.map(r => (
              <Pressable
                key={r.label}
                onPress={() => { Haptics.selectionAsync(); setRoleFilter(r.label); }}
                style={[styles.chip, {
                  backgroundColor: roleFilter === r.label ? colors.primary : colors.card,
                  borderColor: roleFilter === r.label ? colors.primary : colors.border,
                }]}
              >
                <Text style={[styles.chipText, { color: roleFilter === r.label ? '#fff' : colors.text }]}>{r.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Teams tab renders its own full-height view */}
      {activeTab === 'Teams' ? (
        <TeamsScreen />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {activeTab === 'Players' ? (
            loadingPlayers ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
            ) : players.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40 }}>🔍</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No players found</Text>
                {search.length > 0 && (
                  <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>Try a shorter search term</Text>
                )}
              </View>
            ) : (
              players.map((p: any) => (
                <View key={p.id} style={[styles.playerCard, { backgroundColor: colors.card }]}>
                  <View style={styles.playerTop}>
                    <Pressable onPress={() => openProfile(p.id, p.name)}>
                      <View style={[styles.avatar, { backgroundColor: colors.primary + '25' }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>
                          {(p.name?.[0] ?? '?').toUpperCase()}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Pressable onPress={() => openProfile(p.id, p.name)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.playerName, { color: colors.text }]}>{p.name}</Text>
                          {p.isVerified && <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />}
                        </View>
                      </Pressable>
                      <Text style={[styles.playerMeta, { color: colors.mutedForeground }]}>
                        {p.playerRole?.replace('_', ' ') ?? 'All-rounder'} · 📍 {p.city ?? 'India'}
                      </Text>
                      {(p.battingStyle || p.bowlingStyle) && (
                        <Text style={[styles.playerStyle, { color: colors.mutedForeground }]}>
                          {[p.battingStyle, p.bowlingStyle].filter(Boolean).join(' · ')}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[styles.availChip, {
                        backgroundColor: p.availabilityStatus && p.availabilityStatus !== 'unavailable' ? '#10B98120' : '#64748B20',
                        borderColor: p.availabilityStatus && p.availabilityStatus !== 'unavailable' ? '#10B981' : '#64748B',
                      }]}>
                        <Text style={[styles.availText, { color: p.availabilityStatus && p.availabilityStatus !== 'unavailable' ? '#10B981' : '#64748B' }]}>
                          {p.availabilityStatus && p.availabilityStatus !== 'unavailable' ? '● Available' : '○ Away'}
                        </Text>
                      </View>
                      <Text style={[styles.trustScore, { color: '#F59E0B' }]}>⭐ {p.overallRating?.toFixed(1) ?? '0.0'}</Text>
                    </View>
                  </View>
                  {(p.matchesCount != null || p.teamsCount != null) && (
                    <View style={[styles.playerStats, { borderTopColor: colors.border }]}>
                      {p.matchesCount != null && (
                        <Text style={[styles.playerStatItem, { color: colors.mutedForeground }]}>🏏 {p.matchesCount} matches</Text>
                      )}
                      {p.teamsCount != null && (
                        <Text style={[styles.playerStatItem, { color: colors.mutedForeground }]}>👥 {p.teamsCount} teams</Text>
                      )}
                      {p.fairPlayScore != null && (
                        <Text style={[styles.playerStatItem, { color: '#10B981' }]}>Fair Play: {p.fairPlayScore?.toFixed(0)}</Text>
                      )}
                    </View>
                  )}
                  <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.playerActions}>
                    <Pressable
                      onPress={() => openProfile(p.id, p.name)}
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    >
                      <Ionicons name="person" size={14} color="#fff" />
                      <Text style={styles.actionBtnText}>View Profile</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Invite Sent! 🎉', `${p.name} has been invited to your team!`);
                      }}
                      style={[styles.actionBtnOutline, { borderColor: colors.border }]}
                    >
                      <Ionicons name="person-add-outline" size={14} color={colors.primary} />
                      <Text style={[styles.actionBtnOutlineText, { color: colors.primary }]}>Invite</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )
          ) : (
            loadingTurfs ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
            ) : filteredTurfs.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40 }}>🏟️</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No turfs found</Text>
              </View>
            ) : (
              filteredTurfs.map((t: any) => (
                <View key={t.id} style={[styles.turfCard, { backgroundColor: colors.card }]}>
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); setExpandedTurf(expandedTurf === t.id ? null : t.id); }}
                    style={styles.turfTop}
                  >
                    <View style={[styles.turfIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={{ fontSize: 28 }}>🏟️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={[styles.turfName, { color: colors.text }]}>{t.name}</Text>
                        {t.verificationStatus === 'verified' && (
                          <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓</Text></View>
                        )}
                      </View>
                      <Text style={[styles.turfCity, { color: colors.mutedForeground }]}>📍 {t.city}</Text>
                      <View style={styles.sportsRow}>
                        {(t.sports ?? []).map((s: string) => (
                          <View key={s} style={[styles.sportChip, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={[styles.sportChipText, { color: colors.primary }]}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={[styles.turfPrice, { color: colors.primary }]}>₹{t.pricePerHour}</Text>
                      <Text style={[styles.turfPriceLabel, { color: colors.mutedForeground }]}>per hr</Text>
                      <Text style={[styles.turfTime, { color: colors.mutedForeground }]}>{t.openTime}–{t.closeTime}</Text>
                      <Ionicons name={expandedTurf === t.id ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} style={{ marginTop: 4 }} />
                    </View>
                  </Pressable>

                  {expandedTurf === t.id && (
                    <View style={[styles.slotSection, { borderTopColor: colors.border }]}>
                      <Text style={[styles.slotTitle, { color: colors.text }]}>
                        📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                        {Array.from({ length: 7 }).map((_, i) => {
                          const d = new Date(); d.setDate(d.getDate() + i);
                          const ds = d.toISOString().split('T')[0]!;
                          const isSel = ds === selectedDate;
                          return (
                            <Pressable
                              key={i}
                              onPress={() => { Haptics.selectionAsync(); setSelectedDate(ds); }}
                              style={[styles.dateBtn, { backgroundColor: isSel ? colors.primary : colors.background }]}
                            >
                              <Text style={[styles.dateBtnDay, { color: isSel ? '#fff' : colors.mutedForeground }]}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}
                              </Text>
                              <Text style={[styles.dateBtnNum, { color: isSel ? '#fff' : colors.text }]}>{d.getDate()}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                      {loadingSlots ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <View style={styles.slotGrid}>
                          {((slots as any[]) ?? []).map((slot: any, i: number) => (
                            <Pressable
                              key={i}
                              disabled={!slot.isAvailable || paymentPending}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handleBook(t, slot);
                              }}
                              style={[styles.slotChip, {
                                backgroundColor: slot.isAvailable ? colors.primary + '15' : colors.muted,
                                borderColor: slot.isAvailable ? colors.primary : colors.border,
                                opacity: slot.isAvailable ? 1 : 0.5,
                              }]}
                            >
                              {paymentPending ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                              ) : (
                                <>
                                  <Text style={[styles.slotTime, { color: slot.isAvailable ? colors.primary : colors.mutedForeground }]}>
                                    {slot.startTime}
                                  </Text>
                                  <Text style={[styles.slotPrice, { color: slot.isAvailable ? colors.primary : colors.mutedForeground, fontWeight: '700' }]}>
                                    {slot.isAvailable ? `Pay ₹${slot.price ?? t.pricePerHour}` : 'Booked'}
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          ))}
                          {((slots as any[]) ?? []).length === 0 && (
                            <Text style={[styles.noSlots, { color: colors.mutedForeground }]}>No slots available on this date</Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* Player Profile Modal */}
      <PlayerProfileModal
        playerId={profilePlayerId}
        playerName={profilePlayerName}
        onClose={() => setProfilePlayerId(null)}
        onInvite={(player) => {
          Alert.alert('Invite Sent! 🎉', `${player?.name ?? 'Player'} has been invited to your team!`);
        }}
      />

      {/* Native Razorpay WebView Modal */}
      <RazorpayWebViewModal />

      {/* Payment Success Modal */}
      <Modal visible={!!successBooking} animationType="fade" transparent onRequestClose={() => setSuccessBooking(null)}>
        <View style={styles.successOverlay}>
          <View style={[styles.successCard, { backgroundColor: colors.card }]}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </LinearGradient>
            <Text style={[styles.successTitle, { color: colors.text }]}>Booking Confirmed! 🎉</Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              {successBooking?.turfName}
            </Text>
            <View style={[styles.successDetails, { backgroundColor: colors.background }]}>
              {[
                { label: 'Date', val: successBooking?.date },
                { label: 'Time', val: `${successBooking?.startTime} – ${successBooking?.endTime}` },
                { label: 'Amount Paid', val: `₹${successBooking?.totalAmount}` },
                { label: 'Payment ID', val: successBooking?.razorpayPaymentId?.slice(0, 20) + '...' },
              ].map((row, i) => (
                <View key={i} style={[styles.successRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={[styles.successRowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[styles.successRowVal, { color: colors.text }]}>{row.val}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => setSuccessBooking(null)} style={styles.successDoneBtn}>
              <LinearGradient colors={['#F97316', '#EA580C']} style={styles.successDoneBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.successDoneBtnText}>Done</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  title: { fontSize: 28, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 46, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  tabRow: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptyHint: { fontSize: 12 },
  playerCard: { borderRadius: 16, padding: 14, marginBottom: 12 },
  playerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800' },
  playerName: { fontSize: 15, fontWeight: '800' },
  playerMeta: { fontSize: 12, marginTop: 2 },
  playerStyle: { fontSize: 11, marginTop: 2 },
  availChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  availText: { fontSize: 10, fontWeight: '700' },
  trustScore: { fontSize: 12, fontWeight: '700' },
  playerStats: { flexDirection: 'row', gap: 12, paddingTop: 8, marginTop: 8, borderTopWidth: 1, flexWrap: 'wrap' },
  playerStatItem: { fontSize: 11, fontWeight: '600' },
  cardDivider: { height: 1, marginVertical: 10 },
  playerActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, flex: 1, justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionBtnOutline: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 6 },
  actionBtnOutlineText: { fontSize: 13, fontWeight: '600' },
  turfCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  turfTop: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  turfIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  turfName: { fontSize: 15, fontWeight: '800', flex: 1 },
  verifiedBadge: { backgroundColor: '#10B98120', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  turfCity: { fontSize: 12, marginBottom: 6 },
  sportsRow: { flexDirection: 'row', gap: 6 },
  sportChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sportChipText: { fontSize: 10, fontWeight: '700' },
  turfPrice: { fontSize: 18, fontWeight: '900' },
  turfPriceLabel: { fontSize: 10 },
  turfTime: { fontSize: 11, marginTop: 4 },
  slotSection: { borderTopWidth: 1, padding: 14 },
  slotTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  dateBtn: { width: 44, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dateBtnDay: { fontSize: 10, fontWeight: '600' },
  dateBtnNum: { fontSize: 16, fontWeight: '900' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { width: '30%', padding: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 2 },
  slotTime: { fontSize: 13, fontWeight: '800' },
  slotPrice: { fontSize: 10 },
  noSlots: { fontSize: 13, paddingVertical: 20 },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  successCard: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 28, alignItems: 'center', gap: 12 },
  successIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  successSub: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  successDetails: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  successRowLabel: { fontSize: 13 },
  successRowVal: { fontSize: 13, fontWeight: '700' },
  successDoneBtn: { width: '100%', marginTop: 8 },
  successDoneBtnGrad: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  successDoneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
