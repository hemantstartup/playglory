import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useListBookings, useGetMyTurfs } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

type Period = 'today' | 'week' | 'month' | 'all';

function getStartDate(period: Period): string {
  const d = new Date();
  if (period === 'today') return d.toISOString().split('T')[0]!;
  if (period === 'week') { d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]!; }
  if (period === 'month') { d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]!; }
  return '2020-01-01';
}

function BarChart({ data, max, color }: { data: { label: string; value: number }[]; max: number; color: string }) {
  const colors = useColors();
  return (
    <View style={barStyles.container}>
      {data.map((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <View key={i} style={barStyles.bar}>
            <Text style={[barStyles.barValue, { color }]}>
              {item.value > 0 ? `₹${item.value >= 1000 ? (item.value / 1000).toFixed(1) + 'k' : item.value}` : ''}
            </Text>
            <View style={[barStyles.barBg, { backgroundColor: colors.muted }]}>
              <View style={[barStyles.barFill, { height: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
            </View>
            <Text style={[barStyles.barLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120, paddingHorizontal: 4 },
  bar: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9, fontWeight: '700', height: 16, textAlign: 'center' },
  barBg: { flex: 1, width: '100%', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 9, fontWeight: '600' },
});

export default function TurfEarnings() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('month');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, refetch } = useListBookings();
  const { data: myTurfs } = useGetMyTurfs();

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const todayStr = new Date().toISOString().split('T')[0]!;
  const startDate = getStartDate(period);
  const filtered = bookings?.filter(b => b.date && b.date >= startDate && b.status !== 'cancelled') ?? [];

  const totalEarnings = filtered.reduce((s, b) => s + (b.totalAmount ?? 0), 0);
  const todayEarnings = bookings?.filter(b => b.date === todayStr && b.status !== 'cancelled').reduce((s, b) => s + (b.totalAmount ?? 0), 0) ?? 0;
  const totalBookings = filtered.length;

  // Weekly chart: last 7 days
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0]!;
    const dayEarnings = bookings?.filter(b => b.date === dateStr && b.status !== 'cancelled').reduce((s, b) => s + (b.totalAmount ?? 0), 0) ?? 0;
    const day = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]!;
    return { label: day, value: dayEarnings };
  });
  const weeklyMax = Math.max(...weeklyData.map(d => d.value), 1);

  // Hourly popularity
  const slotCounts: Record<string, number> = {};
  bookings?.forEach(b => {
    if (b.startTime) slotCounts[b.startTime] = (slotCounts[b.startTime] ?? 0) + 1;
  });
  const popularSlots = Object.entries(slotCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxSlot = popularSlots[0]?.[1] ?? 1;

  // Per-turf breakdown
  const turfEarnings = (myTurfs ?? []).map(t => {
    const earn = filtered.filter(b => b.turfId === t.id).reduce((s, b) => s + (b.totalAmount ?? 0), 0);
    const count = filtered.filter(b => b.turfId === t.id).length;
    return { name: t.name, earn, count };
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>💰 Earnings</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Your revenue dashboard</Text>
      </View>

      {/* Period Selector */}
      <View style={[styles.periodRow, { backgroundColor: colors.card }]}>
        {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
          <Pressable
            key={p}
            onPress={() => { Haptics.selectionAsync(); setPeriod(p); }}
            style={[styles.periodBtn, period === p && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.periodText, { color: period === p ? '#fff' : colors.mutedForeground }]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Hero Earnings Card */}
      <LinearGradient colors={['#10B981', '#059669']} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.heroLabel}>
          {period === 'today' ? "Today's Earnings" : period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'All Time'}
        </Text>
        <Text style={styles.heroAmount}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatVal}>{totalBookings}</Text>
            <Text style={styles.heroStatLab}>Bookings</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatVal}>
              {totalBookings > 0 ? `₹${Math.round(totalEarnings / totalBookings)}` : '₹0'}
            </Text>
            <Text style={styles.heroStatLab}>Avg/Booking</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatVal}>₹{todayEarnings}</Text>
            <Text style={styles.heroStatLab}>Today</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Weekly Bar Chart */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>📈 Last 7 Days</Text>
        <BarChart data={weeklyData} max={weeklyMax} color={colors.primary} />
      </View>

      {/* Popular Slots */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>⏰ Popular Slots</Text>
        {popularSlots.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data yet</Text>
        ) : (
          popularSlots.map(([slot, count], i) => {
            const pct = maxSlot > 0 ? (count / maxSlot) * 100 : 0;
            return (
              <View key={slot} style={styles.slotRow}>
                <Text style={[styles.slotRank, { color: colors.primary }]}>#{i + 1}</Text>
                <Text style={[styles.slotTime, { color: colors.text }]}>{slot}</Text>
                <View style={[styles.slotBarBg, { backgroundColor: colors.muted }]}>
                  <View style={[styles.slotBarFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.slotCount, { color: colors.primary }]}>{count}×</Text>
              </View>
            );
          })
        )}
      </View>

      {/* Per-Turf Breakdown */}
      {turfEarnings.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>🏟️ By Turf</Text>
          {turfEarnings.map((t, i) => (
            <View key={i} style={[styles.turfRow, i < turfEarnings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.turfIcon, { backgroundColor: colors.primary + '20' }]}>
                <Text style={{ fontSize: 18 }}>🏟️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.turfName, { color: colors.text }]}>{t.name}</Text>
                <Text style={[styles.turfCount, { color: colors.mutedForeground }]}>{t.count} bookings</Text>
              </View>
              <Text style={[styles.turfEarn, { color: '#10B981' }]}>₹{t.earn.toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Transactions */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>🧾 Recent Transactions</Text>
        {filtered.slice(0, 8).length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions yet</Text>
        ) : (
          filtered.slice(0, 8).map((b, i) => (
            <View key={b.id} style={[styles.txRow, i < Math.min(filtered.length, 8) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.txIcon, { backgroundColor: '#10B98120' }]}>
                <Text style={{ fontSize: 16 }}>💳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txName, { color: colors.text }]}>{b.userName || 'Player'}</Text>
                <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>{b.date} · {b.startTime} – {b.endTime}</Text>
              </View>
              <Text style={[styles.txAmount, { color: '#10B981' }]}>+₹{b.totalAmount}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13, marginTop: 2 },
  periodRow: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  periodText: { fontSize: 12, fontWeight: '700' },
  heroCard: { marginHorizontal: 16, borderRadius: 24, padding: 24, marginBottom: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  heroAmount: { color: '#fff', fontSize: 36, fontWeight: '900', fontFamily: 'Inter_700Bold', marginTop: 6, marginBottom: 16 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between' },
  heroStatItem: { alignItems: 'center' },
  heroStatVal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroStatLab: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  slotRank: { fontSize: 12, fontWeight: '800', width: 20 },
  slotTime: { fontSize: 13, fontWeight: '700', width: 52 },
  slotBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  slotBarFill: { height: '100%', borderRadius: 4 },
  slotCount: { fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },
  turfRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  turfIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  turfName: { fontSize: 14, fontWeight: '700' },
  turfCount: { fontSize: 12, marginTop: 2 },
  turfEarn: { fontSize: 16, fontWeight: '800' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txName: { fontSize: 14, fontWeight: '600' },
  txMeta: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});
