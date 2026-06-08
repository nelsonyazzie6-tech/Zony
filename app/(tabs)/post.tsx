import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { auth, db } from '../../firebaseConfig';

const GOOGLE_API_KEY = 'AIzaSyC9w_A1-1lPhvtTTuCFdIQejyfm9GOJXRc';

const sportOptions = ['Basketball', 'Soccer', 'Volleyball', 'Football', 'Baseball', 'Tennis', 'Other'];

const stateOptions = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

const divisionOptions = ['8U','10U','12U','14U Boys','14U Girls','HS Boys','HS Girls','Adult Men','Adult Women','Adult Coed','Open'];

const placeLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export default function PostScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

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
  const [rosterSize, setRosterSize] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [prizeType, setPrizeType] = useState<'cash' | 'other'>('cash');
  const [prizeRows, setPrizeRows] = useState(['', '', '']);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDue, setDepositDue] = useState('');
  const [showDepositDuePicker, setShowDepositDuePicker] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const cityRef = useRef<TextInput>(null);
  const zipRef = useRef<TextInput>(null);
  const entryFeeRef = useRef<TextInput>(null);
  const spectatorFeeRef = useRef<TextInput>(null);
  const rosterSizeRef = useRef<TextInput>(null);
  const spotsRef = useRef<TextInput>(null);
  const contactNameRef = useRef<TextInput>(null);
  const contactPhoneRef = useRef<TextInput>(null);
  const depositAmountRef = useRef<TextInput>(null);

  const handlePlaceSelect = (data: any, details: any) => {
    if (!details) return;
    const components = details.address_components;
    let streetNumber = '';
    let streetName = '';
    let cityVal = '';
    let stateVal = '';
    let zipVal = '';

    components.forEach((c: any) => {
      if (c.types.includes('street_number')) streetNumber = c.long_name;
      if (c.types.includes('route')) streetName = c.long_name;
      if (c.types.includes('locality')) cityVal = c.long_name;
      if (c.types.includes('administrative_area_level_1')) stateVal = c.short_name;
      if (c.types.includes('postal_code')) zipVal = c.long_name;
    });

    setAddress(streetNumber ? `${streetNumber} ${streetName}` : streetName);
    setCity(cityVal);
    setState(stateVal);
    setZip(zipVal);
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

  const addPrizeRow = () => {
    if (prizeRows.length < 8) setPrizeRows(prev => [...prev, '']);
  };

  const focusDeposit = () => {
    depositAmountRef.current?.focus();
    scrollRef.current?.scrollTo({ y: 999, animated: true });
  };

  const handleStartConfirm = (date: Date) => {
    setStartDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setShowStartPicker(false);
  };

  const handleEndConfirm = (date: Date) => {
    setEndDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setShowEndPicker(false);
  };

  const handleDepositDueConfirm = (date: Date) => {
    setDepositDue(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setShowDepositDuePicker(false);
  };

  const handleSubmit = async () => {
    if (!name || !sport || !startDate || !endDate || !city || !state || !spots) return;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sign in required', 'You need to be logged in to post a tournament.');
      return;
    }
    setLoading(true);
    const prizesFormatted = prizeRows
      .map((val, i) => val.trim() ? `${placeLabels[i]}: ${prizeType === 'cash' ? '$' : ''}${val.trim().replace(/,/g, '')}` : null)
      .filter(Boolean)
      .join(' · ');
    try {
      await addDoc(collection(db, 'tournaments'), {
        name, sport,
        date: `${startDate} - ${endDate}`,
        address, city, state, zip,
        location: `${city}, ${state}`,
        spots: parseInt(spots),
        entryFee: entryFee ? `$${entryFee}` : '',
        spectatorFee: spectatorFee ? `$${spectatorFee}` : '',
        divisions, rosterSize, contactName, contactPhone,
        prizeType,
        prizes: prizesFormatted,
        depositAmount: depositAmount ? `$${depositAmount}` : '',
        depositDue,
        status: 'active',
        createdAt: serverTimestamp(),
        postedBy: user.uid,
      });
      setSubmitted(true);
    } catch (e) {
      console.error('Error posting tournament:', e);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Tournament Posted!</Text>
        <Text style={styles.successSub}>Your tournament is now live on Zony.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => { setSubmitted(false); router.push('/'); }}>
          <Text style={styles.backText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Post a Tournament</Text>
        <Text style={styles.sub}>Fill out the details below</Text>

        <View style={styles.form}>

          <Text style={styles.label}>Tournament Name</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. Gallup Summer Hoops" placeholderTextColor="#a0b8b8" value={name} onChangeText={setName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { Keyboard.dismiss(); setShowSportPicker(true); }} />
            <TouchableOpacity style={styles.doneBtn} onPress={() => { Keyboard.dismiss(); setShowSportPicker(true); }}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Sport</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.dropdown, { flex: 1 }]} onPress={() => { Keyboard.dismiss(); setShowSportPicker(!showSportPicker); setShowStatePicker(false); setShowDivisionPicker(false); }}>
              <Text style={sport ? styles.dropdownSelected : styles.dropdownPlaceholder}>{sport || 'Select a sport...'}</Text>
              <Text style={styles.dropdownArrow}>{showSportPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneBtn, !sport && styles.doneBtnDim]} onPress={() => { if (sport) { setShowSportPicker(false); setShowStartPicker(true); } }}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>
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
          <View style={styles.row}>
            <TouchableOpacity style={[styles.dropdown, { flex: 1 }]} onPress={() => { Keyboard.dismiss(); setShowStartPicker(true); }}>
              <Text style={startDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{startDate || 'Select start date...'}</Text>
              <Text style={styles.dropdownArrow}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneBtn, !startDate && styles.doneBtnDim]} onPress={() => { if (startDate) setShowEndPicker(true); }}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>
          <DateTimePickerModal isVisible={showStartPicker} mode="date" onConfirm={(date) => { handleStartConfirm(date); setTimeout(() => setShowEndPicker(true), 500); }} onCancel={() => setShowStartPicker(false)} />

          <Text style={styles.label}>End Date</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.dropdown, { flex: 1 }]} onPress={() => { Keyboard.dismiss(); setShowEndPicker(true); }}>
              <Text style={endDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{endDate || 'Select end date...'}</Text>
              <Text style={styles.dropdownArrow}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneBtn, !endDate && styles.doneBtnDim]} onPress={() => { if (endDate) setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 300); }}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>
          <DateTimePickerModal isVisible={showEndPicker} mode="date" onConfirm={(date) => { handleEndConfirm(date); setTimeout(() => { scrollRef.current?.scrollTo({ y: 420, animated: true }); }, 300); }} onCancel={() => setShowEndPicker(false)} />

          <Text style={styles.label}>Venue / Address</Text>
          <View style={styles.placesWrapper}>
            <GooglePlacesAutocomplete
              placeholder="Search gym, school, or address..."
              onPress={handlePlaceSelect}
              fetchDetails={true}
              minLength={2}
              listViewDisplayed="auto"
              query={{
                key: GOOGLE_API_KEY,
                language: 'en',
                components: 'country:us',
              }}
              styles={{
                textInputContainer: { backgroundColor: 'transparent' },
                textInput: {
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: '#1a0f0a',
                  borderWidth: 1,
                  borderColor: '#e0f0f0',
                  height: 48,
                },
                listView: {
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#e0f0f0',
                  marginTop: 4,
                },
                row: { paddingHorizontal: 16, paddingVertical: 12 },
                description: { fontSize: 14, color: '#003333' },
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

          <Text style={styles.label}>Divisions</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.dropdown, { flex: 1 }]} onPress={() => { Keyboard.dismiss(); setShowDivisionPicker(!showDivisionPicker); setShowSportPicker(false); setShowStatePicker(false); }}>
              <Text style={divisions.length > 0 ? styles.dropdownSelected : styles.dropdownPlaceholder}>{divisions.length > 0 ? divisions.join(', ') : 'Select divisions...'}</Text>
              <Text style={styles.dropdownArrow}>{showDivisionPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={() => { setShowDivisionPicker(false); setTimeout(() => entryFeeRef.current?.focus(), 100); }}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>
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

          <Text style={styles.label}>Entry Fee (per team)</Text>
          <View style={styles.row}>
            <TextInput ref={entryFeeRef} style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. 250" placeholderTextColor="#a0b8b8" value={entryFee} onChangeText={setEntryFee} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => spectatorFeeRef.current?.focus()} />
            <TouchableOpacity style={styles.doneBtn} onPress={() => spectatorFeeRef.current?.focus()}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Spectator Entrance Fee (optional)</Text>
          <View style={styles.row}>
            <TextInput ref={spectatorFeeRef} style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. 5" placeholderTextColor="#a0b8b8" value={spectatorFee} onChangeText={setSpectatorFee} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => rosterSizeRef.current?.focus()} />
            <TouchableOpacity style={styles.doneBtn} onPress={() => rosterSizeRef.current?.focus()}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Roster Size</Text>
          <View style={styles.row}>
            <TextInput ref={rosterSizeRef} style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. 8" placeholderTextColor="#a0b8b8" value={rosterSize} onChangeText={setRosterSize} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => spotsRef.current?.focus()} />
            <TouchableOpacity style={styles.doneBtn} onPress={() => spotsRef.current?.focus()}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Available Spots</Text>
          <View style={styles.row}>
            <TextInput ref={spotsRef} style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. 16" placeholderTextColor="#a0b8b8" value={spots} onChangeText={setSpots} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactNameRef.current?.focus()} />
            <TouchableOpacity style={styles.doneBtn} onPress={() => contactNameRef.current?.focus()}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Contact Name</Text>
          <View style={styles.row}>
            <TextInput ref={contactNameRef} style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. John Begay" placeholderTextColor="#a0b8b8" value={contactName} onChangeText={setContactName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactPhoneRef.current?.focus()} />
            <TouchableOpacity style={styles.doneBtn} onPress={() => contactPhoneRef.current?.focus()}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Contact Phone</Text>
          <View style={styles.row}>
            <TextInput ref={contactPhoneRef} style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. (928) 555-1234" placeholderTextColor="#a0b8b8" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => Keyboard.dismiss()} />
            <TouchableOpacity style={styles.doneBtn} onPress={() => Keyboard.dismiss()}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Prizes / Awards</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, prizeType === 'cash' && styles.toggleBtnActive]} onPress={() => setPrizeType('cash')}>
              <Text style={[styles.toggleBtnText, prizeType === 'cash' && styles.toggleBtnTextActive]}>💵 Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, prizeType === 'other' && styles.toggleBtnActive]} onPress={() => setPrizeType('other')}>
              <Text style={[styles.toggleBtnText, prizeType === 'other' && styles.toggleBtnTextActive]}>🏆 Other</Text>
            </TouchableOpacity>
          </View>

          {prizeRows.map((val, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.prizeLabel}>
                <Text style={styles.prizeLabelText}>{placeLabels[i]}</Text>
              </View>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={prizeType === 'cash' ? 'e.g. 4,000' : 'e.g. Trophy + shorts'}
                placeholderTextColor="#a0b8b8"
                value={val}
                onChangeText={(t) => updatePrizeRow(i, t)}
                keyboardType="default"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={focusDeposit}
              />
              <TouchableOpacity style={styles.doneBtn} onPress={focusDeposit}>
                <Text style={styles.doneBtnText}>✓</Text>
              </TouchableOpacity>
            </View>
          ))}

          {prizeRows.length < 8 && (
            <TouchableOpacity style={styles.addPrizeBtn} onPress={addPrizeRow}>
              <Text style={styles.addPrizeBtnText}>+ Add Place</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Deposit Amount (optional)</Text>
          <View style={styles.row}>
            <TextInput ref={depositAmountRef} style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. 150" placeholderTextColor="#a0b8b8" value={depositAmount} onChangeText={setDepositAmount} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { Keyboard.dismiss(); setShowDepositDuePicker(true); }} />
            <TouchableOpacity style={styles.doneBtn} onPress={() => { Keyboard.dismiss(); setShowDepositDuePicker(true); }}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Deposit Due Date (optional)</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.dropdown, { flex: 1 }]} onPress={() => { Keyboard.dismiss(); setShowDepositDuePicker(true); }}>
              <Text style={depositDue ? styles.dropdownSelected : styles.dropdownPlaceholder}>{depositDue || 'Select deposit due date...'}</Text>
              <Text style={styles.dropdownArrow}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneBtn, !depositDue && styles.doneBtnDim]} onPress={() => { if (depositDue) Keyboard.dismiss(); }}><Text style={styles.doneBtnText}>✓</Text></TouchableOpacity>
          </View>
          <DateTimePickerModal isVisible={showDepositDuePicker} mode="date" onConfirm={handleDepositDueConfirm} onCancel={() => setShowDepositDuePicker(false)} />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitText}>{loading ? 'Posting...' : 'Post Tournament'}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#003333', paddingHorizontal: 20 },
  sub: { fontSize: 16, color: '#5a7a7a', paddingHorizontal: 20, marginBottom: 24 },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#003333', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1a0f0a', marginBottom: 16, borderWidth: 1, borderColor: '#e0f0f0' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  doneBtn: { backgroundColor: '#008080', borderRadius: 10, width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  doneBtnDim: { opacity: 0.3 },
  doneBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0f0f0' },
  dropdownPlaceholder: { fontSize: 15, color: '#a0b8b8' },
  dropdownSelected: { fontSize: 15, color: '#003333', flex: 1, marginRight: 8 },
  dropdownArrow: { fontSize: 12, color: '#008080' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e0f0f0' },
  stateList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, maxHeight: 200, borderWidth: 1, borderColor: '#e0f0f0' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  dropdownItemText: { fontSize: 15, color: '#003333' },
  dropdownItemActive: { color: '#008080', fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#c0d8d8' },
  toggleBtnActive: { backgroundColor: '#008080', borderColor: '#008080' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#5a7a7a' },
  toggleBtnTextActive: { color: '#fff' },
  prizeLabel: { backgroundColor: '#008080', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, minWidth: 36, alignItems: 'center' },
  prizeLabelText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  addPrizeBtn: { borderWidth: 1, borderColor: '#008080', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 16, backgroundColor: '#e0f5f5' },
  addPrizeBtnText: { color: '#008080', fontWeight: 'bold', fontSize: 15 },
  submitBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },
  successContainer: { flex: 1, backgroundColor: '#f5ede0', alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIcon: { fontSize: 60, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#003333', marginBottom: 8 },
  successSub: { fontSize: 16, color: '#5a7a7a', marginBottom: 32, textAlign: 'center' },
  backBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  backText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  placesWrapper: { marginBottom: 12, zIndex: 10 },
  autoFilledBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  autoFilledText: { fontSize: 13, color: '#003333', flex: 1, marginRight: 8 },
  clearText: { fontSize: 13, color: '#008080', fontWeight: 'bold' },
});