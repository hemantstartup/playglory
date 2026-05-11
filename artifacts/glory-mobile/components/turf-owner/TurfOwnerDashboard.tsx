import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetMe, useGetMyTurfs, useGetTurfDashboard, useListBookings } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

function StatCard({ emoji, value, label, sub, color }: { emoji: string; value: string | number; label: string; sub?: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card }]}>
      <Text style={statStyles.emoji}>{emoji}</Text>
      <Text style={[statStyles.value, { color: color ?? colors.primary }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {sub ? <Text style={[statStyles.sub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  emoji: { fontSize: 24 },
  value: { fontSize: 22, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  sub: { fontSize: 10, textAlign: 'center' },
});

export default function TurfOwnerDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: me } = useGetMe();
  const { data: myTurfs, isLoading: loadingTurfs, refetch: refetchTurfs } = useGetMyTurfs();
  const firstTurf = myTurfs?.[0];
  const { data: dashboard, isLoading: loadingDash, refetch: refetchDash } = useGetTurfDashboard(
    firstTurf?.id ?? 0,
    { query: { enabled: !!firstTurf?.id } as any }
  );
  const { data: bookings, refetch: refetchBookings } = useListBookings();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTurfs(), refetchDash(), refetchBookings()]);
    setRefreshing(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings?.filter(b => b.date === today) ?? [];
  const totalEarnings = bookings?.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0) ?? 0;
  const todayEarnings = todayBookings.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>Turf Owner Dashboard</Text>
            <Text style={styles.headerName}>Welcome, {me?.name?.split(' ')[0] ?? 'Owner'} 🏟️</Text>
          </View>
          <Pressable style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <View style={styles.notifDot} />
          </Pressable>
        </View>

        {/* Turf status chips */}
        {myTurfs && myTurfs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
            {myTurfs.map(t => (
              <View key={t.id} style={[styles.turfChip, {
                backgroundColor: t.verificationStatus === 'verified' ? '#10B98120' : '#F9731620',
                borderColor: t.verificationStatus === 'verified' ? '#10B981' : '#F97316',
              }]}>
                <View style={[styles.turfChipDot, { backgroundColor: t.verificationStatus === 'verified' ? '#10B981' : '#F97316' }]} />
                <Text style={[styles.turfChipText, { color: t.verificationStatus === 'verified' ? '#10B981' : '#F97316' }]}>
                  {t.name}
                </Text>
                <Text style={[styles.turfChipStatus, { color: colors.mutedForeground }]}>
                  {t.verificationStatus === 'verified' ? '✓ Verified' : '⏳ Pending'}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noTurfBanner}>
            <Text style={styles.noTurfText}>No turfs registered yet</Text>
            <Text style={styles.noTurfSub}>Go to "My Turfs" tab to add your first turf</Text>
          </View>
        )}
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard emoji="📅" value={todayBookings.length} label="Today's Bookings" />
        <StatCard emoji="💰" value={`₹${todayEarnings}`} label="Today's Earnings" color="#10B981" />
        <StatCard emoji="📊" value={bookings?.length ?? 0} label="Total Bookings" />
        <StatCard emoji="💎" value={`₹${totalEarnings}`} label="Total Earnings" color="#10B981" />
      </View>

      {/* Today's Schedule */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Today's Schedule</Text>
          <Text style={[styles.todayDate, { color: colors.mutedForeground }]}>{new Date().toDateString()}</Text>
        </View>
        {loadingDash ? (
          <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
        ) : todayBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No bookings today</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Share your turf link to get bookings</Text>
          </View>
        ) : (
          todayBookings.map(b => (
            <View key={b.id} style={[styles.bookingRow, { borderBottomColor: colors.border }]}>
              <LinearGradient colors={['#F9731620', '#F9731605']} style={styles.bookingTime}>
                <Text style={[styles.bookingTimeText, { color: colors.primary }]}>{b.startTime}</Text>
                <Text style={[styles.bookingTimeSub, { color: colors.mutedForeground }]}>{b.endTime}</Text>
              </LinearGradient>
              <View style={styles.bookingInfo}>
                <Text style={[styles.bookingPlayer, { color: colors.text }]}>{b.userName || 'Player'}</Text>
                <Text style={[styles.bookingTurf, { color: colors.mutedForeground }]}>{b.turfName}</Text>
              </View>
              <View style={styles.bookingRight}>
                <Text style={[styles.bookingAmount, { color: '#10B981' }]}>₹{b.totalAmount}</Text>
                <View style={[styles.statusBadge, { backgroundColor: b.status === 'confirmed' ? '#10B98120' : '#F9731620' }]}>
                  <Text style={[styles.statusText, { color: b.status === 'confirmed' ? '#10B981' : '#F97316' }]}>
                    {b.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Upcoming Bookings */}
      {(dashboard?.upcomingBookings?.length ?? 0) > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>⏭️ Upcoming Bookings</Text>
          </View>
          {(dashboard?.upcomingBookings ?? []).map((b: any) => (
            <View key={b.id} style={[styles.bookingRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.dateBox, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.dateBoxDay, { color: colors.primary }]}>
                  {new Date(b.date).getDate()}
                </Text>
                <Text style={[styles.dateBoxMonth, { color: colors.mutedForeground }]}>
                  {new Date(b.date).toLocaleString('default', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.bookingInfo}>
                <Text style={[styles.bookingPlayer, { color: colors.text }]}>{b.userName}</Text>
                <Text style={[styles.bookingTurf, { color: colors.mutedForeground }]}>{b.startTime} – {b.endTime}</Text>
              </View>
              <Text style={[styles.bookingAmount, { color: '#10B981' }]}>₹{b.totalAmount}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Tips */}
      <View style={[styles.section, { backgroundColor: '#F9731608', borderColor: '#F9731630', borderWidth: 1 }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 12 }]}>💡 Quick Tips</Text>
        {[
          'Keep your slots updated to avoid double bookings',
          'Verified turfs get 3x more bookings on the platform',
          'Enable flood lights listing to attract evening players',
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipDot} />
            <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerGreeting: { color: '#64748B', fontSize: 12, fontWeight: '500' },
  headerName: { color: '#FAFAFA', fontSize: 22, fontWeight: '900', fontFamily: 'Inter_700Bold', marginTop: 2 },
  notifBtn: { position: 'relative', padding: 4 },
  notifDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  turfChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  turfChipDot: { width: 8, height: 8, borderRadius: 4 },
  turfChipText: { fontSize: 13, fontWeight: '700' },
  turfChipStatus: { fontSize: 11 },
  noTurfBanner: { marginTop: 12, padding: 12, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 12, alignItems: 'center' },
  noTurfText: { color: '#F97316', fontWeight: '700', fontSize: 14 },
  noTurfSub: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  todayDate: { fontSize: 12 },
  emptyState: { alignItems: 'center', padding: 32, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptySub: { fontSize: 12 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  bookingTime: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bookingTimeText: { fontSize: 14, fontWeight: '800' },
  bookingTimeSub: { fontSize: 10 },
  bookingInfo: { flex: 1 },
  bookingPlayer: { fontSize: 14, fontWeight: '700' },
  bookingTurf: { fontSize: 12, marginTop: 2 },
  bookingRight: { alignItems: 'flex-end', gap: 4 },
  bookingAmount: { fontSize: 14, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '800' },
  dateBox: { width: 48, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateBoxDay: { fontSize: 20, fontWeight: '900' },
  dateBoxMonth: { fontSize: 10, fontWeight: '600' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F97316', marginTop: 5 },
  tipText: { flex: 1, fontSize: 13 },
});
