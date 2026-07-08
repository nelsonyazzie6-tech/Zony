import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { auth, db, storage } from '../firebaseConfig';

const GOOGLE_API_KEY = 'AIzaSyC9w_A1-1lPhvtTTuCFdIQejyfm9GOJXRc';
const sportOptions = ['Basketball', 'Volleyball', 'Softball'];
const divisionOptions = [
  '6U Boys', '6U Girls', '6U Coed',
  '8U Boys', '8U Girls', '8U Coed',
  '10U Boys', '10U Girls', '10U Coed',
  '12U Boys', '12U Girls', '12U Coed',
  '14U Boys', '14U Girls', '14U Coed',
  '16U Boys', '16U Girls', '16U Coed',
  '18U Boys', '18U Girls', '18U Coed',
  'HS Boys', 'HS Girls', 'HS Coed',
  'Adult Men', 'Adult Women', 'Adult Coed',
];

function LocationIcon({ size = 13, color = '#003333' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" />
      <Circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

function CheckIcon({ size = 13, color = '#3D4A7A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="m8 12 3 3 5-6" />
    </Svg>
  );
}

function CalendarIcon({ size = 16, color = '#3D4A7A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

async function sendPush(token: string, title: string, body: string) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default' }),
    });
  } catch (_) {}
}

async function uploadFlyerAsync(uri: string, path: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
}

function InfoModal({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{title}</Text>
          <Text style={styles.modalMsg}>{message}</Text>
          <TouchableOpacity style={styles.modalOkBtn} onPress={onClose}>
            <Text style={[styles.modalOkText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function EditCampScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  const [name, setName] = useState('');
  const [flyerImageUrl, setFlyerImageUrl] = useState<string | null>(null);
  const [flyerUri, setFlyerUri] = useState<string | null>(null);
  const [flyerRemoved, setFlyerRemoved] = useState(false);
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [showAgeGroupPicker, setShowAgeGroupPicker] = useState(false);
  const [price, setPrice] = useState('');
  const [isFreeCamp, setIsFreeCamp] = useState(false);
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false, title: '', message: '',
  });

  const originalRef = useRef<{ startDate: string; location: string; registeredUsers: string[] }>({
    startDate: '', location: '', registeredUsers: [],
  });

  const contactNameRef = useRef<TextInput>(null);
  const contactPhoneRef = useRef<TextInput>(null);
  const contactEmailRef = useRef<TextInput>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'camps', id as string));
      if (!snap.exists()) return;
      const d = snap.data();
      setName(d.name || '');
      setFlyerImageUrl(d.flyerImageUrl || null);
      setSport(d.sport || '');
      setStartDate(d.startDate || '');
      setEndDate(d.endDate || '');
      if (d.startDateValue?.toDate) setStartDateObj(d.startDateValue.toDate());
      if (d.endDateValue?.toDate) setEndDateObj(d.endDateValue.toDate());
      setAddress(d.address || '');
      setCity(d.city || '');
      setState(d.state || '');
      setZip(d.zip || '');
      setAgeGroups(d.ageGroups || []);
      if (d.price === 'Free') {
        setIsFreeCamp(true);
        setPrice('');
      } else {
        setIsFreeCamp(false);
        setPrice(d.price?.replace('$', '') || '');
      }
      setDescription(d.description || '');
      setContactName(d.contactName || '');
      setContactPhone(d.contactPhone || '');
      setContactEmail(d.contactEmail || '');

    let registeredUserIds: string[] = [];
      try {
        const regsSnap = await getDocs(collection(db, 'camps', id as string, 'registrations'));
        registeredUserIds = regsSnap.docs
          .map(r => r.data().registeredBy)
          .filter(Boolean);
      } catch (_) {}

      originalRef.current = {
        startDate: d.startDate || '',
        location: d.location || `${d.city || ''}, ${d.state || ''}`,
        registeredUsers: registeredUserIds,
      };

      setDataLoaded(true);
    };
    load();
  }, []);

  const toggleAgeGroup = (d: string) => {
    setAgeGroups(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const pickFlyer = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setFlyerUri(result.assets[0].uri);
      setFlyerRemoved(false);
    }
  };

  const removeFlyer = () => {
    setFlyerUri(null);
    setFlyerImageUrl(null);
    setFlyerRemoved(true);
  };

  const handlePlaceSelect = (data: any, details: any) => {
    if (!details) return;
    const components = details.address_components;
    let streetNumber = '', streetName = '', cityVal = '', stateVal = '', zipVal = '';
    components.forEach((c: any) => {
      if (c.types.includes('street_number')) streetNumber = c.long_name;
      if (c.types.includes('route')) streetName = c.long_name;
      if (c.types.includes('locality')) cityVal = c.long_name;
      if (c.types.includes('administrative_area_level_1')) stateVal = c.short_name;
      if (c.types.includes('postal_code')) zipVal = c.long_name;
    });
    setAddress(streetNumber ? `${streetNumber} ${streetName}` : streetName);
    setCity(cityVal); setState(stateVal); setZip(zipVal);
  };

  const handleStartConfirm = (date: Date) => {
    setStartDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setStartDateObj(date);
    setShowStartPicker(false);
  };
  const handleEndConfirm = (date: Date) => {
    setEndDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setEndDateObj(date);
    setShowEndPicker(false);
  };

  const handleSave = async () => {
    const missing: string[] = [];
    if (!name) missing.push('Camp Name');
    if (!sport) missing.push('Sport');
    if (!startDate) missing.push('Start Date');
    if (!city || !state) missing.push('Venue / Address (city & state)');

    if (missing.length > 0) {
      setInfoModal({ visible: true, title: 'MISSING INFORMATION', message: `Please fill in:\n\n${missing.join('\n')}` });
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      let organizerName = '';
      let organizerPhoto = '';
      if (user) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          organizerName = userSnap.data().username || '';
          organizerPhoto = userSnap.data().photoURL || '';
        }
      }

      const newLocation = `${city}, ${state}`;

      let flyerFieldUpdate: { flyerImageUrl?: string } = {};
      if (flyerUri) {
        try {
          const url = await uploadFlyerAsync(flyerUri, `camps/${id}/flyer.jpg`);
          flyerFieldUpdate.flyerImageUrl = url;
        } catch (_) {}
      } else if (flyerRemoved) {
        try {
          await deleteObject(storageRef(storage, `camps/${id}/flyer.jpg`));
        } catch (_) {}
        flyerFieldUpdate.flyerImageUrl = '';
      }

      await updateDoc(doc(db, 'camps', id as string), {
        name, sport,
        startDate, endDate: endDate || startDate,
        startDateValue: startDateObj || null,
        endDateValue: endDateObj || startDateObj || null,
        address, city, state, zip,
        location: newLocation,
        ageGroups,
        price: isFreeCamp ? 'Free' : (price ? `$${price}` : ''),
        description,
        contactName, contactPhone, contactEmail,
        organizerName, organizerPhoto,
        ...flyerFieldUpdate,
      });

 const original = originalRef.current;
      const dateChanged = original.startDate !== startDate;
      const locationChanged = original.location !== newLocation;

      if ((dateChanged || locationChanged) && original.registeredUsers.length > 0) {
        let message = 'Camp details updated';
        if (dateChanged) message = 'Camp schedule changed';
        else if (locationChanged) message = 'Camp location changed';

        const bodyParts: string[] = [];
        if (dateChanged) bodyParts.push(`New date: ${startDate}${endDate && endDate !== startDate ? ` - ${endDate}` : ''}`);
        if (locationChanged) bodyParts.push(`New location: ${newLocation}`);
        const body = bodyParts.length > 0 ? bodyParts.join(' • ') : `${name} has been updated`;

        try {
          await Promise.all(
            original.registeredUsers
              .filter((uid: string) => uid !== user?.uid)
              .map(async (uid: string) => {
                await addDoc(collection(db, 'notifications'), {
                  toUserId: uid,
                  message: `${message}: ${name}`,
                  body,
                  link: `/camp?id=${id}&postedBy=${user?.uid}`,
                  createdAt: serverTimestamp(),
                  read: false,
                });
                const userSnap = await getDoc(doc(db, 'users', uid));
                if (userSnap.exists() && userSnap.data().pushToken && userSnap.data().notificationsEnabled !== false) {
                  await sendPush(userSnap.data().pushToken, `⛺ ${message}`, `${name} — ${body}`);
                }
              })
          );
        } catch (_) {}
      }

      router.back();
    } catch (_) {
      setInfoModal({
        visible: true,
        title: 'SAVE FAILED',
        message: 'We couldn\'t save your changes. Check your internet connection and try again.',
      });
    }
    setLoading(false);
  };

  if (!dataLoaded) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView ref={scrollRef} style={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EDIT CAMP</Text>
          <Text style={styles.sub}>Update the details below</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Camp Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Summer Skills Camp" placeholderTextColor="#a0b8b8" value={name} onChangeText={setName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => Keyboard.dismiss()} />

            <Text style={styles.label}>Flyer <Text style={styles.optional}>(optional)</Text></Text>
            {(flyerUri || flyerImageUrl) ? (
              <View style={styles.flyerPreviewBlock}>
                <Image source={{ uri: flyerUri || flyerImageUrl || '' }} style={styles.flyerPreviewImage} resizeMode="cover" />
                <View style={styles.flyerPreviewActions}>
                  <TouchableOpacity onPress={pickFlyer} style={styles.flyerActionBtn}>
                    <Text style={[styles.flyerActionText, { color: '#3D4A7A' }]}>Change Flyer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={removeFlyer} style={styles.flyerActionBtn}>
                    <Text style={[styles.flyerActionText, { color: '#cc4444' }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.flyerUploadBox} onPress={pickFlyer}>
                <Text style={styles.flyerUploadText}>+ Add Flyer Image</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Sport</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowSportPicker(!showSportPicker); }}>
              <Text style={sport ? styles.dropdownSelected : styles.dropdownPlaceholder}>{sport || 'Select a sport...'}</Text>
              <Text style={styles.dropdownArrow}>{showSportPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showSportPicker && (
              <View style={styles.dropdownList}>
                {sportOptions.map((s) => (
                  <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setSport(s); setShowSportPicker(false); }}>
                    <Text style={[styles.dropdownItemText, sport === s && styles.dropdownItemActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowStartPicker(true); }}>
              <Text style={startDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{startDate || 'Select start date...'}</Text>
              <CalendarIcon size={16} color="#3D4A7A" />
            </TouchableOpacity>
            <DateTimePickerModal isVisible={showStartPicker} mode="date" onConfirm={handleStartConfirm} onCancel={() => setShowStartPicker(false)} />

            <Text style={styles.label}>End Date <Text style={styles.optional}>(optional, for multi-day camps)</Text></Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowEndPicker(true); }}>
              <Text style={endDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{endDate || 'Same as start date'}</Text>
              <CalendarIcon size={16} color="#3D4A7A" />
            </TouchableOpacity>
            <DateTimePickerModal isVisible={showEndPicker} mode="date" onConfirm={handleEndConfirm} onCancel={() => setShowEndPicker(false)} />

            <Text style={styles.label}>Venue / Address</Text>
            <View style={styles.placesWrapper}>
              <GooglePlacesAutocomplete
                placeholder="Search gym, school, or address..."
                onPress={handlePlaceSelect}
                fetchDetails={true}
                minLength={2}
                listViewDisplayed="auto"
                query={{ key: GOOGLE_API_KEY, language: 'en', components: 'country:us' }}
                styles={{
                  textInputContainer: { backgroundColor: 'transparent' },
                  textInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8', height: 48 },
                  listView: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e0d8c8', marginTop: 4 },
                  row: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
                  description: { fontSize: 14, color: '#003333' },
                  separator: { backgroundColor: '#f0fafa' },
                }}
                enablePoweredByContainer={false}
              />
            </View>
            {(address || city || state) ? (
              <View style={styles.autoFilledBox}>
                <View style={styles.autoFilledTextRow}>
                  <LocationIcon size={13} color="#003333" />
                  <Text style={styles.autoFilledText}>{[address, city, state, zip].filter(Boolean).join(', ')}</Text>
                </View>
                <TouchableOpacity onPress={() => { setAddress(''); setCity(''); setState(''); setZip(''); }}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.label}>Age Groups / Divisions <Text style={styles.optional}>(optional)</Text></Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowAgeGroupPicker(!showAgeGroupPicker); }}>
              <Text style={ageGroups.length > 0 ? styles.dropdownSelected : styles.dropdownPlaceholder}>{ageGroups.length > 0 ? ageGroups.join(', ') : 'Select age groups...'}</Text>
              <Text style={styles.dropdownArrow}>{showAgeGroupPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showAgeGroupPicker && (
              <View style={styles.dropdownList}>
                {divisionOptions.map((d) => (
                  <TouchableOpacity key={d} style={styles.dropdownItemRow} onPress={() => toggleAgeGroup(d)}>
                    {ageGroups.includes(d) ? <CheckIcon size={13} color="#3D4A7A" /> : null}
                    <Text style={[styles.dropdownItemText, ageGroups.includes(d) && styles.dropdownItemActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.dropdownItem, { backgroundColor: '#faf3e0' }]} onPress={() => setShowAgeGroupPicker(false)}>
                  <Text style={{ color: '#3D4A7A', fontWeight: 'bold', textAlign: 'center' }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>Camp Fee</Text>
            <TouchableOpacity style={styles.freeSpectatorToggle} onPress={() => { const next = !isFreeCamp; setIsFreeCamp(next); if (next) setPrice(''); }}>
              <View style={[styles.checkbox, isFreeCamp && styles.checkboxActive]}>
                {isFreeCamp ? <CheckIcon size={12} color="#fff" /> : null}
              </View>
              <Text style={styles.freeSpectatorText}>Free Camp</Text>
            </TouchableOpacity>
            {!isFreeCamp && (
              <TextInput style={styles.input} placeholder="Amount in dollars" placeholderTextColor="#a0b8b8" value={price} onChangeText={v => setPrice(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" returnKeyType="next" />
            )}

            <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="What players will work on, what to bring, schedule details, etc." placeholderTextColor="#a0b8b8" value={description} onChangeText={setDescription} multiline numberOfLines={5} />

            <Text style={styles.label}>Contact Name</Text>
            <TextInput ref={contactNameRef} style={styles.input} placeholder="Contact name" placeholderTextColor="#a0b8b8" value={contactName} onChangeText={setContactName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactPhoneRef.current?.focus()} />

            <Text style={styles.label}>Contact Phone <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput ref={contactPhoneRef} style={styles.input} placeholder="Phone number" placeholderTextColor="#a0b8b8" value={contactPhone} onChangeText={v => setContactPhone(formatPhone(v))} keyboardType="phone-pad" maxLength={12} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactEmailRef.current?.focus()} />

            <Text style={styles.label}>Contact Email <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput ref={contactEmailRef} style={styles.input} placeholder="Email address" placeholderTextColor="#a0b8b8" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => Keyboard.dismiss()} />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#3D4A7A' }]} onPress={handleSave} disabled={loading}>
              <Text style={[styles.submitText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{loading ? 'Saving...' : 'SAVE CHANGES'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <InfoModal visible={infoModal.visible} title={infoModal.title} message={infoModal.message} onClose={() => setInfoModal({ visible: false, title: '', message: '' })} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  backBtn: { paddingHorizontal: 20, marginBottom: 8 },
  backText: { fontSize: 16, color: '#3D4A7A', fontWeight: '600' },
  header: { fontSize: 28, fontWeight: '900', color: '#003333', paddingHorizontal: 20, letterSpacing: 2 },
  sub: { fontSize: 14, color: '#5a7a7a', paddingHorizontal: 20, marginBottom: 24, marginTop: 4 },
  form: { paddingHorizontal: 20, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', color: '#003333', marginBottom: 6, marginTop: 10 },
  optional: { fontSize: 12, fontWeight: '400', color: '#a0b8b8' },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', marginBottom: 4, borderWidth: 1, borderColor: '#e0d8c8' },
  textArea: { height: 120, textAlignVertical: 'top' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 4 },
  dropdownPlaceholder: { fontSize: 15, color: '#a0b8b8' },
  dropdownSelected: { fontSize: 15, color: '#003333', flex: 1, marginRight: 8 },
  dropdownArrow: { fontSize: 12, color: '#3D4A7A' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  dropdownItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  dropdownItemText: { fontSize: 15, color: '#003333' },
  dropdownItemActive: { color: '#3D4A7A', fontWeight: 'bold' },
  submitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  placesWrapper: { marginBottom: 12, zIndex: 10 },
  autoFilledBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf3e0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  autoFilledTextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  autoFilledText: { fontSize: 13, color: '#003333', flex: 1 },
  clearText: { fontSize: 13, color: '#3D4A7A', fontWeight: 'bold' },
  freeSpectatorToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#e0d8c8', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#3D4A7A', borderColor: '#3D4A7A' },
  freeSpectatorText: { fontSize: 14, color: '#003333', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 24, width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 20, color: '#003333', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  modalMsg: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  modalOkBtn: { backgroundColor: '#3D4A7A', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalOkText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
  flyerPreviewBlock: { marginBottom: 8 },
  flyerPreviewImage: { width: '100%', height: 180, borderRadius: 14, backgroundColor: '#e0d8c8' },
  flyerPreviewActions: { flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'center' },
  flyerActionBtn: { paddingVertical: 4 },
  flyerActionText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  flyerUploadBox: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#3D4A7A', borderRadius: 14, paddingVertical: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: '#fff' },
  flyerUploadText: { fontSize: 15, fontWeight: '600', color: '#3D4A7A' },
});