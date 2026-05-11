import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useListBookings } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates() {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - 3);
    return d;
  });
}

export default function TurfBookings() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, refetch } = useListBookings();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const weekDates = getWeekDates();

  const filteredByDate = bookings?.filter(b => b.date === selectedDate) ?? [];
  const filtered = filter === 'all' ? filteredByDate : filteredByDate.filter(b => b.status === filter);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = bookings?.filter(b => b.date === todayStr).length ?? 0;
  const upcomingCount = bookings?.filter(b => b.date! > todayStr!).length ?? 0;
  const confirmedCount = bookings?.filter(b => b.status === 'confirmed').length ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Booking Calendar</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Manage incoming bookings</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        {[
          { label: "Today", value: todayCount, color: colors.primary },
          { label: "Upcoming", value: upcomingCount, color: '#3B82F6' },
          { label: "Confirmed", value: confirmedCount, color: '#10B981' },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Week Calendar Strip */}
      <View style={[styles.weekStrip, { backgroundColor: colors.card }]}>
        {weekDates.map((d, i) => {
          const dateStr = d.toISOString().split('T')[0]!;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const dayBookings = bookings?.filter(b => b.date === dateStr).length ?? 0;
          return (
            <Pressable
              key={i}
              onPress={() => { Haptics.selectionAsync(); setSelectedDate(dateStr); }}
              style={[styles.dayCell, isSelected && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.dayCellDay, { color: isSelected ? '#fff' : colors.mutedForeground }]}>
                {WEEKDAYS[d.getDay()]}
              </Text>
              <Text style={[styles.dayCellDate, { color: isSelected ? '#fff' : isToday ? colors.primary : colors.text }]}>
                {d.getDate()}
              </Text>
              {dayBookings > 0 && (
                <View style={[styles.dayCellDot, { backgroundColor: isSelected ? '#fff' : colors.primary }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterTabs, { backgroundColor: colors.card }]}>
        {(['all', 'confirmed', 'cancelled'] as const).map(f => (
          <Pressable
            key={f}
            onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
            style={[styles.filterTab, filter === f && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.filterTabText, { color: filter === f ? '#fff' : colors.mutedForeground }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Bookings for selected day */}
      <View style={styles.bookingSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No bookings on this day</Text>
          </View>
        ) : (
          filtered.map(b => (
            <View key={b.id} style={[styles.bookingCard, { backgroundColor: colors.card }]}>
              <View style={styles.bookingTop}>
                <LinearGradient
                  colors={b.status === 'confirmed' ? ['#10B98120', '#10B98108'] : ['#EF444420', '#EF444408']}
                  style={styles.timeBlock}
                >
                  <Text style={[styles.timeStart, { color: b.status === 'confirmed' ? '#10B981' : '#EF4444' }]}>
                    {b.startTime}
                  </Text>
                  <Text style={[styles.timeDivider, { color: colors.mutedForeground }]}>–</Text>
                  <Text style={[styles.timeEnd, { color: colors.mutedForeground }]}>{b.endTime}</Text>
                </LinearGradient>

                <View style={styles.bookingMid}>
                  <View style={styles.playerRow}>
                    <View style={[styles.playerAvatar, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.playerAvatarText, { color: colors.primary }]}>
                        {(b.userName?.[0] || '?').toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.playerName, { color: colors.text }]}>{b.userName || 'Player'}</Text>
                      <Text style={[styles.turfName, { color: colors.mutedForeground }]}>{b.turfName}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.bookingRight}>
                  <Text style={[styles.amount, { color: '#10B981' }]}>₹{b.totalAmount}</Text>
                  <View style={[styles.statusBadge, {
                    backgroundColor: b.status === 'confirmed' ? '#10B98120' : '#EF444420'
                  }]}>
                    <Text style={[styles.statusText, {
                      color: b.status === 'confirmed' ? '#10B981' : '#EF4444'
                    }]}>
                      {b.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {b.matchId && (
                <View style={[styles.matchLinked, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                  <Ionicons name="trophy-outline" size={14} color={colors.primary} />
                  <Text style={[styles.matchLinkedText, { color: colors.primary }]}>Match linked to this booking</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, marginTop: 2 },
  weekStrip: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 16, padding: 8, marginBottom: 12, gap: 4 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, gap: 2 },
  dayCellDay: { fontSize: 9, fontWeight: '600' },
  dayCellDate: { fontSize: 15, fontWeight: '900' },
  dayCellDot: { width: 5, height: 5, borderRadius: 3 },
  filterTabs: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterTabText: { fontSize: 12, fontWeight: '700' },
  bookingSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  bookingCard: { borderRadius: 16, padding: 14, marginBottom: 12 },
  bookingTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  timeBlock: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  timeStart: { fontSize: 14, fontWeight: '900' },
  timeDivider: { fontSize: 10 },
  timeEnd: { fontSize: 11 },
  bookingMid: { flex: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  playerAvatarText: { fontSize: 14, fontWeight: '800' },
  playerName: { fontSize: 14, fontWeight: '700' },
  turfName: { fontSize: 11, marginTop: 2 },
  bookingRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 16, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '800' },
  matchLinked: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, borderRadius: 10, borderWidth: 1 },
  matchLinkedText: { fontSize: 12, fontWeight: '600' },
});
