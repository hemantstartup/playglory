import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Alert, Platform, Modal, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetMyTurfs, useCreateTurf, useFetchTurfSlotAvailability, useListBookings } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const SPORTS = ['cricket', 'football', 'badminton'];
const AMENITIES = ['Parking', 'Washroom', 'Flood Lights', 'Drinking Water'];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDateForDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0]!;
}

export default function TurfMyTurfs() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTurf, setSelectedTurf] = useState<any>(null);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  const { data: myTurfs, isLoading, refetch } = useGetMyTurfs();
  const createTurf = useCreateTurf();

  const selectedDate = getDateForDay(selectedDayOffset);
  const { data: slots, isLoading: loadingSlots } = useFetchTurfSlotAvailability(
    selectedTurf?.id ?? 0,
    selectedDate,
    { query: { enabled: !!selectedTurf } as any }
  );
  const { data: bookings } = useListBookings();
  const turfBookings = bookings?.filter(b => b.turfId === selectedTurf?.id && b.date === selectedDate) ?? [];

  const [form, setForm] = useState({
    name: '', city: '', address: '',
    pricePerHour: '', openTime: '06:00', closeTime: '22:00',
    sports: ['cricket'] as string[],
    amenities: [] as string[],
  });

  const toggleSport = (s: string) => {
    setForm(f => ({
      ...f,
      sports: f.sports.includes(s) ? f.sports.filter(x => x !== s) : [...f.sports, s],
    }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.city || !form.pricePerHour) {
      Alert.alert('Missing Fields', 'Please fill in name, city, and price.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await createTurf.mutateAsync({
        data: {
          name: form.name,
          city: form.city,
          address: form.address,
          pricePerHour: parseFloat(form.pricePerHour),
          openTime: form.openTime,
          closeTime: form.closeTime,
          sports: form.sports,
        }
      });
      setAddOpen(false);
      setForm({ name: '', city: '', address: '', pricePerHour: '', openTime: '06:00', closeTime: '22:00', sports: ['cricket'], amenities: [] });
      refetch();
      Alert.alert('Turf Registered!', 'Your turf has been submitted for verification. You\'ll be notified once approved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to register turf');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>My Turfs</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{myTurfs?.length ?? 0} registered</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAddOpen(true); }}
            style={styles.addBtn}
          >
            <LinearGradient colors={['#F97316', '#EA580C']} style={styles.addBtnGrad}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Add Turf</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
        ) : !myTurfs?.length ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 48 }}>🏟️</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Turfs Yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Register your first turf to start accepting bookings</Text>
            <Pressable onPress={() => setAddOpen(true)} style={styles.emptyBtn}>
              <LinearGradient colors={['#F97316', '#EA580C']} style={styles.emptyBtnGrad}>
                <Text style={styles.emptyBtnText}>Register First Turf</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Turf list */}
            {myTurfs.map(turf => (
              <Pressable
                key={turf.id}
                onPress={() => { Haptics.selectionAsync(); setSelectedTurf(selectedTurf?.id === turf.id ? null : turf); }}
                style={[styles.turfCard, { backgroundColor: colors.card, borderColor: selectedTurf?.id === turf.id ? colors.primary : colors.border }]}
              >
                <View style={[styles.turfCardIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={{ fontSize: 28 }}>🏟️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.turfCardTop}>
                    <Text style={[styles.turfName, { color: colors.text }]}>{turf.name}</Text>
                    <View style={[styles.verifyBadge, {
                      backgroundColor: turf.verificationStatus === 'verified' ? '#10B98120' : '#F9731620'
                    }]}>
                      <Text style={[styles.verifyText, {
                        color: turf.verificationStatus === 'verified' ? '#10B981' : '#F97316'
                      }]}>
                        {turf.verificationStatus === 'verified' ? '✓ Verified' : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.turfMeta, { color: colors.mutedForeground }]}>
                    📍 {turf.city} · ₹{turf.pricePerHour}/hr · {turf.openTime}–{turf.closeTime}
                  </Text>
                  <View style={styles.sportsRow}>
                    {turf.sports?.map((s: string) => (
                      <View key={s} style={[styles.sportPill, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.sportPillText, { color: colors.primary }]}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>
            ))}

            {/* Slot Calendar for selected turf */}
            {selectedTurf && (
              <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.calendarTitle, { color: colors.text }]}>📅 Slot Calendar — {selectedTurf.name}</Text>

                {/* Day Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const isSelected = i === selectedDayOffset;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => { Haptics.selectionAsync(); setSelectedDayOffset(i); }}
                        style={[styles.dayBtn, { backgroundColor: isSelected ? colors.primary : colors.background }]}
                      >
                        <Text style={[styles.dayBtnDay, { color: isSelected ? '#fff' : colors.mutedForeground }]}>
                          {DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                        </Text>
                        <Text style={[styles.dayBtnDate, { color: isSelected ? '#fff' : colors.text }]}>
                          {d.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Slot Grid */}
                {loadingSlots ? (
                  <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
                ) : (
                  <View style={styles.slotGrid}>
                    {slots?.map((slot: any, i: number) => {
                      const isBooked = !slot.isAvailable;
                      const booking = turfBookings.find(b => b.startTime === slot.startTime);
                      return (
                        <View
                          key={i}
                          style={[styles.slotBox, {
                            backgroundColor: isBooked ? '#EF444420' : '#10B98120',
                            borderColor: isBooked ? '#EF4444' : '#10B981',
                          }]}
                        >
                          <Text style={[styles.slotTime, { color: isBooked ? '#EF4444' : '#10B981' }]}>
                            {slot.startTime}
                          </Text>
                          <Text style={[styles.slotStatus, { color: isBooked ? '#EF4444' : '#10B981' }]}>
                            {isBooked ? booking ? `${booking.userName?.split(' ')[0]}` : 'Booked' : 'Open'}
                          </Text>
                          <Text style={[styles.slotPrice, { color: colors.mutedForeground }]}>₹{slot.price}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Available</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Booked</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Turf Modal */}
      <Modal visible={addOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Register New Turf</Text>
            <Pressable onPress={() => setAddOpen(false)}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              {[
                { key: 'name', label: 'Turf Name *', placeholder: 'e.g. Green Cricket Ground' },
                { key: 'city', label: 'City *', placeholder: 'e.g. Mumbai' },
                { key: 'address', label: 'Address', placeholder: 'Full address' },
                { key: 'pricePerHour', label: 'Price per Hour (₹) *', placeholder: '500', keyboardType: 'numeric' },
                { key: 'openTime', label: 'Open Time', placeholder: '06:00' },
                { key: 'closeTime', label: 'Close Time', placeholder: '22:00' },
              ].map(field => (
                <View key={field.key}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
                  <View style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.fieldInputText, { color: colors.text }]}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.mutedForeground}
                      value={(form as any)[field.key]}
                      onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                      keyboardType={(field as any).keyboardType}
                    />
                  </View>
                </View>
              ))}

              {/* Sports */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Sports Available</Text>
              <View style={styles.pillRow}>
                {SPORTS.map(s => (
                  <Pressable
                    key={s}
                    onPress={() => { Haptics.selectionAsync(); toggleSport(s); }}
                    style={[styles.pill, {
                      backgroundColor: form.sports.includes(s) ? colors.primary : colors.card,
                      borderColor: form.sports.includes(s) ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[styles.pillText, { color: form.sports.includes(s) ? '#fff' : colors.text }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Amenities */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Amenities</Text>
              <View style={styles.pillRow}>
                {AMENITIES.map(a => (
                  <Pressable
                    key={a}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setForm(f => ({
                        ...f,
                        amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
                      }));
                    }}
                    style={[styles.pill, {
                      backgroundColor: form.amenities.includes(a) ? '#3B82F6' : colors.card,
                      borderColor: form.amenities.includes(a) ? '#3B82F6' : colors.border,
                    }]}
                  >
                    <Text style={[styles.pillText, { color: form.amenities.includes(a) ? '#fff' : colors.text }]}>{a}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={handleCreate} disabled={createTurf.isPending} style={{ marginTop: 8 }}>
                <LinearGradient colors={['#F97316', '#EA580C']} style={styles.submitBtn}>
                  {createTurf.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.submitText}>Register Turf</Text>
                  }
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13 },
  addBtn: { borderRadius: 12, overflow: 'hidden' },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyCard: { margin: 20, borderRadius: 24, padding: 40, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center' },
  emptyBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  emptyBtnGrad: { paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  turfCard: { flexDirection: 'row', gap: 14, margin: 16, marginBottom: 0, padding: 16, borderRadius: 20, borderWidth: 1.5 },
  turfCardIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  turfCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  turfName: { fontSize: 16, fontWeight: '800', flex: 1 },
  verifyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  verifyText: { fontSize: 10, fontWeight: '800' },
  turfMeta: { fontSize: 12, marginBottom: 6 },
  sportsRow: { flexDirection: 'row', gap: 6 },
  sportPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sportPillText: { fontSize: 10, fontWeight: '700' },
  calendarCard: { margin: 16, borderRadius: 20, padding: 16, marginTop: 12 },
  calendarTitle: { fontSize: 15, fontWeight: '800' },
  dayBtn: { width: 46, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayBtnDay: { fontSize: 10, fontWeight: '600' },
  dayBtnDate: { fontSize: 18, fontWeight: '900' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  slotBox: { width: '30%', padding: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  slotTime: { fontSize: 12, fontWeight: '800' },
  slotStatus: { fontSize: 10, fontWeight: '600' },
  slotPrice: { fontSize: 10, marginTop: 2 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48 },
  fieldInputText: { flex: 1, fontSize: 15, height: '100%' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '600' },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
