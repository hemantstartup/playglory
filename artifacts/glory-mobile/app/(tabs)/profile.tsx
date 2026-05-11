import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, ScrollView, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListTurfs, useFetchTurfSlotAvailability, useCreateBooking, useListBookings } from '@workspace/api-client-react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function TurfsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [selectedTurf, setSelectedTurf] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: turfs, isLoading } = useListTurfs();
  const { data: slots, isLoading: loadingSlots } = useFetchTurfSlotAvailability(
    selectedTurf?.id,
    { date: selectedDate },
    { query: { enabled: !!selectedTurf } }
  );
  const { data: myBookings } = useListBookings();
  const createBooking = useCreateBooking();

  const handleBook = async (slot: any) => {
    if (!slot.available) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createBooking.mutateAsync({ 
      data: { 
        turfId: selectedTurf.id, 
        startTime: slot.startTime, 
        endTime: slot.endTime,
        date: selectedDate
      } 
    });
    // In a real app we'd close the picker or show success
  };

  const renderTurf = ({ item }: { item: any }) => (
    <Pressable 
      onPress={() => setSelectedTurf(item)}
      style={[styles.turfCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.turfImage, { backgroundColor: colors.muted }]}>
        <Ionicons name="map" size={32} color={colors.mutedForeground} />
      </View>
      <View style={styles.turfInfo}>
        <View style={styles.turfHeader}>
          <Text style={[styles.turfName, { color: colors.text }]}>{item.name}</Text>
          {item.verificationStatus === 'VERIFIED' && (
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          )}
        </View>
        <Text style={[styles.turfCity, { color: colors.mutedForeground }]}>{item.city}</Text>
        <Text style={[styles.turfPrice, { color: colors.primary }]}>₹{item.pricePerHour}/hr</Text>
        <View style={styles.tagRow}>
          {item.sports?.map((s: string) => (
            <View key={s} style={[styles.tag, { backgroundColor: colors.muted }]}>
              <Text style={[styles.tagText, { color: colors.text }]}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <FlatList
        data={turfs}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTurf}
        ListHeaderComponent={<Text style={[styles.title, { color: colors.text }]}>Explore Turfs</Text>}
        ListFooterComponent={
          <>
            {myBookings && myBookings.length > 0 && (
              <View style={styles.bookingsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>My Bookings</Text>
                {myBookings.map((b: any) => (
                  <View key={b.id} style={[styles.bookingRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.bookingText, { color: colors.text }]}>{b.turfName}</Text>
                    <Text style={[styles.bookingDate, { color: colors.mutedForeground }]}>{b.date} • {b.startTime}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      />

      {selectedTurf && (
        <View style={[styles.pickerOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.pickerContent, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{selectedTurf.name}</Text>
              <Pressable onPress={() => setSelectedTurf(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {loadingSlots ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
            ) : (
              <ScrollView style={styles.slotsGrid}>
                <View style={styles.slotsWrapper}>
                  {slots?.map((slot: any, i: number) => (
                    <Pressable 
                      key={i}
                      onPress={() => handleBook(slot)}
                      style={[
                        styles.slotBtn, 
                        { backgroundColor: slot.available ? colors.primary : colors.muted }
                      ]}
                    >
                      <Text style={[styles.slotText, { color: slot.available ? '#fff' : colors.mutedForeground }]}>
                        {slot.startTime}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  turfCard: { flexDirection: 'row', padding: 12, borderRadius: 20, borderWidth: 1, marginBottom: 16, gap: 16 },
  turfImage: { width: 100, height: 100, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  turfInfo: { flex: 1, gap: 4 },
  turfHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  turfName: { fontSize: 18, fontWeight: 'bold' },
  turfCity: { fontSize: 13 },
  turfPrice: { fontSize: 15, fontWeight: '700' },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 10, fontWeight: '600' },
  bookingsSection: { marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  bookingRow: { paddingVertical: 12, borderBottomWidth: 1 },
  bookingText: { fontSize: 15, fontWeight: '500' },
  bookingDate: { fontSize: 13, marginTop: 2 },
  pickerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  pickerContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pickerTitle: { fontSize: 20, fontWeight: 'bold' },
  slotsGrid: { maxHeight: 400 },
  slotsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotBtn: { width: '31%', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  slotText: { fontWeight: '600', fontSize: 13 },
});
