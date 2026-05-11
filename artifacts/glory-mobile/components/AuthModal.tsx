import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLogin, useRegister } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type AuthScreen = 'landing' | 'phone-login' | 'phone-register' | 'otp';

const CricketLogo = ({ size = 72 }: { size?: number }) => (
  <View style={[logoStyles.container, { width: size, height: size, borderRadius: size / 2 }]}>
    <LinearGradient
      colors={['#F97316', '#EA580C', '#C2410C']}
      style={[logoStyles.gradient, { borderRadius: size / 2 }]}
    >
      <Text style={[logoStyles.emoji, { fontSize: size * 0.45 }]}>🏏</Text>
    </LinearGradient>
  </View>
);

const logoStyles = StyleSheet.create({
  container: { overflow: 'hidden', shadowColor: '#F97316', shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: {},
});

export const AuthModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setToken } = useAuth();

  const [screen, setScreen] = useState<AuthScreen>('landing');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState<'player' | 'turf_owner'>('player');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const resetForm = () => {
    setPhone(''); setPassword(''); setName(''); setCity('');
    setRole('player'); setShowPassword(false); setErrorMsg('');
  };

  const goTo = (s: AuthScreen) => {
    Haptics.selectionAsync();
    setErrorMsg('');
    setScreen(s);
  };

  const handleLogin = async () => {
    if (!phone || !password) { setErrorMsg('Please fill in all fields.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg('');
    try {
      const res = await loginMutation.mutateAsync({ data: { phone, password } });
      if (res.token) { await setToken(res.token); resetForm(); setScreen('landing'); onClose(); }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Invalid phone or password. Please try again.');
    }
  };

  const handleRegister = async () => {
    if (!name || !phone || !password) { setErrorMsg('Please fill in all required fields.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg('');
    try {
      const res = await registerMutation.mutateAsync({ data: { name, phone, password, city, role } as any });
      if (res.token) { await setToken(res.token); resetForm(); setScreen('landing'); onClose(); }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Registration failed. Phone may already be in use.');
    }
  };

  const handleGooglePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming Soon', 'Google sign-in will be available in the next update.', [{ text: 'OK' }]);
  };

  const handleOtpPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming Soon', 'OTP login will be available in the next update.', [{ text: 'OK' }]);
  };

  const renderLanding = () => (
    <View style={styles.landingContent}>
      <View style={styles.heroSection}>
        <CricketLogo size={88} />
        <Text style={styles.brandName}>GLORY SPORTS</Text>
        <Text style={styles.tagline}>India's #1 Cricket Ecosystem</Text>
        <Text style={styles.subTagline}>Book turfs · Build teams · Track glory</Text>
      </View>

      <View style={styles.authOptions}>
        <Pressable style={styles.socialBtn} onPress={handleGooglePress}>
          <View style={styles.googleIconWrap}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={styles.socialBtnText}>Continue with Google</Text>
          <View style={{ width: 32 }} />
        </Pressable>

        <Pressable style={styles.socialBtn} onPress={handleOtpPress}>
          <View style={[styles.socialIconWrap, { backgroundColor: '#22C55E20' }]}>
            <Ionicons name="phone-portrait-outline" size={18} color="#22C55E" />
          </View>
          <Text style={styles.socialBtnText}>Login with OTP</Text>
          <View style={{ width: 32 }} />
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with phone</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => goTo('phone-login')}>
          <LinearGradient colors={['#F97316', '#EA580C']} style={styles.primaryBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.outlineBtn} onPress={() => goTo('phone-register')}>
          <Text style={styles.outlineBtnText}>Create Account</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPhoneLogin = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => goTo('landing')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.formHeader}>
          <CricketLogo size={56} />
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.4)"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={handleLogin} disabled={isLoading}>
          <LinearGradient colors={['#F97316', '#EA580C']} style={styles.primaryBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Sign In</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => goTo('phone-register')} style={styles.switchBtn}>
          <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchLink}>Create one</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderPhoneRegister = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => goTo('landing')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.formHeader}>
          <CricketLogo size={56} />
          <Text style={styles.formTitle}>Join Glory Sports</Text>
          <Text style={styles.formSubtitle}>Start your cricket journey</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="rgba(255,255,255,0.4)" value={name} onChangeText={setName} />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Phone Number *" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Password *" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="City (optional)" placeholderTextColor="rgba(255,255,255,0.4)" value={city} onChangeText={setCity} />
          </View>
        </View>

        <Text style={styles.roleLabel}>I am a...</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleChip, role === 'player' && styles.roleChipActive]}
            onPress={() => { Haptics.selectionAsync(); setRole('player'); }}
          >
            <Text style={styles.roleChipEmoji}>🏏</Text>
            <Text style={[styles.roleChipText, role === 'player' && styles.roleChipTextActive]}>Player</Text>
          </Pressable>
          <Pressable
            style={[styles.roleChip, role === 'turf_owner' && styles.roleChipActive]}
            onPress={() => { Haptics.selectionAsync(); setRole('turf_owner'); }}
          >
            <Text style={styles.roleChipEmoji}>🏟️</Text>
            <Text style={[styles.roleChipText, role === 'turf_owner' && styles.roleChipTextActive]}>Turf Owner</Text>
          </Pressable>
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={handleRegister} disabled={isLoading}>
          <LinearGradient colors={['#F97316', '#EA580C']} style={styles.primaryBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Create Account</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => goTo('phone-login')} style={styles.switchBtn}>
          <Text style={styles.switchText}>Already have an account? <Text style={styles.switchLink}>Sign In</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={[styles.container, { paddingTop: insets.top }]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      >
        <View style={styles.glowTop} pointerEvents="none" />
        <View style={styles.glowBottom} pointerEvents="none" />

        {screen === 'landing' && renderLanding()}
        {screen === 'phone-login' && renderPhoneLogin()}
        {screen === 'phone-register' && renderPhoneRegister()}
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute', top: -60, left: '20%', width: 260, height: 260,
    borderRadius: 130, backgroundColor: '#F97316', opacity: 0.12,
  },
  glowBottom: {
    position: 'absolute', bottom: -60, right: '10%', width: 200, height: 200,
    borderRadius: 100, backgroundColor: '#7C3AED', opacity: 0.10,
  },

  landingContent: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingBottom: 48,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 24,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#F97316',
    letterSpacing: 4,
    marginTop: 16,
    fontFamily: 'Inter_700Bold',
  },
  tagline: {
    fontSize: 17,
    color: '#FAFAFA',
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'Inter_600SemiBold',
  },
  subTagline: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
  },

  authOptions: {
    gap: 12,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 12,
  },
  socialBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  socialIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  googleIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  googleG: {
    fontSize: 18, fontWeight: '700', color: '#4285F4',
  },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4,
  },
  dividerLine: {
    flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    color: '#64748B', fontSize: 12, fontFamily: 'Inter_400Regular',
  },

  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F97316',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold',
  },
  outlineBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(249,115,22,0.5)',
  },
  outlineBtnText: {
    color: '#F97316', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold',
  },

  formContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 16,
    flexGrow: 1,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24, alignSelf: 'flex-start',
  },
  backText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 15,
  },
  formHeader: {
    alignItems: 'center', gap: 10, marginBottom: 32,
  },
  formTitle: {
    fontSize: 28, fontWeight: '800', color: '#FAFAFA',
    fontFamily: 'Inter_700Bold', marginTop: 12,
  },
  formSubtitle: {
    fontSize: 14, color: '#64748B', fontFamily: 'Inter_400Regular',
  },

  inputGroup: {
    gap: 12, marginBottom: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FAFAFA',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: {
    padding: 6,
  },

  roleLabel: {
    color: '#94A3B8', fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 10,
  },
  roleRow: {
    flexDirection: 'row', gap: 12, marginBottom: 20,
  },
  roleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)',
  },
  roleChipActive: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderColor: '#F97316',
  },
  roleChipEmoji: { fontSize: 18 },
  roleChipText: {
    color: '#94A3B8', fontWeight: '600', fontSize: 14, fontFamily: 'Inter_600SemiBold',
  },
  roleChipTextActive: {
    color: '#F97316',
  },

  errorText: {
    color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 8,
    fontFamily: 'Inter_400Regular',
  },

  switchBtn: { alignItems: 'center', marginTop: 20 },
  switchText: { color: '#64748B', fontSize: 14, fontFamily: 'Inter_400Regular' },
  switchLink: { color: '#F97316', fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
