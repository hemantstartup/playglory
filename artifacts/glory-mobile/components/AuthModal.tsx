import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Modal, Platform } from 'react-native';
import { useLogin, useRegister } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const AuthModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setToken } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState<'PLAYER' | 'TURF_OWNER'>('PLAYER');

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await loginMutation.mutateAsync({ data: { phone, password } });
      if (res.token) {
        await setToken(res.token);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegister = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await registerMutation.mutateAsync({ 
        data: { name, phone, password, city, role } 
      });
      if (res.token) {
        await setToken(res.token);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.content, { 
          backgroundColor: colors.card, 
          paddingBottom: insets.bottom + 24,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isLogin ? 'Welcome Back' : 'Join Glory Sports'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {!isLogin && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Full Name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Phone Number"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {!isLogin && (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="City"
                placeholderTextColor={colors.mutedForeground}
                value={city}
                onChangeText={setCity}
              />
              <View style={styles.roleContainer}>
                <Pressable 
                  onPress={() => setRole('PLAYER')}
                  style={[styles.roleBtn, role === 'PLAYER' && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.roleText, { color: role === 'PLAYER' ? '#fff' : colors.mutedForeground }]}>Player</Text>
                </Pressable>
                <Pressable 
                  onPress={() => setRole('TURF_OWNER')}
                  style={[styles.roleBtn, role === 'TURF_OWNER' && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.roleText, { color: role === 'TURF_OWNER' ? '#fff' : colors.mutedForeground }]}>Turf Owner</Text>
                </Pressable>
              </View>
            </>
          )}

          <Pressable 
            onPress={isLogin ? handleLogin : handleRegister}
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{isLogin ? 'Login' : 'Create Account'}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setIsLogin(!isLogin)} style={styles.toggleBtn}>
            <Text style={[styles.toggleText, { color: colors.mutedForeground }]}>
              {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleText: {
    fontWeight: '600',
  },
  submitBtn: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleBtn: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleText: {
    fontSize: 14,
  },
});
