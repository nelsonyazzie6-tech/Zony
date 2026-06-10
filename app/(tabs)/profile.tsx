import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const AVATAR_COLORS = ['#008080', '#7A1E1E', '#B8860B'];

const FAQ = [
  { q: 'How do I post a tournament?', a: 'Tap the Post tab at the bottom of the screen and fill out the tournament details.' },
  { q: 'How do I register a team?', a: 'Open a tournament, scroll to the bottom, and tap "Register Team". Fill out your team info and submit.' },
  { q: 'How do I cancel my registration?', a: 'Open the tournament you registered for and tap "Registered ✓ (tap to cancel)".' },
  { q: 'How do I post on the Sports Board?', a: 'Go to the Board tab and tap "+ POST TO BOARD" at the bottom.' },
  { q: 'How do I delete my post?', a: 'Open your post and tap "Delete Post" — only visible to the original poster.' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [myPosted, setMyPosted] = useState([]);
  const [myJoined, setMyJoined] = useState([]);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showFullName, setShowFullName] = useState(true);

  const avatarColor = useMemo(() => {
    const index = (user?.uid?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const loadUserData = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        if (snap.data().photoURL) setPhotoURL(snap.data().photoURL);
        if (snap.data().username) setFullName(snap.data().username);
        if (snap.data().notificationsEnabled !== undefined) setNotificationsEnabled(snap.data().notificationsEnabled);
        if (snap.data().showFullName !== undefined) setShowFullName(snap.data().showFullName);
      }
    };
    loadUserData();

    const postedQuery = query(collection(db, 'tournaments'), where('postedBy', '==', user.uid));
    const unsubPosted = onSnapshot(postedQuery, snap => {
      setMyPosted(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const joinedQuery = query(collection(db, 'tournaments'), where('joinedUsers', 'array-contains', user.uid));
    const unsubJoined = onSnapshot(joinedQuery, snap => {
      setMyJoined(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubPosted(); unsubJoined(); };
  }, []);

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      // Compress to 400x400 and 60% quality
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Upload to Firebase Storage
      const response = await fetch(compressed.uri);
      const blob = await response.blob();
      const storage = getStorage();
      const storageRef = ref(storage, `profilePhotos/${user!.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Save URL to Firestore
      setPhotoURL(downloadURL);
      await setDoc(doc(db, 'users', user!.uid), { photoURL: downloadURL }, { merge: true });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    }
    setUploadingPhoto(false);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) { Alert.alert('Enter your name'); return; }
    try {
      await setDoc(doc(db, 'users', user!.uid), { username: nameInput.trim() }, { merge: true });
      setFullName(nameInput.trim());
      setShowNameModal(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleToggleNotifications = async (val: boolean) => {
    setNotificationsEnabled(val);
    await setDoc(doc(db, 'users', user!.uid), { notificationsEnabled: val }, { merge: true });
  };

  const handleTogglePrivacy = async (val: boolean) => {
    setShowFullName(val);
    await setDoc(doc(db, 'users', user!.uid), { showFullName: val }, { merge: true });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const displayName = fullName || '';
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto}>
          {uploadingPhoto ? (
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={[styles.avatarText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.name, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
          {displayName ? displayName.toUpperCase() : 'SET YOUR NAME'}
        </Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
          <Text style={styles.editBtnText}>{uploadingPhoto ? 'Uploading...' : 'Edit Profile Photo'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.infoRow} onPress={() => { setNameInput(fullName); setShowNameModal(true); }}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M8 1a4 4 0 1 1 0 8A4 4 0 0 1 8 1ZM2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="#008080" strokeWidth="1.4" strokeLinecap="round" />
          </Svg>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>FULL NAME</Text>
            <Text style={styles.infoValue}>{fullName || 'Tap to set your name'}</Text>
          </View>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Rect x="1" y="3" width="14" height="10" rx="2" stroke="#008080" strokeWidth="1.4" />
            <Path d="M1 6l7 4 7-4" stroke="#008080" strokeWidth="1.4" />
          </Svg>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>EMAIL</Text>
            <Text style={styles.infoValue}>{user?.email || '—'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.infoRow} onPress={() => setShowNotifModal(true)}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M8 1a5 5 0 0 1 5 5v3l1.5 2h-13L3 9V6a5 5 0 0 1 5-5Z" stroke="#666" strokeWidth="1.4" />
            <Path d="M6.5 13a1.5 1.5 0 0 0 3 0" stroke="#666" strokeWidth="1.4" />
          </Svg>
          <Text style={styles.settingLabel}>Notifications</Text>
          <View style={[styles.togglePill, { backgroundColor: notificationsEnabled ? '#008080' : '#e0e0e0' }]}>
            <Text style={styles.togglePillText}>{notificationsEnabled ? 'ON' : 'OFF'}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.infoRow} onPress={() => setShowPrivacyModal(true)}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#666" strokeWidth="1.4" />
            <Path d="M5 7V5a3 3 0 1 1 6 0v2" stroke="#666" strokeWidth="1.4" strokeLinecap="round" />
          </Svg>
          <Text style={styles.settingLabel}>Privacy</Text>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.infoRow} onPress={() => setShowHelpModal(true)}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Circle cx="8" cy="8" r="6" stroke="#666" strokeWidth="1.4" />
            <Path d="M6.5 6.5a1.5 1.5 0 1 1 2 1.4V9" stroke="#666" strokeWidth="1.4" strokeLinecap="round" />
            <Circle cx="8" cy="11.5" r="0.7" fill="#666" />
          </Svg>
          <Text style={styles.settingLabel}>Help & Support</Text>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <Path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ marginRight: 8 }}>
          <Path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Modal visible={showNameModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EDIT NAME</Text>
            <Text style={styles.modalSub}>This name will be displayed on your posts and profile.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Nelson Yazzie"
              placeholderTextColor="#a0b8b8"
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowNameModal(false)}>
                <Text style={[styles.modalCancelText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveName}>
                <Text style={[styles.modalSaveText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotifModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>NOTIFICATIONS</Text>
            <Text style={styles.modalSub}>Control whether you receive push notifications for tournament registrations and cancellations.</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#e0e0e0', true: '#008080' }}
                thumbColor="#fff"
              />
            </View>
            <Text style={styles.toggleHint}>
              {notificationsEnabled ? '✓ You will receive notifications' : '✗ Notifications are disabled'}
            </Text>
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowNotifModal(false)}>
              <Text style={[styles.modalDoneText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showPrivacyModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>PRIVACY</Text>
            <Text style={styles.modalSub}>Choose how your name appears on board posts and community posts.</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Show Full Name</Text>
              <Switch
                value={showFullName}
                onValueChange={handleTogglePrivacy}
                trackColor={{ false: '#e0e0e0', true: '#008080' }}
                thumbColor="#fff"
              />
            </View>
            <Text style={styles.toggleHint}>
              {showFullName ? '✓ Your full name is visible to others' : '✗ Only your initials will show'}
            </Text>
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowPrivacyModal(false)}>
              <Text style={[styles.modalDoneText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setShowHelpModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
              <Text style={[styles.sheetTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>HELP & SUPPORT</Text>
              <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('mailto:support@zony.app')}>
                <Text style={[styles.contactBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>✉️ CONTACT US</Text>
              </TouchableOpacity>
              <Text style={styles.faqHeader}>FREQUENTLY ASKED QUESTIONS</Text>
              {FAQ.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.faqItem}
                  onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  activeOpacity={0.8}
                >
                  <View style={styles.faqTop}>
                    <Text style={styles.faqQ}>{item.q}</Text>
                    <Text style={styles.faqChevron}>{expandedFaq === i ? '▲' : '▼'}</Text>
                  </View>
                  {expandedFaq === i && <Text style={styles.faqA}>{item.a}</Text>}
                </TouchableOpacity>
              ))}
              <Text style={styles.versionText}>Zony v1.0.0</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { paddingTop: 60, alignItems: 'center', paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 84, height: 84, borderRadius: 22, borderWidth: 4, borderColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  avatarImg: { width: 84, height: 84, borderRadius: 22, borderWidth: 4, borderColor: '#F5F0E8' },
  avatarText: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 26, fontWeight: '900', color: '#111', marginTop: 10, letterSpacing: 1 },
  email: { fontSize: 13, color: '#aaa', marginTop: 2 },
  editBtn: { marginTop: 10, paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20, borderWidth: 2, borderColor: '#008080' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#008080' },
  card: { backgroundColor: '#fff', borderRadius: 16, width: '90%', marginBottom: 12, borderWidth: 1, borderColor: '#e8e8e8', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#aaa', letterSpacing: 1, marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  settingLabel: { flex: 1, fontSize: 14, color: '#555', fontWeight: '500' },
  togglePill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  togglePillText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 44 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, width: '90%', paddingVertical: 14, borderWidth: 1, borderColor: '#fee2e2', marginTop: 4 },
  logoutText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 24, width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 22, color: '#003333', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalInput: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e8e8e8', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8' },
  modalCancelText: { fontSize: 15, color: '#555', letterSpacing: 1 },
  modalSaveBtn: { flex: 1, backgroundColor: '#008080', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalSaveText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
  modalDoneBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  modalDoneText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  toggleLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  toggleHint: { fontSize: 12, color: '#a0b8b8', textAlign: 'center', marginBottom: 16 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#f5ede0', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 22, color: '#003333', letterSpacing: 2, textAlign: 'center', marginBottom: 16, marginTop: 8 },
  contactBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 24 },
  contactBtnText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  faqHeader: { fontSize: 10, color: '#a0b8b8', letterSpacing: 2, fontWeight: '700', marginBottom: 10 },
  faqItem: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e8e8e8' },
  faqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1, marginRight: 8 },
  faqChevron: { fontSize: 10, color: '#a0b8b8' },
  faqA: { fontSize: 13, color: '#666', lineHeight: 20, marginTop: 10 },
  versionText: { fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 24 },
});