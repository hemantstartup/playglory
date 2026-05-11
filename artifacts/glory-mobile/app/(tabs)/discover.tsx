import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListPlayers } from '@workspace/api-client-react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState<string>('');

  const { data: players, isLoading } = useListPlayers({ 
    name: search || undefined,
    city: city || undefined,
    playerRole: (role as any) || undefined
  });

  const roles = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];

  const renderPlayer = ({ item }: { item: any }) => (
    <View style={[styles.playerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
      </View>
      <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.playerSub, { color: colors.mutedForeground }]}>{item.city}</Text>
      <View style={[styles.roleChip, { backgroundColor: colors.muted }]}>
        <Text style={[styles.roleText, { color: colors.text }]}>{item.playerRole}</Text>
      </View>
      <View style={styles.ratingRow}>
        {[1,2,3,4,5].map(i => (
          <Ionicons key={i} name="star" size={12} color={i <= 4 ? '#FFD700' : colors.muted} />
        ))}
      </View>
      <View style={[styles.availabilityBadge, { backgroundColor: item.availabilityStatus === 'AVAILABLE' ? '#10B981' : colors.muted }]}>
        <Text style={styles.availabilityText}>{item.availabilityStatus}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search players..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.filters}>
        <FlatList
          data={['All', ...roles]}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable 
              onPress={() => setRole(item === 'All' ? '' : item)}
              style={[
                styles.filterChip, 
                { backgroundColor: (role === item || (item === 'All' && !role)) ? colors.primary : colors.card }
              ]}
            >
              <Text style={[styles.filterChipText, { color: (role === item || (item === 'All' && !role)) ? '#fff' : colors.text }]}>
                {item}
              </Text>
            </Pressable>
          )}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={players}
          keyExtractor={item => item.id.toString()}
          renderItem={renderPlayer}
          numColumns={2}
          contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No players found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 16 },
  filters: { marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  playerCard: {
    flex: 1,
    margin: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  playerName: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  playerSub: { fontSize: 12, marginBottom: 4 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 10, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', gap: 2, marginVertical: 4 },
  availabilityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  availabilityText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  empty: { marginTop: 80, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
});
import { Platform } from 'react-native';
