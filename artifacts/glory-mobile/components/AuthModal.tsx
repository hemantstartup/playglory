import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLogin, useRegister, useSendOtp, useVerifyOtp, useGoogleAuth } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type AuthScreen =
  | 'landing'
  | 'phone-login'
  | 'phone-register'
  | 'otp-phone'
  | 'otp-verify'
  | 'otp-register';

// ─── Logo ─────────────────────────────────────────────────────────────────────
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
  container: {
    overflow: 'hidden',
    shadowColor: '#F97316', shadowOpacity: 0.6, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: {},
});

// ─── OTP Box Input ─────────────────────────────────────────────────────────────
function OtpBoxInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRefs = useRef<(TextInput | null)[]>([null, null, null, null, null, null]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleChange = (index: number, text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 1) {
      // pasted full OTP
      const full = cleaned.slice(0, 6);
      onChange(full);
      const nextIdx = Math.min(full.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }
    const arr = [...digits];
    arr[index] = cleaned;
    const joined = arr.join('').slice(0, 6);
    onChange(joined);
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const arr = [...digits];
      arr[index - 1] = '';
      onChange(arr.join(''));
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={otpStyles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => { inputRefs.current[i] = r; }}
          style={[otpStyles.box, d ? otpStyles.boxFilled : null]}
          value={d}
          onChangeText={(t) => handleChange(i, t)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={i === 0 ? 6 : 1}
          textAlign="center"
          selectTextOnFocus
          caretHidden
        />
      ))}
    </View>
  );
}

const otpStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 24 },
  box: {
    width: 48, height: 56, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    color: '#FAFAFA', fontSize: 22, fontWeight: '700',
  },
  boxFilled: {
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderColor: '#F97316',
  },
});

// ─── Main Component ────────────────────────────────────────────────────────────
export const AuthModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const { setToken } = useAuth();

  const [screen, setScreen] = useState<AuthScreen>('landing');

  // Password-based flow
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState<'player' | 'turf_owner'>('player');
  const [showPassword, setShowPassword] = useState(false);

  // OTP flow
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpName, setOtpName] = useState('');
  const [otpCity, setOtpCity] = useState('');
  const [otpRole, setOtpRole] = useState<'player' | 'turf_owner'>('player');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [errorMsg, setErrorMsg] = useState('');

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();
  const googleAuthMutation = useGoogleAuth();

  const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'com.glorysports.app' }),
      responseType: AuthSession.ResponseType.Token,
      scopes: ['openid', 'profile', 'email'],
    },
    GOOGLE_DISCOVERY,
  );

  const [googleLoading, setGoogleLoading] = useState(false);

  const isLoading =
    loginMutation.isPending ||
    registerMutation.isPending ||
    sendOtpMutation.isPending ||
    verifyOtpMutation.isPending ||
    googleAuthMutation.isPending ||
    googleLoading;

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const accessToken =
        (googleResponse as any).authentication?.accessToken ??
        (googleResponse as any).params?.access_token;
      if (accessToken) {
        setGoogleLoading(true);
        setErrorMsg('');
        googleAuthMutation.mutateAsync({ data: { accessToken } })
          .then((res) => {
            if (res.token) return finish(res.token);
          })
          .catch((e: any) => {
            setErrorMsg(e?.data?.error || e?.message || 'Google sign-in failed. Please try again.');
          })
          .finally(() => setGoogleLoading(false));
      }
    } else if (googleResponse?.type === 'error') {
      setErrorMsg('Google sign-in was cancelled or failed.');
    }
  }, [googleResponse]);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await googlePromptAsync();
  };

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const resetAll = () => {
    setPhone(''); setPassword(''); setName(''); setCity('');
    setRole('player'); setShowPassword(false); setErrorMsg('');
    setOtpPhone(''); setOtpCode(''); setOtpName(''); setOtpCity('');
    setOtpRole('player'); setDevOtp(null); setResendCountdown(0);
  };

  const goTo = (s: AuthScreen) => {
    Haptics.selectionAsync();
    setErrorMsg('');
    setScreen(s);
  };

  const finish = async (token: string) => {
    await setToken(token);
    resetAll();
    setScreen('landing');
    onClose();
  };

  // ── Password Login ──────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!phone || !password) { setErrorMsg('Please fill in all fields.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg('');
    try {
      const res = await loginMutation.mutateAsync({ data: { phone, password } });
      if (res.token) await finish(res.token);
    } catch (e: any) {
      setErrorMsg(e?.data?.error || e?.message || 'Invalid phone or password. Please try again.');
    }
  };

  // ── Password Register ───────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!name || !phone || !password) { setErrorMsg('Please fill in all required fields.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg('');
    try {
      const res = await registerMutation.mutateAsync({ data: { name, phone, password, city, role } as any });
      if (res.token) await finish(res.token);
    } catch (e: any) {
      setErrorMsg(e?.data?.error || e?.message || 'Registration failed. Phone may already be in use.');
    }
  };

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const cleaned = otpPhone.replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg('');
    try {
      const res = await sendOtpMutation.mutateAsync({ data: { phone: cleaned } });
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setOtpCode('');
      setResendCountdown(30);
      goTo('otp-verify');
    } catch (e: any) {
      setErrorMsg(e?.data?.error || e?.message || 'Failed to send OTP. Please try again.');
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (nameArg?: string, roleArg?: string, cityArg?: string) => {
    if (otpCode.length !== 6) { setErrorMsg('Enter the 6-digit OTP.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg('');
    try {
      const res = await verifyOtpMutation.mutateAsync({
        data: {
          phone: otpPhone.replace(/\s+/g, ''),
          otp: otpCode,
          name: nameArg ?? null,
          role: roleArg ?? null,
          city: cityArg ?? null,
        },
      });

      if (res.newUser) {
        // Phone not yet registered — collect name & role
        goTo('otp-register');
        return;
      }

      if (res.token) {
        await finish(res.token);
      }
    } catch (e: any) {
      setErrorMsg(e?.data?.error || e?.message || 'Incorrect OTP. Please try again.');
    }
  };

  // ── OTP Register (new user) ─────────────────────────────────────────────────
  const handleOtpRegister = async () => {
    if (!otpName.trim()) { setErrorMsg('Please enter your name.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg('');
    // Re-verify OTP with name + role to create account
    await handleVerifyOtp(otpName.trim(), otpRole, otpCity.trim() || undefined);
  };

  // ── Resend OTP ──────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setErrorMsg('');
    setOtpCode('');
    setDevOtp(null);
    try {
      const res = await sendOtpMutation.mutateAsync({ data: { phone: otpPhone.replace(/\s+/g, '') } });
      if (res.devOtp) setDevOtp(res.devOtp);
      setResendCountdown(30);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setErrorMsg(e?.data?.error || 'Failed to resend OTP.');
    }
  };

  // ── Shared UI parts ─────────────────────────────────────────────────────────
  const BackBtn = ({ to }: { to: AuthScreen }) => (
    <Pressable onPress={() => goTo(to)} style={styles.backBtn}>
      <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
      <Text style={styles.backText}>Back</Text>
    </Pressable>
  );

  const RoleSelector = ({
    value,
    onChange,
  }: {
    value: 'player' | 'turf_owner';
    onChange: (v: 'player' | 'turf_owner') => void;
  }) => (
    <>
      <Text style={styles.roleLabel}>I am a...</Text>
      <View style={styles.roleRow}>
        {(['player', 'turf_owner'] as const).map((r) => (
          <Pressable
            key={r}
            style={[styles.roleChip, value === r && styles.roleChipActive]}
            onPress={() => { Haptics.selectionAsync(); onChange(r); }}
          >
            <Text style={styles.roleChipEmoji}>{r === 'player' ? '🏏' : '🏟️'}</Text>
            <Text style={[styles.roleChipText, value === r && styles.roleChipTextActive]}>
              {r === 'player' ? 'Player' : 'Turf Owner'}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  // ── Landing ─────────────────────────────────────────────────────────────────
  const renderLanding = () => (
    <View style={styles.landingContent}>
      <View style={styles.heroSection}>
        <CricketLogo size={88} />
        <Text style={styles.brandName}>GLORY SPORTS</Text>
        <Text style={styles.tagline}>India's #1 Cricket Ecosystem</Text>
        <Text style={styles.subTagline}>Book turfs · Build teams · Track glory</Text>
      </View>

      <View style={styles.authOptions}>
        {/* OTP — primary for India */}
        <Pressable style={styles.primaryBtn} onPress={() => goTo('otp-phone')}>
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            style={styles.primaryBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Login with OTP</Text>
          </LinearGradient>
        </Pressable>

        {/* Google Sign-In */}
        <Pressable
          style={[styles.socialBtn, (!googleRequest || googleLoading) && { opacity: 0.6 }]}
          onPress={handleGoogleSignIn}
          disabled={!googleRequest || googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
          ) : (
            <View style={styles.googleIconWrap}>
              <Text style={styles.googleG}>G</Text>
            </View>
          )}
          <Text style={styles.socialBtnText}>Continue with Google</Text>
          <View style={{ width: 32 }} />
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or use phone + password</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable style={[styles.outlineBtn, { flex: 1 }]} onPress={() => goTo('phone-login')}>
            <Text style={styles.outlineBtnText}>Sign In</Text>
          </Pressable>
          <Pressable style={[styles.outlineBtn, { flex: 1 }]} onPress={() => goTo('phone-register')}>
            <Text style={styles.outlineBtnText}>Register</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  // ── OTP: Phone Entry ────────────────────────────────────────────────────────
  const renderOtpPhone = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <BackBtn to="landing" />

        <View style={styles.formHeader}>
          <CricketLogo size={56} />
          <Text style={styles.formTitle}>Enter Your Number</Text>
          <Text style={styles.formSubtitle}>We'll send a 6-digit OTP to verify</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrap}>
            <Text style={styles.dialCode}>🇮🇳 +91</Text>
            <View style={styles.inputSep} />
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="phone-pad"
              maxLength={10}
              value={otpPhone}
              onChangeText={setOtpPhone}
            />
          </View>
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, otpPhone.length < 10 && { opacity: 0.5 }]}
          onPress={handleSendOtp}
          disabled={isLoading || otpPhone.length < 10}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            style={styles.primaryBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {sendOtpMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Send OTP</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── OTP: Verify ─────────────────────────────────────────────────────────────
  const renderOtpVerify = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <BackBtn to="otp-phone" />

        <View style={styles.formHeader}>
          <CricketLogo size={56} />
          <Text style={styles.formTitle}>Enter OTP</Text>
          <Text style={styles.formSubtitle}>
            Sent to +91 {otpPhone}
          </Text>
        </View>

        {devOtp && (
          <View style={styles.devOtpBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#F97316" />
            <Text style={styles.devOtpText}>
              Dev mode — OTP: <Text style={styles.devOtpCode}>{devOtp}</Text>
            </Text>
          </View>
        )}

        <OtpBoxInput value={otpCode} onChange={setOtpCode} />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, otpCode.length < 6 && { opacity: 0.5 }]}
          onPress={() => handleVerifyOtp()}
          disabled={isLoading || otpCode.length < 6}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            style={styles.primaryBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {verifyOtpMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Verify OTP</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable
          style={[styles.switchBtn, resendCountdown > 0 && { opacity: 0.5 }]}
          onPress={handleResendOtp}
          disabled={resendCountdown > 0 || sendOtpMutation.isPending}
        >
          <Text style={styles.switchText}>
            {resendCountdown > 0
              ? `Resend OTP in ${resendCountdown}s`
              : "Didn't receive it? "}
            {resendCountdown === 0 && (
              <Text style={styles.switchLink}>Resend OTP</Text>
            )}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── OTP: New User Registration ──────────────────────────────────────────────
  const renderOtpRegister = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <BackBtn to="otp-verify" />

        <View style={styles.formHeader}>
          <CricketLogo size={56} />
          <Text style={styles.formTitle}>Almost There!</Text>
          <Text style={styles.formSubtitle}>Tell us a bit about yourself</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={otpName}
              onChangeText={setOtpName}
            />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="City (optional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={otpCity}
              onChangeText={setOtpCity}
            />
          </View>
        </View>

        <RoleSelector value={otpRole} onChange={setOtpRole} />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, !otpName.trim() && { opacity: 0.5 }]}
          onPress={handleOtpRegister}
          disabled={isLoading || !otpName.trim()}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            style={styles.primaryBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {verifyOtpMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trophy-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Start Playing</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Phone Login (password) ──────────────────────────────────────────────────
  const renderPhoneLogin = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <BackBtn to="landing" />

        <View style={styles.formHeader}>
          <CricketLogo size={56} />
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in with phone & password</Text>
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
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            style={styles.primaryBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {loginMutation.isPending ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Sign In</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => goTo('phone-register')} style={styles.switchBtn}>
          <Text style={styles.switchText}>
            Don't have an account? <Text style={styles.switchLink}>Create one</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Phone Register (password) ───────────────────────────────────────────────
  const renderPhoneRegister = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <BackBtn to="landing" />

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

        <RoleSelector value={role} onChange={setRole} />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={handleRegister} disabled={isLoading}>
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            style={styles.primaryBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {registerMutation.isPending ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Create Account</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => goTo('phone-login')} style={styles.switchBtn}>
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Sign In</Text>
          </Text>
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
        {screen === 'otp-phone' && renderOtpPhone()}
        {screen === 'otp-verify' && renderOtpVerify()}
        {screen === 'otp-register' && renderOtpRegister()}
        {screen === 'phone-login' && renderPhoneLogin()}
        {screen === 'phone-register' && renderPhoneRegister()}
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  glowTop: {
    position: 'absolute', top: -60, left: '20%', width: 260, height: 260,
    borderRadius: 130, backgroundColor: '#F97316', opacity: 0.12,
  },
  glowBottom: {
    position: 'absolute', bottom: -60, right: '10%', width: 200, height: 200,
    borderRadius: 100, backgroundColor: '#7C3AED', opacity: 0.10,
  },

  landingContent: {
    flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingBottom: 48,
  },
  heroSection: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 24,
  },
  brandName: {
    fontSize: 34, fontWeight: '900', color: '#F97316', letterSpacing: 4, marginTop: 16,
    fontFamily: 'Inter_700Bold',
  },
  tagline: {
    fontSize: 17, color: '#FAFAFA', fontWeight: '600', letterSpacing: 0.5,
    fontFamily: 'Inter_600SemiBold',
  },
  subTagline: {
    fontSize: 13, color: '#64748B', fontFamily: 'Inter_400Regular', letterSpacing: 0.5,
  },

  authOptions: { gap: 12 },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', gap: 12,
  },
  socialBtnText: {
    flex: 1, textAlign: 'center', color: '#FAFAFA', fontSize: 15,
    fontWeight: '600', fontFamily: 'Inter_600SemiBold',
  },
  googleIconWrap: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  googleG: { fontSize: 18, fontWeight: '700', color: '#4285F4' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: '#64748B', fontSize: 12, fontFamily: 'Inter_400Regular' },

  primaryBtn: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#F97316', shadowOpacity: 0.45, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  primaryBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  outlineBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.5)',
  },
  outlineBtnText: { color: '#F97316', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  formContent: { paddingHorizontal: 28, paddingBottom: 40, paddingTop: 16, flexGrow: 1 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24, alignSelf: 'flex-start' },
  backText: { color: 'rgba(255,255,255,0.7)', fontSize: 15 },

  formHeader: { alignItems: 'center', gap: 10, marginBottom: 32 },
  formTitle: { fontSize: 28, fontWeight: '800', color: '#FAFAFA', fontFamily: 'Inter_700Bold', marginTop: 12 },
  formSubtitle: { fontSize: 14, color: '#64748B', fontFamily: 'Inter_400Regular', textAlign: 'center' },

  inputGroup: { gap: 12, marginBottom: 20 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FAFAFA', fontSize: 15, fontFamily: 'Inter_400Regular' },
  eyeBtn: { padding: 6 },

  dialCode: { color: '#FAFAFA', fontSize: 15, fontFamily: 'Inter_500Medium', marginRight: 10 },
  inputSep: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)', marginRight: 10 },

  devOtpBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(249,115,22,0.10)',
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 4,
  },
  devOtpText: { color: '#94A3B8', fontSize: 13, fontFamily: 'Inter_400Regular' },
  devOtpCode: { color: '#F97316', fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 2 },

  roleLabel: { color: '#94A3B8', fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 10 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)',
  },
  roleChipActive: { backgroundColor: 'rgba(249,115,22,0.15)', borderColor: '#F97316' },
  roleChipEmoji: { fontSize: 18 },
  roleChipText: { color: '#94A3B8', fontWeight: '600', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  roleChipTextActive: { color: '#F97316' },

  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 8, fontFamily: 'Inter_400Regular' },

  switchBtn: { alignItems: 'center', marginTop: 20 },
  switchText: { color: '#64748B', fontSize: 14, fontFamily: 'Inter_400Regular' },
  switchLink: { color: '#F97316', fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
