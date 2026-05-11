import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch,
  TextInput, Alert, Platform, Animated, KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetMe, useGetMyTurfs, useListBookings, useUpdateMyProfile } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type VerificationStatus = 'verified' | 'pending' | 'rejected';

const LANGUAGES = ['English', 'Hindi', 'Marathi'];

function SectionCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[sectionStyles.card, { backgroundColor: colors.card }]}>
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.emoji}>{emoji}</Text>
        <Text style={[sectionStyles.title, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: { borderRadius: 20, marginHorizontal: 16, marginBottom: 14, padding: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  emoji: { fontSize: 20 },
  title: { fontSize: 16, fontWeight: '800', fontFamily: 'Inter_700Bold' },
});

function InfoRow({ icon, label, value, onPress }: { icon: string; label: string; value?: string | null; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={[infoRowStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[infoRowStyles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
        <Feather name={icon as any} size={15} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[infoRowStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[infoRowStyles.value, { color: value ? colors.text : colors.mutedForeground }]} numberOfLines={1}>
          {value || 'Not set'}
        </Text>
      </View>
      {onPress && <Feather name="chevron-right" size={15} color={colors.mutedForeground} />}
    </Pressable>
  );
}

const infoRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 1 },
  value: { fontSize: 14, fontWeight: '600' },
});

function VerificationBadge({ status, label }: { status: VerificationStatus; label: string }) {
  const colors = useColors();
  const cfg = {
    verified: { color: '#10B981', bg: '#10B98118', icon: 'check-circle', text: 'Verified' },
    pending: { color: '#F59E0B', bg: '#F59E0B18', icon: 'clock', text: 'Pending' },
    rejected: { color: '#EF4444', bg: '#EF444418', icon: 'x-circle', text: 'Rejected' },
  }[status];
  return (
    <View style={[vbStyles.row, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
      <Feather name={cfg.icon as any} size={16} color={cfg.color} />
      <View style={{ flex: 1 }}>
        <Text style={[vbStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[vbStyles.status, { color: cfg.color }]}>{cfg.text}</Text>
      </View>
    </View>
  );
}
const vbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '600' },
  status: { fontSize: 13, fontWeight: '800' },
});

function ToggleRow({ icon, label, sub, value, onToggle }: { icon: string; label: string; sub: string; value: boolean; onToggle: () => void }) {
  const colors = useColors();
  return (
    <View style={[toggleStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[toggleStyles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
        <Feather name={icon as any} size={15} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[toggleStyles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[toggleStyles.sub, { color: colors.mutedForeground }]}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={() => { Haptics.selectionAsync(); onToggle(); }}
        trackColor={{ false: '#334155', true: '#F97316' }}
        thumbColor="#fff"
      />
    </View>
  );
}
const toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 11, marginTop: 1 },
});

export default function TurfOwnerProfile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setToken } = useAuth();

  const { data: me, isLoading, refetch } = useGetMe();
  const { data: myTurfs } = useGetMyTurfs();
  const { data: bookings } = useListBookings();
  const updateProfile = useUpdateMyProfile();

  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<'personal' | 'business' | 'location' | 'payment'>('personal');
  const [activeLanguage, setActiveLanguage] = useState('English');

  const [notifs, setNotifs] = useState({
    push: true,
    whatsapp: true,
    bookingReminders: true,
    matchReminders: false,
  });

  const [personal, setPersonal] = useState({ name: me?.name ?? '', city: me?.city ?? '', email: me?.email ?? '', phone: me?.phone ?? '' });
  const [business, setBusiness] = useState({ businessName: '', businessType: 'Individual', gst: '' });
  const [location, setLocation] = useState({ address: '', landmark: '' });
  const [payment, setPayment] = useState({ accountHolder: '', accountNo: '', ifsc: '', upi: '' });

  const kycStatus: VerificationStatus = 'pending';
  const turfVerification: VerificationStatus = (myTurfs?.[0] as any)?.verificationStatus === 'verified' ? 'verified' : 'pending';
  const isFullyVerified = (kycStatus as string) === 'verified' && (turfVerification as string) === 'verified';

  const totalTurfs = myTurfs?.length ?? 0;
  const totalBookings = (bookings as any[])?.length ?? 0;

  const openEdit = (section: typeof editSection) => {
    setPersonal({ name: me?.name ?? '', city: me?.city ?? '', email: me?.email ?? '', phone: me?.phone ?? '' });
    setEditSection(section);
    setEditOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (editSection === 'personal') {
        await updateProfile.mutateAsync({ data: { city: personal.city } });
        refetch();
      }
      setEditOpen(false);
      Alert.alert('Saved', 'Your changes have been saved.');
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => setToken(null) },
    ]);
  };

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0), paddingBottom: 120 }}
      >
        {/* ── Hero Header ── */}
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Text style={[styles.heroLabel, { color: colors.primary }]}>My Profile</Text>
            <Pressable onPress={() => openEdit('personal')} style={[styles.editBtn, { borderColor: colors.primary }]}>
              <Feather name="edit-2" size={13} color={colors.primary} />
              <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              <LinearGradient colors={['#F97316', '#EA580C']} style={styles.avatar}>
                <Text style={styles.avatarText}>{(me?.name?.[0] ?? 'T').toUpperCase()}</Text>
              </LinearGradient>
              {isFullyVerified && (
                <View style={styles.verifiedRing}>
                  <Feather name="check" size={10} color="#fff" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.heroName} numberOfLines={1}>{me?.name ?? 'Turf Owner'}</Text>
                {turfVerification === 'verified' && (
                  <View style={styles.checkBadge}>
                    <Feather name="check-circle" size={16} color="#10B981" />
                  </View>
                )}
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>🏟️ Turf Owner</Text>
              </View>
              <Text style={styles.heroPhone}>📱 {me?.phone ?? '—'}</Text>
              {me?.email && <Text style={styles.heroEmail}>✉️ {me.email}</Text>}
            </View>
          </View>

          {/* Summary mini cards */}
          <View style={styles.summaryRow}>
            {[
              { val: totalTurfs, lab: 'Turfs', emoji: '🏟️' },
              { val: totalBookings, lab: 'Bookings', emoji: '📅' },
              { val: 0, lab: 'Matches Hosted', emoji: '🏏' },
            ].map((s, i) => (
              <View key={i} style={[styles.summaryCard, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Text style={styles.summaryEmoji}>{s.emoji}</Text>
                <Text style={styles.summaryVal}>{s.val}</Text>
                <Text style={styles.summaryLab}>{s.lab}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Personal Information ── */}
        <SectionCard title="Personal Information" emoji="👤">
          <InfoRow icon="user" label="Full Name" value={me?.name} onPress={() => openEdit('personal')} />
          <InfoRow icon="phone" label="Mobile Number" value={me?.phone} />
          <InfoRow icon="mail" label="Email Address" value={me?.email} onPress={() => openEdit('personal')} />
          <InfoRow icon="map-pin" label="City" value={me?.city} onPress={() => openEdit('personal')} />
          <View style={{ gap: 8 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Language Preference</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LANGUAGES.map(lang => (
                <Pressable
                  key={lang}
                  onPress={() => { Haptics.selectionAsync(); setActiveLanguage(lang); }}
                  style={[styles.langChip, {
                    backgroundColor: activeLanguage === lang ? colors.primary : colors.background,
                    borderColor: activeLanguage === lang ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[styles.langChipText, { color: activeLanguage === lang ? '#fff' : colors.text }]}>{lang}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </SectionCard>

        {/* ── Business Information ── */}
        <SectionCard title="Business Information" emoji="🏢">
          <InfoRow icon="briefcase" label="Business / Turf Name" value={business.businessName || null} onPress={() => openEdit('business')} />
          <InfoRow icon="tag" label="Business Type" value={business.businessType} onPress={() => openEdit('business')} />
          <InfoRow icon="file-text" label="GST Number" value={business.gst || null} onPress={() => openEdit('business')} />
          <InfoRow icon="layers" label="Turfs Managed" value={String(totalTurfs)} />
        </SectionCard>

        {/* ── Location ── */}
        <SectionCard title="Location Information" emoji="📍">
          <InfoRow icon="home" label="Full Address" value={location.address || null} onPress={() => openEdit('location')} />
          <InfoRow icon="map" label="Google Maps Location" value={null} onPress={() => Alert.alert('Maps', 'Google Maps integration coming soon!')} />
          <InfoRow icon="flag" label="Nearby Landmark" value={location.landmark || null} onPress={() => openEdit('location')} />
        </SectionCard>

        {/* ── Verification ── */}
        <SectionCard title="Verification" emoji="✅">
          <VerificationBadge status={kycStatus} label="KYC Verification" />
          <VerificationBadge status={turfVerification} label="Turf Verification" />
          {isFullyVerified ? (
            <View style={[styles.verifiedOwnerBanner, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}>
              <Text style={styles.verifiedOwnerText}>🏆 Verified Turf Owner</Text>
              <Text style={[styles.verifiedOwnerSub, { color: colors.mutedForeground }]}>Your account is fully verified</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => Alert.alert('KYC', 'Complete your KYC to unlock full features.')}
              style={[styles.kycCta, { backgroundColor: colors.primary }]}
            >
              <Feather name="shield" size={16} color="#fff" />
              <Text style={styles.kycCtaText}>Complete KYC Verification</Text>
            </Pressable>
          )}
        </SectionCard>

        {/* ── Payment & Payout ── */}
        <SectionCard title="Payment & Payout" emoji="🏦">
          <View style={[styles.secureNote, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
            <Feather name="lock" size={13} color="#10B981" />
            <Text style={[styles.secureNoteText, { color: '#10B981' }]}>Your banking info is encrypted and secure</Text>
          </View>
          <InfoRow icon="user" label="Account Holder Name" value={payment.accountHolder || null} onPress={() => openEdit('payment')} />
          <InfoRow icon="credit-card" label="Bank Account Number" value={payment.accountNo ? `••••${payment.accountNo.slice(-4)}` : null} onPress={() => openEdit('payment')} />
          <InfoRow icon="hash" label="IFSC Code" value={payment.ifsc || null} onPress={() => openEdit('payment')} />
          <InfoRow icon="smartphone" label="UPI ID" value={payment.upi || null} onPress={() => openEdit('payment')} />
        </SectionCard>

        {/* ── Notifications ── */}
        <SectionCard title="Notification Settings" emoji="🔔">
          <ToggleRow
            icon="bell" label="Push Notifications" sub="Get alerts on your device"
            value={notifs.push} onToggle={() => setNotifs(n => ({ ...n, push: !n.push }))}
          />
          <ToggleRow
            icon="message-circle" label="WhatsApp Alerts" sub="Receive alerts via WhatsApp"
            value={notifs.whatsapp} onToggle={() => setNotifs(n => ({ ...n, whatsapp: !n.whatsapp }))}
          />
          <ToggleRow
            icon="calendar" label="Booking Reminders" sub="Reminded before each booking"
            value={notifs.bookingReminders} onToggle={() => setNotifs(n => ({ ...n, bookingReminders: !n.bookingReminders }))}
          />
          <ToggleRow
            icon="award" label="Match Reminders" sub="Alerted when matches are scheduled"
            value={notifs.matchReminders} onToggle={() => setNotifs(n => ({ ...n, matchReminders: !n.matchReminders }))}
          />
        </SectionCard>

        {/* ── Account Settings ── */}
        <View style={[sectionStyles.card, { backgroundColor: colors.card }]}>
          <View style={sectionStyles.header}>
            <Text style={sectionStyles.emoji}>⚙️</Text>
            <Text style={[sectionStyles.title, { color: colors.text }]}>Account Settings</Text>
          </View>
          {[
            { icon: 'lock', label: 'Change Password', sub: 'Update your account password', color: colors.text, onPress: () => Alert.alert('Change Password', 'Password change coming soon!') },
            { icon: 'refresh-cw', label: 'Switch Role', sub: 'Switch to Player account', color: colors.text, onPress: () => Alert.alert('Switch Role', 'Role switching coming soon!') },
            { icon: 'shield', label: 'Privacy Settings', sub: 'Control your data & visibility', color: colors.text, onPress: () => Alert.alert('Privacy', 'Privacy settings coming soon!') },
            { icon: 'log-out', label: 'Sign Out', sub: 'See you on the pitch!', color: '#EF4444', onPress: handleSignOut },
          ].map((item, i, arr) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={[styles.menuRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color === '#EF4444' ? '#EF444418' : colors.primary + '18' }]}>
                <Feather name={item.icon as any} size={17} color={item.color === '#EF4444' ? '#EF4444' : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: item.color }]}>{item.label}</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ── Edit Bottom Sheet ── */}
      {editOpen && (
        <Pressable style={styles.overlay} onPress={() => setEditOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <Pressable onPress={e => e.stopPropagation()}>
              <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
                <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>
                    {editSection === 'personal' && 'Personal Info'}
                    {editSection === 'business' && 'Business Info'}
                    {editSection === 'location' && 'Location Info'}
                    {editSection === 'payment' && 'Payment Details'}
                  </Text>
                  <Pressable onPress={() => setEditOpen(false)}>
                    <Ionicons name="close" size={22} color={colors.mutedForeground} />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
                  {editSection === 'personal' && (
                    <>
                      <EditField icon="user" label="Full Name" value={personal.name} onChange={v => setPersonal(p => ({ ...p, name: v }))} placeholder="Your full name" colors={colors} />
                      <EditField icon="mail" label="Email" value={personal.email} onChange={v => setPersonal(p => ({ ...p, email: v }))} placeholder="email@example.com" colors={colors} keyboardType="email-address" />
                      <EditField icon="map-pin" label="City" value={personal.city} onChange={v => setPersonal(p => ({ ...p, city: v }))} placeholder="Your city" colors={colors} />
                    </>
                  )}
                  {editSection === 'business' && (
                    <>
                      <EditField icon="briefcase" label="Business Name" value={business.businessName} onChange={v => setBusiness(b => ({ ...b, businessName: v }))} placeholder="e.g. Sharma Sports Arena" colors={colors} />
                      <EditField icon="file-text" label="GST Number (Optional)" value={business.gst} onChange={v => setBusiness(b => ({ ...b, gst: v }))} placeholder="GST number" colors={colors} />
                    </>
                  )}
                  {editSection === 'location' && (
                    <>
                      <EditField icon="home" label="Full Address" value={location.address} onChange={v => setLocation(l => ({ ...l, address: v }))} placeholder="Street, area, city" colors={colors} multiline />
                      <EditField icon="flag" label="Nearby Landmark" value={location.landmark} onChange={v => setLocation(l => ({ ...l, landmark: v }))} placeholder="e.g. Near Railway Station" colors={colors} />
                    </>
                  )}
                  {editSection === 'payment' && (
                    <>
                      <View style={[styles.payWarning, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B40' }]}>
                        <Feather name="alert-triangle" size={14} color="#F59E0B" />
                        <Text style={styles.payWarningText}>Ensure details are correct. Wrong details may cause payout failures.</Text>
                      </View>
                      <EditField icon="user" label="Account Holder Name" value={payment.accountHolder} onChange={v => setPayment(p => ({ ...p, accountHolder: v }))} placeholder="As per bank records" colors={colors} />
                      <EditField icon="credit-card" label="Account Number" value={payment.accountNo} onChange={v => setPayment(p => ({ ...p, accountNo: v }))} placeholder="Enter account number" colors={colors} keyboardType="numeric" secureTextEntry />
                      <EditField icon="hash" label="IFSC Code" value={payment.ifsc} onChange={v => setPayment(p => ({ ...p, ifsc: v }))} placeholder="e.g. SBIN0001234" colors={colors} />
                      <EditField icon="smartphone" label="UPI ID" value={payment.upi} onChange={v => setPayment(p => ({ ...p, upi: v }))} placeholder="yourname@upi" colors={colors} />
                    </>
                  )}
                </ScrollView>

                <View style={styles.sheetActions}>
                  <Pressable onPress={() => setEditOpen(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleSave} disabled={updateProfile.isPending} style={{ flex: 2, borderRadius: 14, overflow: 'hidden' }}>
                    <LinearGradient colors={['#F97316', '#EA580C']} style={styles.saveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {updateProfile.isPending
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      )}
    </View>
  );
}

function EditField({ icon, label, value, onChange, placeholder, colors, multiline, keyboardType, secureTextEntry }: {
  icon: string; label: string; value: string; onChange: (v: string) => void;
  placeholder: string; colors: any; multiline?: boolean; keyboardType?: any; secureTextEntry?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[efStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[efStyles.row, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Feather name={icon as any} size={15} color={colors.mutedForeground} />
        <TextInput
          style={[efStyles.input, { color: colors.text }, multiline && { height: 72, textAlignVertical: 'top', paddingTop: 4 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

const efStyles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, minHeight: 48 },
  input: { flex: 1, fontSize: 15 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 24, marginBottom: 0 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 20 },
  heroLabel: { fontSize: 22, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  editBtnText: { fontSize: 13, fontWeight: '700' },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '900' },
  verifiedRing: { position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0F172A' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  heroName: { color: '#F8FAFC', fontSize: 20, fontWeight: '900', fontFamily: 'Inter_700Bold', flex: 1 },
  checkBadge: { marginTop: 2 },
  roleBadge: { backgroundColor: '#F9731620', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8, borderWidth: 1, borderColor: '#F9731640' },
  roleBadgeText: { color: '#F97316', fontSize: 12, fontWeight: '800' },
  heroPhone: { color: '#94A3B8', fontSize: 13, marginBottom: 3 },
  heroEmail: { color: '#94A3B8', fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 3 },
  summaryEmoji: { fontSize: 18 },
  summaryVal: { color: '#F8FAFC', fontSize: 20, fontWeight: '900', fontFamily: 'Inter_700Bold' },
  summaryLab: { color: '#94A3B8', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  langChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  langChipText: { fontSize: 13, fontWeight: '700' },
  verifiedOwnerBanner: { alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, gap: 4 },
  verifiedOwnerText: { fontSize: 16, fontWeight: '900', color: '#10B981' },
  verifiedOwnerSub: { fontSize: 12 },
  kycCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 },
  kycCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secureNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  secureNoteText: { fontSize: 12, fontWeight: '600', flex: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  menuIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700' },
  menuSub: { fontSize: 12, marginTop: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  payWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  payWarningText: { color: '#F59E0B', fontSize: 12, flex: 1, fontWeight: '500' },
});
