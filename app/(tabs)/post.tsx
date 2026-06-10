import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const GOOGLE_API_KEY = 'AIzaSyC9w_A1-1lPhvtTTuCFdIQejyfm9GOJXRc';
const sportOptions = ['Basketball', 'Volleyball', 'Softball'];
const stateOptions = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const divisionOptions = ['6U','8U','10U','12U','14U','16U','18U','Adults'];
const genderOptions = ['Boys', 'Girls', 'Coed', 'Womens', 'Mens'];
const placeLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function TrophyIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
      <Path d="M8 3h8v8a4 4 0 0 1-8 0V3Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M12 15v4M9 21h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function SuccessTrophy() {
  return (
    <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
      <Path d="M8 3h8v8a4 4 0 0 1-8 0V3Z" stroke="#008080" strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3" stroke="#008080" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 15v4M9 21h6" stroke="#008080" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export default function PostScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [headerHeight, setHeaderHeight] = useState(120);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [zip, setZip] = useState('');
  const [spots, setSpots] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [spectatorFee, setSpectatorFee] = useState('');
  const [divisions, setDivisions] = useState<string[]>([]);
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [gender, setGender] = useState('');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [rosterSize, setRosterSize] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [prizeType, setPrizeType] = useState<'cash' | 'other'>('cash');
  const [prizeRows, setPrizeRows] = useState(['', '', '']);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDue, setDepositDue] = useState('');
  const [showDepositDuePicker, setShowDepositDuePicker] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const entryFeeRef = useRef<TextInput>(null);
  const spectatorFeeRef = useRef<TextInput>(null);
  const rosterSizeRef = useRef<TextInput>(null);
  const spotsRef = useRef<TextInput>(null);
  const contactNameRef = useRef<TextInput>(null);
  const contactPhoneRef = useRef<TextInput>(null);
  const contactEmailRef = useRef<TextInput>(null);
  const depositAmountRef = useRef<TextInput>(null);

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

  const toggleDivision = (d: string) => {
    setDivisions(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const updatePrizeRow = (index: number, val: string) => {
    if (prizeType === 'cash') {
      const digits = val.replace(/,/g, '');
      if (!/^\d*$/.test(digits)) return;
      const formatted = digits ? parseInt(digits).toLocaleString('en-US') : '';
      setPrizeRows(prev => prev.map((p, i) => i === index ? formatted : p));
    } else {
      setPrizeRows(prev => prev.map((p, i) => i === index ? val : p));
    }
  };

  const addPrizeRow = () => { if (prizeRows.length < 8) setPrizeRows(prev => [...prev, '']); };
  const focusDeposit = () => { depositAmountRef.current?.focus(); scrollRef.current?.scrollTo({ y: 999, animated: true }); };
  const handleStartConfirm = (date: Date) => { setStartDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })); setShowStartPicker(false); };
  const handleEndConfirm = (date: Date) => { setEndDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })); setShowEndPicker(false); };
  const handleDepositDueConfirm = (date: Date) => { setDepositDue(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })); setShowDepositDuePicker(false); };

  const handleSubmit = async () => {
    if (!name || !sport || !startDate || !endDate || !city || !state || !spots) return;
    const user = auth.currentUser;
    if (!user) { Alert.alert('Sign in required', 'You need to be logged in to post a tournament.'); return; }
    setLoading(true);
    const prizesFormatted = prizeRows.map((val, i) => val.trim() ? `${placeLabels[i]}: ${prizeType === 'cash' ? '$' : ''}${val.trim().replace(/,/g, '')}` : null).filter(Boolean).join(' · ');
    try {
      await addDoc(collection(db, 'tournaments'), {
        name, sport, date: `${startDate} - ${endDate}`, address, city, state, zip,
        location: `${city}, ${state}`, spots: parseInt(spots),
        entryFee: entryFee ? `$${entryFee}` : '', spectatorFee: spectatorFee ? `$${spectatorFee}` : '',
        divisions, gender, rosterSize, contactName, contactPhone, contactEmail, prizeType,
        prizes: prizesFormatted, depositAmount: depositAmount ? `$${depositAmount}` : '',
        depositDue, status: 'active', createdAt: serverTimestamp(), postedBy: user.uid,
      });
      setSubmitted(true);
    } catch (e) { console.error('Error posting tournament:', e); }
    setLoading(false);
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <SuccessTrophy />
        <Text style={[styles.successTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
          TOURNAMENT POSTED!
        </Text>
        <Text style={styles.successSub}>Your tournament is now live on Zony.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => { setSubmitted(false); router.push('/'); }}>
          <Text style={[styles.backText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.headerBlock} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height={headerHeight} viewBox="0 0 390 130" preserveAspectRatio="xMidYMid slice">
            <Polygon points="0,0 80,30 40,80" fill="white" opacity={0.04} />
            <Polygon points="80,30 160,10 120,70" fill="white" opacity={0.07} />
            <Polygon points="40,80 120,70 80,130" fill="white" opacity={0.05} />
            <Polygon points="160,10 260,50 180,90" fill="white" opacity={0.06} />
            <Polygon points="120,70 180,90 100,130" fill="white" opacity={0.08} />
            <Polygon points="260,50 330,20 310,80" fill="white" opacity={0.05} />
            <Polygon points="180,90 310,80 240,130" fill="white" opacity={0.07} />
            <Polygon points="330,20 390,0 390,60" fill="white" opacity={0.04} />
            <Polygon points="310,80 390,60 390,130" fill="white" opacity={0.06} />
            <Polygon points="0,60 40,80 0,130" fill="white" opacity={0.05} />
            <Polygon points="0,0 40,0 80,30" fill="white" opacity={0.08} />
            <Polygon points="160,10 260,0 260,50" fill="white" opacity={0.04} />
            <Polygon points="260,0 330,20 390,0" fill="white" opacity={0.06} />
            <Polygon points="240,130 310,80 390,130" fill="white" opacity={0.05} />
            <Polygon points="80,130 180,90 240,130" fill="white" opacity={0.04} />
          </Svg>
          <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CREATE TOURNAMENT</Text>
          <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Fill out the details below</Text>
        </View>

        <View style={styles.form}>

          <Text style={styles.label}>Tournament Name</Text>
          <TextInput style={styles.input} placeholder="Tournament name" placeholderTextColor="#a0b8b8" value={name} onChangeText={setName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { Keyboard.dismiss(); setShowSportPicker(true); }} />

          <Text style={styles.label}>Sport</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowSportPicker(!showSportPicker); setShowStatePicker(false); setShowDivisionPicker(false); setShowGenderPicker(false); }}>
            <Text style={sport ? styles.dropdownSelected : styles.dropdownPlaceholder}>{sport || 'Select a sport...'}</Text>
            <Text style={styles.dropdownArrow}>{showSportPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showSportPicker && (
            <View style={styles.dropdownList}>
              {sportOptions.map((s) => (
                <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setSport(s); setShowSportPicker(false); setShowStartPicker(true); }}>
                  <Text style={[styles.dropdownItemText, sport === s && styles.dropdownItemActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowStartPicker(true); }}>
            <Text style={startDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{startDate || 'Select start date...'}</Text>
          </TouchableOpacity>
          <DateTimePickerModal isVisible={showStartPicker} mode="date" onConfirm={(date) => { handleStartConfirm(date); setTimeout(() => setShowEndPicker(true), 500); }} onCancel={() => setShowStartPicker(false)} />

          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowEndPicker(true); }}>
            <Text style={endDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{endDate || 'Select end date...'}</Text>
          </TouchableOpacity>
          <DateTimePickerModal isVisible={showEndPicker} mode="date" onConfirm={(date) => { handleEndConfirm(date); setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 300); }} onCancel={() => setShowEndPicker(false)} />

          <Text style={styles.label}>Venue / Address</Text>
          <View style={styles.placesWrapper}>
            <GooglePlacesAutocomplete
              placeholder="Search gym, school, or address..."
              onPress={handlePlaceSelect}
              fetchDetails={true}
              minLength={2}
              listViewDisplayed="auto"
              textInputProps={{ placeholderTextColor: '#a0b8b8' }}
              query={{ key: GOOGLE_API_KEY, language: 'en', components: 'country:us' }}
              styles={{
                textInputContainer: { backgroundColor: 'transparent' },
                textInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8', height: 48 },
                listView: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e0d8c8', marginTop: 4 },
                row: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
                description: { fontSize: 14, color: '#003333' },
                separator: { backgroundColor: '#f0fafa' },
                predefinedPlacesDescription: { color: '#003333' },
              }}
              enablePoweredByContainer={false}
            />
          </View>

          {(address || city || state) ? (
            <View style={styles.autoFilledBox}>
              <Text style={styles.autoFilledText}>📍 {[address, city, state, zip].filter(Boolean).join(', ')}</Text>
              <TouchableOpacity onPress={() => { setAddress(''); setCity(''); setState(''); setZip(''); }}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Divisions */}
          <Text style={styles.label}>Divisions</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowDivisionPicker(!showDivisionPicker); setShowSportPicker(false); setShowStatePicker(false); setShowGenderPicker(false); }}>
            <Text style={divisions.length > 0 ? styles.dropdownSelected : styles.dropdownPlaceholder}>{divisions.length > 0 ? divisions.join(', ') : 'Select divisions...'}</Text>
            <Text style={styles.dropdownArrow}>{showDivisionPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showDivisionPicker && (
            <View style={styles.dropdownList}>
              {divisionOptions.map((d) => (
                <TouchableOpacity key={d} style={styles.dropdownItem} onPress={() => toggleDivision(d)}>
                  <Text style={[styles.dropdownItemText, divisions.includes(d) && styles.dropdownItemActive]}>{divisions.includes(d) ? '✓ ' : ''}{d}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.dropdownItem, { backgroundColor: '#e0f5f5' }]} onPress={() => { setShowDivisionPicker(false); setTimeout(() => entryFeeRef.current?.focus(), 100); }}>
                <Text style={{ color: '#008080', fontWeight: 'bold', textAlign: 'center' }}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Gender */}
          <Text style={styles.label}>Gender</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowGenderPicker(!showGenderPicker); setShowSportPicker(false); setShowStatePicker(false); setShowDivisionPicker(false); }}>
            <Text style={gender ? styles.dropdownSelected : styles.dropdownPlaceholder}>{gender || 'Select gender...'}</Text>
            <Text style={styles.dropdownArrow}>{showGenderPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showGenderPicker && (
            <View style={styles.dropdownList}>
              {genderOptions.map((g) => (
                <TouchableOpacity key={g} style={styles.dropdownItem} onPress={() => { setGender(g); setShowGenderPicker(false); setTimeout(() => entryFeeRef.current?.focus(), 100); }}>
                  <Text style={[styles.dropdownItemText, gender === g && styles.dropdownItemActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Entry Fee (per team)</Text>
          <TextInput ref={entryFeeRef} style={styles.input} placeholder="Amount in dollars" placeholderTextColor="#a0b8b8" value={entryFee} onChangeText={setEntryFee} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => spectatorFeeRef.current?.focus()} />

          <Text style={styles.label}>Spectator Entrance Fee <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput ref={spectatorFeeRef} style={styles.input} placeholder="Amount in dollars" placeholderTextColor="#a0b8b8" value={spectatorFee} onChangeText={setSpectatorFee} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => rosterSizeRef.current?.focus()} />

          <Text style={styles.label}>Roster Size</Text>
          <TextInput ref={rosterSizeRef} style={styles.input} placeholder="Number of players" placeholderTextColor="#a0b8b8" value={rosterSize} onChangeText={setRosterSize} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => spotsRef.current?.focus()} />

          <Text style={styles.label}>Available Spots</Text>
          <TextInput ref={spotsRef} style={styles.input} placeholder="Number of teams" placeholderTextColor="#a0b8b8" value={spots} onChangeText={setSpots} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactNameRef.current?.focus()} />

          <Text style={styles.label}>Contact Name</Text>
          <TextInput ref={contactNameRef} style={styles.input} placeholder="Contact name" placeholderTextColor="#a0b8b8" value={contactName} onChangeText={setContactName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactPhoneRef.current?.focus()} />

          <Text style={styles.label}>Contact Phone <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput ref={contactPhoneRef} style={styles.input} placeholder="Phone number" placeholderTextColor="#a0b8b8" value={contactPhone} onChangeText={v => setContactPhone(formatPhone(v))} keyboardType="phone-pad" maxLength={12} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactEmailRef.current?.focus()} />

          <Text style={styles.label}>Contact Email <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput ref={contactEmailRef} style={styles.input} placeholder="Email address" placeholderTextColor="#a0b8b8" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => Keyboard.dismiss()} />

          <Text style={styles.label}>Prizes / Awards</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, prizeType === 'cash' && styles.toggleBtnActive]} onPress={() => setPrizeType('cash')}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                <Rect x="3" y="6" width="18" height="12" rx="2" stroke={prizeType === 'cash' ? '#fff' : '#5a7a7a'} strokeWidth="2" />
                <Circle cx="12" cy="12" r="3" stroke={prizeType === 'cash' ? '#fff' : '#5a7a7a'} strokeWidth="2" />
              </Svg>
              <Text style={[styles.toggleBtnText, prizeType === 'cash' && styles.toggleBtnTextActive]}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, prizeType === 'other' && styles.toggleBtnActive]} onPress={() => setPrizeType('other')}>
              <TrophyIcon color={prizeType === 'other' ? '#fff' : '#5a7a7a'} />
              <Text style={[styles.toggleBtnText, prizeType === 'other' && styles.toggleBtnTextActive]}>Other</Text>
            </TouchableOpacity>
          </View>

          {prizeRows.map((val, i) => (
            <View key={i} style={styles.prizeRow}>
              <View style={styles.prizeLabel}>
                <Text style={styles.prizeLabelText}>{placeLabels[i]}</Text>
              </View>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={prizeType === 'cash' ? 'Amount in dollars' : 'Prize description'}
                placeholderTextColor="#a0b8b8"
                value={val}
                onChangeText={(t) => updatePrizeRow(i, t)}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={focusDeposit}
              />
            </View>
          ))}

          {prizeRows.length < 8 && (
            <TouchableOpacity style={styles.addPrizeBtn} onPress={addPrizeRow}>
              <Text style={styles.addPrizeBtnText}>+ Add Place</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Deposit Amount <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput ref={depositAmountRef} style={styles.input} placeholder="Amount in dollars" placeholderTextColor="#a0b8b8" value={depositAmount} onChangeText={setDepositAmount} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { Keyboard.dismiss(); setShowDepositDuePicker(true); }} />

          <Text style={styles.label}>Deposit Due Date <Text style={styles.optional}>(optional)</Text></Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowDepositDuePicker(true); }}>
            <Text style={depositDue ? styles.dropdownSelected : styles.dropdownPlaceholder}>{depositDue || 'Select deposit due date...'}</Text>
          </TouchableOpacity>
          <DateTimePickerModal isVisible={showDepositDuePicker} mode="date" onConfirm={handleDepositDueConfirm} onCancel={() => setShowDepositDuePicker(false)} />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.submitText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              {loading ? 'Posting...' : 'POST TOURNAMENT'}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { backgroundColor: '#008080', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 0, marginBottom: 8 },
  header: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 3 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 2 },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#003333', marginBottom: 6, marginTop: 10 },
  optional: { fontSize: 12, fontWeight: '400', color: '#a0b8b8' },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', marginBottom: 4, borderWidth: 1, borderColor: '#e0d8c8' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 4 },
  dropdownPlaceholder: { fontSize: 15, color: '#a0b8b8' },
  dropdownSelected: { fontSize: 15, color: '#003333', flex: 1, marginRight: 8 },
  dropdownArrow: { fontSize: 12, color: '#008080' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  dropdownItemText: { fontSize: 15, color: '#003333' },
  dropdownItemActive: { color: '#008080', fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: '#e0d8c8' },
  toggleBtnActive: { backgroundColor: '#7A1E1E', borderColor: '#7A1E1E' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#5a7a7a' },
  toggleBtnTextActive: { color: '#fff' },
  prizeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  prizeLabel: { backgroundColor: '#7A1E1E', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, minWidth: 36, alignItems: 'center' },
  prizeLabelText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  addPrizeBtn: { borderWidth: 1, borderColor: '#008080', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 16, backgroundColor: '#e0f5f5' },
  addPrizeBtnText: { color: '#008080', fontWeight: 'bold', fontSize: 15 },
  submitBtn: { backgroundColor: '#7A1E1E', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  successContainer: { flex: 1, backgroundColor: '#f5ede0', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  successTitle: { fontSize: 32, color: '#008080', letterSpacing: 2, marginTop: 8, textAlign: 'center' },
  successSub: { fontSize: 16, color: '#5a7a7a', textAlign: 'center' },
  backBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, marginTop: 20 },
  backText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  placesWrapper: { marginBottom: 12, zIndex: 10 },
  autoFilledBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  autoFilledText: { fontSize: 13, color: '#003333', flex: 1, marginRight: 8 },
  clearText: { fontSize: 13, color: '#008080', fontWeight: 'bold' },
});