import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListNeedPlayers, useJoinNeedPlayersPost, useGetLeaderboard, useGetMe, useUpdateAvailability } from '@workspace/api-client-react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [cityFilter, setCityFilter] = useState('');

  const { data: me, refetch: refetchMe } = useGetMe();
  const { data: posts, isLoading: loadingPosts, refetch: refetchPosts } = useListNeedPlayers({ city: cityFilter });
  const { data: leaderboard, isLoading: loadingLeaderboard } = useGetLeaderboard({ limit: 5 });
  
  const updateAvailability = useUpdateAvailability();
  const joinPost = useJoinNeedPlayersPost();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMe(), refetchPosts()]);
    setRefreshing(false);
  };

  const handleToggleAvailability = async () => {
    if (!me) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateAvailability.mutateAsync({ 
      data: { status: me.availabilityStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE' } 
    });
    refetchMe();
  };

  const handleJoin = async (postId: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await joinPost.mutateAsync({ needPlayersPostId: postId });
    refetchPosts();
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0), paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={[styles.wordmark, { color: colors.primary }]}>GLORY SPORTS</Text>
        <Pressable style={styles.iconBtn}>
          <Feather name="bell" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
        <View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Player Status</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            {me?.availabilityStatus === 'AVAILABLE' ? "You're visible to teams" : "Invisible to teams"}
          </Text>
        </View>
        <Pressable 
          onPress={handleToggleAvailability}
          style={[styles.toggle, { backgroundColor: me?.availabilityStatus === 'AVAILABLE' ? colors.primary : colors.muted }]}
        >
          <View style={[styles.toggleKnob, { marginLeft: me?.availabilityStatus === 'AVAILABLE' ? 24 : 2 }]} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Need Players</Text>
          <View style={[styles.filterBar, { backgroundColor: colors.card }]}>
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <TextInput 
              style={[styles.filterInput, { color: colors.text }]}
              placeholder="City"
              placeholderTextColor={colors.mutedForeground}
              value={cityFilter}
              onChangeText={setCityFilter}
            />
          </View>
        </View>

        {loadingPosts ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.postTitle, { color: colors.text }]}>{item.teamName}</Text>
                <Text style={[styles.postRole, { color: colors.mutedForeground }]}>{item.roleRequired}</Text>
                <View style={styles.postFooter}>
                  <Text style={[styles.postCity, { color: colors.mutedForeground }]}>
                    <Feather name="map-pin" size={12} /> {item.city}
                  </Text>
                  <Pressable 
                    onPress={() => handleJoin(item.id)}
                    style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.joinText}>Join</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: colors.mutedForeground }}>No posts found</Text>}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Leaderboard</Text>
        <View style={[styles.leaderboardCard, { backgroundColor: colors.card }]}>
          {leaderboard?.map((player, index) => (
            <View key={player.playerId} style={[styles.leaderRow, index < 4 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={styles.leaderInfo}>
                <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#FFD700' : colors.muted }]}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={[styles.leaderName, { color: colors.text }]}>{player.playerName}</Text>
              </View>
              <Text style={[styles.leaderScore, { color: colors.primary }]}>{player.trustScore} pts</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.statsBanner, { backgroundColor: colors.primary }]}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>450</Text>
          <Text style={styles.statLab}>Runs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>12</Text>
          <Text style={styles.statLab}>Wickets</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>68%</Text>
          <Text style={styles.statLab}>Win %</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  iconBtn: { padding: 4 },
  heroCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: { fontSize: 18, fontWeight: '700' },
  heroSub: { fontSize: 14, marginTop: 4 },
  toggle: { width: 50, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    gap: 6,
  },
  filterInput: { fontSize: 12, width: 60 },
  postCard: {
    width: 200,
    padding: 16,
    borderRadius: 16,
    marginLeft: 20,
    borderWidth: 1,
    gap: 8,
  },
  postTitle: { fontSize: 16, fontWeight: '600' },
  postRole: { fontSize: 13 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  postCity: { fontSize: 11 },
  joinBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  joinText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  leaderboardCard: { marginHorizontal: 20, borderRadius: 20, padding: 8 },
  leaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  leaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rankText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  leaderName: { fontSize: 15, fontWeight: '500' },
  leaderScore: { fontSize: 14, fontWeight: '700' },
  statsBanner: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: { alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLab: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
});
import { Platform } from 'react-native';
