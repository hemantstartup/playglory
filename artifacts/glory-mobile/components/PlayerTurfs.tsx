import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { useListTurfs, useFetchTurfSlotAvailability, useListBookings, useCancelBooking } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRazorpayCheckout } from './RazorpayCheckout';

const CITIES = ['All', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune'];
type MainTab = 'Browse' | 'My Bookings';

const STATUS_COLOR: Record<string, string> = {
  confirmed: '#10B981',
  completed: '#3B82F6',
  cancelled: '#EF4444',
  pending: '#F59E0B',
};

export default function PlayerTurfs() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MainTab>('Browse');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All');
  const [expandedTurf, setExpandedTurf] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!);

  const { data: turfs, isLoading } = useListTurfs({ city: city === 'All' ? undefined : city });
  const { data: slots, isLoading: loadingSlots } = useFetchTurfSlotAvailability(
    expandedTurf ?? 0,
    selectedDate,
    { query: { enabled: !!expandedTurf } as any }
  );
  const { data: bookings, isLoading: loadingBookings, refetch: refetchBookings } = useListBookings();
  const { openCheckout, isPending: paymentPending } = useRazorpayCheckout();
  const [successBooking, setSuccessBooking] = useState<any>(null);
  const cancelBooking = useCancelBooking();

  const filtered = ((turfs as any[]) ?? []).filter((t: any) =>
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
        setSuccessBooking({ ...result.booking, turfName: turf.name });
        refetchBookings();
      },
      (msg) => {
        if (msg !== 'Payment cancelled') {
          Alert.alert('Payment Failed', msg);
        }
      },
    );
  };

  const handleCancel = (bookingId: number) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive', onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          try {
            await cancelBooking.mutateAsync({ bookingId });
            refetchBookings();
            Alert.alert('Cancelled', 'Your booking has been cancelled.');
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not cancel booking.');
          }
        }
      },
    ]);
  };

  const upcomingBookings = ((bookings as any[]) ?? []).filter((b: any) => b.status !== 'cancelled');
  const totalSpend = upcomingBookings.filter((b: any) => b.status !== 'cancelled').reduce((s: number, b: any) => s + (b.totalAmount ?? 0), 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Fixed Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Turfs</Text>

        {/* Main Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
          {(['Browse', 'My Bookings'] as MainTab[]).map(tab => (
            <Pressable
              key={tab}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
              style={[styles.tabBtn, activeTab === tab && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : colors.mutedForeground }]}>{tab}</Text>
              {tab === 'My Bookings' && upcomingBookings.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{upcomingBookings.length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {activeTab === 'Browse' && (
          <>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search turfs, city..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {CITIES.map(c => (
                <Pressable
                  key={c}
                  onPress={() => { Haptics.selectionAsync(); setCity(c); }}
                  style={[styles.cityChip, {
                    backgroundColor: city === c ? colors.primary : colors.card,
                    borderColor: city === c ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[styles.cityChipText, { color: city === c ? '#fff' : colors.text }]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {/* ── Browse Tab ── */}
      {activeTab === 'Browse' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🏟️</Text>
              <Text style={[styles.emptyText, { color: colors.text }]}>No turfs available</Text>
              <Text style={[styles.emptyTextSub, { color: colors.mutedForeground }]}>Try a different city or search term</Text>
            </View>
          ) : (
            filtered.map((turf: any) => (
              <View key={turf.id} style={[styles.turfCard, { backgroundColor: colors.card }]}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setExpandedTurf(expandedTurf === turf.id ? null : turf.id); }}
                  style={styles.turfHeader}
                >
                  <View style={[styles.turfIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={{ fontSize: 30 }}>🏟️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.turfTopRow}>
                      <Text style={[styles.turfName, { color: colors.text }]}>{turf.name}</Text>
                      {turf.verificationStatus === 'verified' && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>✓ Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.turfCity, { color: colors.mutedForeground }]}>📍 {turf.city}</Text>
                    <View style={styles.sportsRow}>
                      {(turf.sports ?? []).map((s: string) => (
                        <View key={s} style={[styles.sportChip, { backgroundColor: colors.primary + '15' }]}>
                          <Text style={[styles.sportText, { color: colors.primary }]}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[styles.price, { color: colors.primary }]}>₹{turf.pricePerHour}</Text>
                    <Text style={[styles.perHr, { color: colors.mutedForeground }]}>per hr</Text>
                    <Ionicons name={expandedTurf === turf.id ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} style={{ marginTop: 4 }} />
                  </View>
                </Pressable>

                {expandedTurf === turf.id && (
                  <View style={[styles.slotSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.slotTitle, { color: colors.text }]}>
                      📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() + i);
                        const ds = d.toISOString().split('T')[0]!;
                        const isSelected = ds === selectedDate;
                        return (
                          <Pressable
                            key={i}
                            onPress={() => { Haptics.selectionAsync(); setSelectedDate(ds); }}
                            style={[styles.dateBtn, { backgroundColor: isSelected ? colors.primary : colors.background }]}
                          >
                            <Text style={[styles.dateBtnDay, { color: isSelected ? '#fff' : colors.mutedForeground }]}>
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}
                            </Text>
                            <Text style={[styles.dateBtnNum, { color: isSelected ? '#fff' : colors.text }]}>{d.getDate()}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {loadingSlots ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <View style={styles.slotGrid}>
                        {((slots as any[]) ?? []).length === 0 ? (
                          <Text style={[styles.noSlots, { color: colors.mutedForeground }]}>No slots available for this date</Text>
                        ) : (
                          ((slots as any[]) ?? []).map((slot: any, i: number) => (
                            <Pressable
                              key={i}
                              disabled={!slot.isAvailable || paymentPending}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handleBook(turf, slot);
                              }}
                              style={[styles.slotChip, {
                                backgroundColor: slot.isAvailable ? colors.primary + '15' : colors.muted,
                                borderColor: slot.isAvailable ? colors.primary : colors.border,
                                opacity: slot.isAvailable ? 1 : 0.4,
                              }]}
                            >
                              {paymentPending ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                              ) : (
                                <>
                                  <Text style={[styles.slotTime, { color: slot.isAvailable ? colors.primary : colors.mutedForeground }]}>
                                    {slot.startTime}
                                  </Text>
                                  <Text style={[styles.slotPriceLbl, { color: slot.isAvailable ? colors.primary : colors.mutedForeground, fontWeight: '700' }]}>
                                    {slot.isAvailable ? `Pay ₹${slot.price}` : 'Booked'}
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          ))
                        )}
                      </View>
                    )}

                    <View style={[styles.turfMeta, { borderTopColor: colors.border }]}>
                      <Text style={[styles.turfMetaItem, { color: colors.mutedForeground }]}>⏰ {turf.openTime} – {turf.closeTime}</Text>
                      {turf.ownerName && <Text style={[styles.turfMetaItem, { color: colors.mutedForeground }]}>👤 {turf.ownerName}</Text>}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── My Bookings Tab ── */}
      {activeTab === 'My Bookings' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* Summary Card */}
          {upcomingBookings.length > 0 && (
            <LinearGradient colors={['#F97316', '#C2410C']} style={styles.summaryCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal}>{upcomingBookings.length}</Text>
                  <Text style={styles.summaryLab}>Total Bookings</Text>
                </View>
                <View style={[styles.summaryDivider]} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal}>₹{totalSpend.toLocaleString('en-IN')}</Text>
                  <Text style={styles.summaryLab}>Total Spent</Text>
                </View>
                <View style={[styles.summaryDivider]} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal}>{upcomingBookings.filter((b: any) => b.status === 'confirmed').length}</Text>
                  <Text style={styles.summaryLab}>Confirmed</Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {loadingBookings ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
          ) : ((bookings as any[]) ?? []).length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🏟️</Text>
              <Text style={[styles.emptyText, { color: colors.text }]}>No bookings yet</Text>
              <Text style={[styles.emptyTextSub, { color: colors.mutedForeground }]}>Browse turfs and book a slot to get started</Text>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('Browse'); }}
                style={[styles.browseBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.browseBtnText}>Browse Turfs</Text>
              </Pressable>
            </View>
          ) : (
            ((bookings as any[]) ?? []).map((b: any) => {
              const statusColor = STATUS_COLOR[b.status] ?? colors.primary;
              const isPast = b.date < new Date().toISOString().split('T')[0]!;
              return (
                <View key={b.id} style={[styles.bookingCard, { backgroundColor: colors.card, borderLeftColor: statusColor }]}>
                  <View style={styles.bookingTop}>
                    <View style={[styles.bookingIconWrap, { backgroundColor: statusColor + '20' }]}>
                      <Text style={{ fontSize: 22 }}>🏟️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bookingTurfName, { color: colors.text }]}>{b.turfName || `Turf #${b.turfId}`}</Text>
                      <Text style={[styles.bookingMeta, { color: colors.mutedForeground }]}>
                        📅 {b.date}  ·  ⏰ {b.startTime} – {b.endTime}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{b.status?.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={[styles.bookingBottom, { borderTopColor: colors.border }]}>
                    <Text style={[styles.bookingAmount, { color: '#10B981' }]}>₹{b.totalAmount}</Text>
                    <Text style={[styles.bookingId, { color: colors.mutedForeground }]}>#{b.id}</Text>
                    {b.status === 'confirmed' && !isPast && (
                      <Pressable
                        onPress={() => handleCancel(b.id)}
                        style={[styles.cancelBtn, { borderColor: '#EF4444' }]}
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Payment Success Modal */}
      <Modal visible={!!successBooking} animationType="fade" transparent onRequestClose={() => setSuccessBooking(null)}>
        <View style={styles.successOverlay}>
          <View style={[styles.successCard, { backgroundColor: colors.card }]}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </LinearGradient>
            <Text style={[styles.successTitle, { color: colors.text }]}>Booking Confirmed! 🎉</Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>{successBooking?.turfName}</Text>
            <View style={[styles.successDetails, { backgroundColor: colors.background }]}>
              {[
                { label: 'Date', val: successBooking?.date },
                { label: 'Time', val: `${successBooking?.startTime} – ${successBooking?.endTime}` },
                { label: 'Amount Paid', val: `₹${successBooking?.totalAmount}` },
                { label: 'Payment ID', val: successBooking?.razorpayPaymentId ? successBooking.razorpayPaymentId.slice(0, 22) + '…' : '—' },
              ].map((row, i) => (
                <View key={i} style={[styles.successRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={[styles.successRowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[styles.successRowVal, { color: colors.text }]}>{row.val}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => { setSuccessBooking(null); setActiveTab('My Bookings'); }} style={{ width: '100%', marginTop: 8 }}>
              <LinearGradient colors={['#F97316', '#EA580C']} style={styles.successDoneBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.successDoneBtnText}>View My Bookings</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setSuccessBooking(null)}>
              <Text style={[styles.successSkip, { color: colors.mutedForeground }]}>Dismiss</Text>
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
  tabBar: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabText: { fontSize: 13, fontWeight: '700' },
  badge: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#F97316' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 46, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  cityChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  cityChipText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '800' },
  emptyTextSub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  browseBtn: { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 14, marginTop: 8 },
  browseBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Browse tab
  turfCard: { borderRadius: 20, marginBottom: 14, overflow: 'hidden' },
  turfHeader: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  turfIcon: { width: 68, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  turfTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  turfName: { fontSize: 15, fontWeight: '800', flex: 1 },
  verifiedBadge: { backgroundColor: '#10B98120', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  turfCity: { fontSize: 12, marginBottom: 6 },
  sportsRow: { flexDirection: 'row', gap: 6 },
  sportChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sportText: { fontSize: 10, fontWeight: '700' },
  price: { fontSize: 18, fontWeight: '900' },
  perHr: { fontSize: 10 },
  slotSection: { borderTopWidth: 1, padding: 14 },
  slotTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  dateBtn: { width: 44, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dateBtnDay: { fontSize: 10, fontWeight: '600' },
  dateBtnNum: { fontSize: 16, fontWeight: '900' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { width: '30%', padding: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 2 },
  slotTime: { fontSize: 13, fontWeight: '800' },
  slotPriceLbl: { fontSize: 10 },
  noSlots: { fontSize: 13, paddingVertical: 16, textAlign: 'center', width: '100%' },
  turfMeta: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 4 },
  turfMetaItem: { fontSize: 12 },
  // My Bookings tab
  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryVal: { color: '#fff', fontSize: 22, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  summaryLab: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'stretch' },
  bookingCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderLeftWidth: 4 },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  bookingIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bookingTurfName: { fontSize: 15, fontWeight: '700' },
  bookingMeta: { fontSize: 12, marginTop: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },
  bookingBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  bookingAmount: { fontSize: 16, fontWeight: '800' },
  bookingId: { fontSize: 11 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  cancelText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  successCard: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 28, alignItems: 'center', gap: 12 },
  successIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  successSub: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  successDetails: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  successRowLabel: { fontSize: 13 },
  successRowVal: { fontSize: 13, fontWeight: '700' },
  successDoneBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', width: '100%' },
  successDoneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  successSkip: { fontSize: 13, marginTop: 4, textDecorationLine: 'underline' },
});
