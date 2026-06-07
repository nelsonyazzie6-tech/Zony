import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { auth, db } from '../../firebaseConfig';

const sportOptions = ['Basketball', 'Soccer', 'Volleyball', 'Football', 'Baseball', 'Tennis', 'Other'];

const stateOptions = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

const divisionOptions = ['8U','10U','12U','14U Boys','14U Girls','HS Boys','HS Girls','Adult Men','Adult Women','Adult Coed','Open'];

export default function PostScreen() {
  const router = useRouter();
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
  const [prizes, setPrizes] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDue, setDepositDue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleDivision = (d: string) => {
    setDivisions(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleStartConfirm = (date: Date) => {
    setStartDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setShowStartPicker(false);
  };

  const handleEndConfirm = (date: Date) => {
    setEndDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setShowEndPicker(false);
  };

  const handleSubmit = async () => {
    if (!name || !sport || !startDate || !city || !state || !spots) return;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sign in required', 'You need to be logged in to post a tournament.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'tournaments'), {
        name,
        sport,
        date: endDate ? `${startDate} - ${endDate}` : startDate,
        address,
        city,
        state,
        zip,
        location: `${city}, ${state}`,
        spots: parseInt(spots),
        entryFee: entryFee ? `$${entryFee}` : '',
        spectatorFee: spectatorFee ? `$${spectatorFee}` : '',
        divisions,
        rosterSize,
        contactName,
        contactPhone,
        prizes,
        depositAmount: depositAmount ? `$${depositAmount}` : '',
        depositDue,
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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>Post a Tournament</Text>
      <Text style={styles.sub}>Fill out the details below</Text>

      <View style={styles.form}>

        <Text style={styles.label}>Tournament Name</Text>
        <TextInput style={styles.input} placeholder="e.g. Gallup Summer Hoops" placeholderTextColor="#a89080" value={name} onChangeText={setName} />

        <Text style={styles.label}>Sport</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => { setShowSportPicker(!showSportPicker); setShowStatePicker(false); setShowDivisionPicker(false); }}>
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
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowStartPicker(true)}>
          <Text style={startDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{startDate || 'Select start date...'}</Text>
          <Text style={styles.dropdownArrow}>📅</Text>
        </TouchableOpacity>
        <DateTimePickerModal isVisible={showStartPicker} mode="date" onConfirm={handleStartConfirm} onCancel={() => setShowStartPicker(false)} minimumDate={new Date()} />

        <Text style={styles.label}>End Date (optional)</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowEndPicker(true)}>
          <Text style={endDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{endDate || 'Select end date...'}</Text>
          <Text style={styles.dropdownArrow}>📅</Text>
        </TouchableOpacity>
        <DateTimePickerModal isVisible={showEndPicker} mode="date" onConfirm={handleEndConfirm} onCancel={() => setShowEndPicker(false)} minimumDate={new Date()} />

        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} placeholder="e.g. 123 Main St" placeholderTextColor="#a89080" value={address} onChangeText={setAddress} />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} placeholder="e.g. Gallup" placeholderTextColor="#a89080" value={city} onChangeText={setCity} />

        <Text style={styles.label}>State</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => { setShowStatePicker(!showStatePicker); setShowSportPicker(false); setShowDivisionPicker(false); }}>
          <Text style={state ? styles.dropdownSelected : styles.dropdownPlaceholder}>{state || 'Select a state...'}</Text>
          <Text style={styles.dropdownArrow}>{showStatePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showStatePicker && (
          <ScrollView style={styles.stateList} nestedScrollEnabled>
            {stateOptions.map((s) => (
              <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setState(s); setShowStatePicker(false); }}>
                <Text style={[styles.dropdownItemText, state === s && styles.dropdownItemActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.label}>Zip Code</Text>
        <TextInput style={styles.input} placeholder="e.g. 87301" placeholderTextColor="#a89080" value={zip} onChangeText={setZip} keyboardType="numeric" maxLength={5} />

        <Text style={styles.label}>Divisions</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => { setShowDivisionPicker(!showDivisionPicker); setShowSportPicker(false); setShowStatePicker(false); }}>
          <Text style={divisions.length > 0 ? styles.dropdownSelected : styles.dropdownPlaceholder}>
            {divisions.length > 0 ? divisions.join(', ') : 'Select divisions...'}
          </Text>
          <Text style={styles.dropdownArrow}>{showDivisionPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showDivisionPicker && (
          <View style={styles.dropdownList}>
            {divisionOptions.map((d) => (
              <TouchableOpacity key={d} style={styles.dropdownItem} onPress={() => toggleDivision(d)}>
                <Text style={[styles.dropdownItemText, divisions.includes(d) && styles.dropdownItemActive]}>
                  {divisions.includes(d) ? '✓ ' : ''}{d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Entry Fee (per team)</Text>
        <TextInput style={styles.input} placeholder="e.g. 250" placeholderTextColor="#a89080" value={entryFee} onChangeText={setEntryFee} keyboardType="numeric" />

        <Text style={styles.label}>Spectator Entrance Fee (optional)</Text>
        <TextInput style={styles.input} placeholder="e.g. 5" placeholderTextColor="#a89080" value={spectatorFee} onChangeText={setSpectatorFee} keyboardType="numeric" />

        <Text style={styles.label}>Roster Size</Text>
        <TextInput style={styles.input} placeholder="e.g. 8" placeholderTextColor="#a89080" value={rosterSize} onChangeText={setRosterSize} keyboardType="numeric" />

        <Text style={styles.label}>Available Spots</Text>
        <TextInput style={styles.input} placeholder="e.g. 16" placeholderTextColor="#a89080" value={spots} onChangeText={setSpots} keyboardType="numeric" />

        <Text style={styles.label}>Contact Name</Text>
        <TextInput style={styles.input} placeholder="e.g. John Begay" placeholderTextColor="#a89080" value={contactName} onChangeText={setContactName} />

        <Text style={styles.label}>Contact Phone</Text>
        <TextInput style={styles.input} placeholder="e.g. (928) 555-1234" placeholderTextColor="#a89080" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Prizes / Awards</Text>
        <TextInput style={styles.input} placeholder="e.g. 1st $4,000 · 2nd $3,000 · 3rd $2,000" placeholderTextColor="#a89080" value={prizes} onChangeText={setPrizes} />

        <Text style={styles.label}>Deposit Amount (optional)</Text>
        <TextInput style={styles.input} placeholder="e.g. 150" placeholderTextColor="#a89080" value={depositAmount} onChangeText={setDepositAmount} keyboardType="numeric" />

        <Text style={styles.label}>Deposit Due Date (optional)</Text>
        <TextInput style={styles.input} placeholder="e.g. Jun 12" placeholderTextColor="#a89080" value={depositDue} onChangeText={setDepositDue} />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Posting...' : 'Post Tournament'}</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#1a0f0a', paddingHorizontal: 20 },
  sub: { fontSize: 16, color: '#7a4a2a', paddingHorizontal: 20, marginBottom: 24 },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1a0f0a', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1a0f0a', marginBottom: 16 },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownPlaceholder: { fontSize: 15, color: '#a89080' },
  dropdownSelected: { fontSize: 15, color: '#1a0f0a', flex: 1, marginRight: 8 },
  dropdownArrow: { fontSize: 12, color: '#7a4a2a' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  stateList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, maxHeight: 200 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5ede0' },
  dropdownItemText: { fontSize: 15, color: '#1a0f0a' },
  dropdownItemActive: { color: '#e8622a', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#e8622a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  successContainer: { flex: 1, backgroundColor: '#f5ede0', alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIcon: { fontSize: 60, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#1a0f0a', marginBottom: 8 },
  successSub: { fontSize: 16, color: '#7a4a2a', marginBottom: 32, textAlign: 'center' },
  backBtn: { backgroundColor: '#e8622a', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  backText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});