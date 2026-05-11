import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useListTurfs, useFetchTurfSlotAvailability, useCreateBooking } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const CITIES = ['All', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune'];

export default function PlayerTurfs() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
  const createBooking = useCreateBooking();

  const filtered = ((turfs as any[]) ?? []).filter((t: any) =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBook = async (turf: any, slot: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createBooking.mutateAsync({
        data: {
          turfId: turf.id,
          date: selectedDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }
      });
      Alert.alert('Booked!', `Slot ${slot.startTime}–${slot.endTime} at ${turf.name} confirmed for ₹${slot.price}!`);
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.message ?? 'Slot may already be taken.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16), backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Book Turf</Text>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search turfs..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
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
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🏟️</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>No turfs available</Text>
            <Text style={[styles.emptyTextSub, { color: colors.mutedForeground }]}>Try a different city</Text>
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
                        <Text style={styles.verifiedText}>✓</Text>
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
                      {((slots as any[]) ?? []).map((slot: any, i: number) => (
                        <Pressable
                          key={i}
                          disabled={!slot.isAvailable}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Alert.alert(
                              'Confirm Booking',
                              `Book ${slot.startTime}–${slot.endTime} at ${turf.name} for ₹${slot.price}?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Book Now', onPress: () => handleBook(turf, slot) },
                              ]
                            );
                          }}
                          style={[styles.slotChip, {
                            backgroundColor: slot.isAvailable ? colors.primary + '15' : colors.muted,
                            borderColor: slot.isAvailable ? colors.primary : colors.border,
                            opacity: slot.isAvailable ? 1 : 0.4,
                          }]}
                        >
                          <Text style={[styles.slotTime, { color: slot.isAvailable ? colors.primary : colors.mutedForeground }]}>
                            {slot.startTime}
                          </Text>
                          <Text style={[styles.slotPriceLbl, { color: colors.mutedForeground }]}>
                            {slot.isAvailable ? `₹${slot.price}` : 'Booked'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  <View style={[styles.turfMeta, { borderTopColor: colors.border }]}>
                    <Text style={[styles.turfMetaItem, { color: colors.mutedForeground }]}>⏰ {turf.openTime} – {turf.closeTime}</Text>
                    <Text style={[styles.turfMetaItem, { color: colors.mutedForeground }]}>👤 {turf.ownerName}</Text>
                  </View>
                </View>
              )}
            </View>
          ))
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
  cityChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  cityChipText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: '800' },
  emptyTextSub: { fontSize: 13 },
  turfCard: { borderRadius: 20, marginBottom: 14, overflow: 'hidden' },
  turfHeader: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  turfIcon: { width: 68, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  turfTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
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
  turfMeta: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 4 },
  turfMetaItem: { fontSize: 12 },
});
