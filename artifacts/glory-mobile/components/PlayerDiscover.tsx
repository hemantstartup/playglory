import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useListPlayers, useListTurfs } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const ROLES = ['All', 'Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper'];
const TABS = ['Players', 'Turfs'];

export default function PlayerDiscover() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Players' | 'Turfs'>('Players');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const { data: playersResp, isLoading: loadingPlayers } = useListPlayers({ available: true });
  const { data: turfs, isLoading: loadingTurfs } = useListTurfs({});

  const players: any[] = (playersResp as any)?.players ?? (Array.isArray(playersResp) ? playersResp : []);

  const filteredPlayers = players.filter((p: any) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || p.playerRole?.toLowerCase().includes(roleFilter.toLowerCase().replace('-', '_').replace(' ', '_'));
    return matchSearch && matchRole;
  });

  const filteredTurfs = ((turfs as any[]) ?? []).filter((t: any) =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Discover</Text>
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
        <View style={[styles.tabRow, { backgroundColor: colors.card }]}>
          {TABS.map(t => (
            <Pressable
              key={t}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(t as any); }}
              style={[styles.tabBtn, activeTab === t && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.tabText, { color: activeTab === t ? '#fff' : colors.mutedForeground }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        {activeTab === 'Players' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
            {ROLES.map(r => (
              <Pressable
                key={r}
                onPress={() => { Haptics.selectionAsync(); setRoleFilter(r); }}
                style={[styles.chip, {
                  backgroundColor: roleFilter === r ? colors.primary : colors.card,
                  borderColor: roleFilter === r ? colors.primary : colors.border,
                }]}
              >
                <Text style={[styles.chipText, { color: roleFilter === r ? '#fff' : colors.text }]}>{r}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'Players' ? (
          loadingPlayers ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
          ) : filteredPlayers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 40 }}>🔍</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No players found</Text>
            </View>
          ) : (
            filteredPlayers.map((p: any) => (
              <View key={p.id} style={[styles.playerCard, { backgroundColor: colors.card }]}>
                <View style={styles.playerTop}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary + '25' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {(p.name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.playerName, { color: colors.text }]}>{p.name}</Text>
                    <Text style={[styles.playerMeta, { color: colors.mutedForeground }]}>
                      {p.playerRole?.replace('_', ' ') ?? 'All-rounder'} · 📍 {p.city ?? 'India'}
                    </Text>
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
                    <Text style={[styles.trustScore, { color: '#F59E0B' }]}>⭐ {p.trustScore ?? 0}</Text>
                  </View>
                </View>
                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                <View style={styles.playerActions}>
                  <Pressable
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert('Invite Sent', `${p.name} has been invited!`);
                    }}
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="person-add" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Invite</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => Alert.alert('Profile', `Viewing ${p.name}'s profile`)}
                    style={[styles.actionBtnOutline, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>View Profile</Text>
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
            (filteredTurfs as any[]).map((t: any) => (
              <View key={t.id} style={[styles.turfCard, { backgroundColor: colors.card }]}>
                <View style={styles.turfTop}>
                  <View style={[styles.turfIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={{ fontSize: 28 }}>🏟️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.turfName, { color: colors.text }]}>{t.name}</Text>
                    <Text style={[styles.turfCity, { color: colors.mutedForeground }]}>📍 {t.city}</Text>
                    <View style={styles.sportsRow}>
                      {(t.sports ?? []).map((s: string) => (
                        <View key={s} style={[styles.sportChip, { backgroundColor: colors.primary + '15' }]}>
                          <Text style={[styles.sportChipText, { color: colors.primary }]}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.turfPrice, { color: colors.primary }]}>₹{t.pricePerHour}</Text>
                    <Text style={[styles.turfPriceLabel, { color: colors.mutedForeground }]}>per hr</Text>
                    <Text style={[styles.turfTime, { color: colors.mutedForeground }]}>{t.openTime}–{t.closeTime}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => Alert.alert('Book Turf', `Booking flow for ${t.name} coming soon!`)}
                  style={[styles.bookBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="calendar" size={14} color="#fff" />
                  <Text style={styles.bookBtnText}>Book Slot</Text>
                </Pressable>
              </View>
            ))
          )
        )}
      </ScrollView>
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
  playerCard: { borderRadius: 16, padding: 14, marginBottom: 12 },
  playerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800' },
  playerName: { fontSize: 15, fontWeight: '800' },
  playerMeta: { fontSize: 12, marginTop: 2 },
  availChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  availText: { fontSize: 10, fontWeight: '700' },
  trustScore: { fontSize: 12, fontWeight: '700' },
  cardDivider: { height: 1, marginVertical: 10 },
  playerActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, flex: 1, justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionBtnOutline: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  actionBtnOutlineText: { fontSize: 13, fontWeight: '600' },
  turfCard: { borderRadius: 16, padding: 14, marginBottom: 12 },
  turfTop: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  turfIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  turfName: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  turfCity: { fontSize: 12, marginBottom: 6 },
  sportsRow: { flexDirection: 'row', gap: 6 },
  sportChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sportChipText: { fontSize: 10, fontWeight: '700' },
  turfPrice: { fontSize: 18, fontWeight: '900' },
  turfPriceLabel: { fontSize: 10 },
  turfTime: { fontSize: 11, marginTop: 4 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12 },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
