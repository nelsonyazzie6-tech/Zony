import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const sportOptions = ['Basketball', 'Softball', 'Volleyball'];
const divisionOptions = ['8U', '10U', '12U', '14U Boys', '14U Girls', 'HS Boys', 'HS Girls', 'Adult Men', 'Adult Women', 'Adult Coed', 'Open'];
const stateOptions = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function PostBoardScreen() {
  const router = useRouter();
  const [type, setType] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [division, setDivision] = useState('');
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!type || !sport || !division || !city || !state) return;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sign in required', 'You need to be logged in to post.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'board'), {
        type, sport, division, city, state, contactPhone, contactEmail, description,
        postedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      router.replace('/(tabs)/board');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Post to Board</Text>
      <Text style={styles.sub}>Let the community know</Text>

      <View style={styles.form}>

        <Text style={styles.label}>I am a...</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => { setShowTypePicker(!showTypePicker); setShowSportPicker(false); setShowDivisionPicker(false); setShowStatePicker(false); }}>
          <Text style={type ? styles.dropdownSelected : styles.dropdownPlaceholder}>{type || 'Select type...'}</Text>
          <Text style={styles.dropdownArrow}>{showTypePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showTypePicker && (
          <View style={styles.dropdownList}>
            {['Player looking for team', 'Team looking for players'].map(t => (
              <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setType(t); setShowTypePicker(false); }}>
                <Text style={[styles.dropdownItemText, type === t && styles.dropdownItemActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Sport</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => { setShowSportPicker(!showSportPicker); setShowTypePicker(false); setShowDivisionPicker(false); setShowStatePicker(false); }}>
          <Text style={sport ? styles.dropdownSelected : styles.dropdownPlaceholder}>{sport || 'Select a sport...'}</Text>
          <Text style={styles.dropdownArrow}>{showSportPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showSportPicker && (
          <View style={styles.dropdownList}>
            {sportOptions.map(s => (
              <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setSport(s); setShowSportPicker(false); }}>
                <Text style={[styles.dropdownItemText, sport === s && styles.dropdownItemActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Division</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => { setShowDivisionPicker(!showDivisionPicker); setShowTypePicker(false); setShowSportPicker(false); setShowStatePicker(false); }}>
          <Text style={division ? styles.dropdownSelected : styles.dropdownPlaceholder}>{division || 'Select division...'}</Text>
          <Text style={styles.dropdownArrow}>{showDivisionPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showDivisionPicker && (
          <View style={styles.dropdownList}>
            {divisionOptions.map(d => (
              <TouchableOpacity key={d} style={styles.dropdownItem} onPress={() => { setDivision(d); setShowDivisionPicker(false); }}>
                <Text style={[styles.dropdownItemText, division === d && styles.dropdownItemActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} placeholder="e.g. Gallup" placeholderTextColor="#a0b8b8" value={city} onChangeText={setCity} />

        <Text style={styles.label}>State</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => { setShowStatePicker(!showStatePicker); setShowTypePicker(false); setShowSportPicker(false); setShowDivisionPicker(false); }}>
          <Text style={state ? styles.dropdownSelected : styles.dropdownPlaceholder}>{state || 'Select a state...'}</Text>
          <Text style={styles.dropdownArrow}>{showStatePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showStatePicker && (
          <ScrollView style={styles.stateList} nestedScrollEnabled>
            {stateOptions.map(s => (
              <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setState(s); setShowStatePicker(false); }}>
                <Text style={[styles.dropdownItemText, state === s && styles.dropdownItemActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.label}>Contact Phone (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 505-555-1234"
          placeholderTextColor="#a0b8b8"
          value={contactPhone}
          onChangeText={v => setContactPhone(formatPhone(v))}
          keyboardType="phone-pad"
          maxLength={12}
        />

        <Text style={styles.label}>Contact Email (optional)</Text>
        <TextInput style={styles.input} placeholder="e.g. john@email.com" placeholderTextColor="#a0b8b8" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="e.g. Looking for 14U forward for this weekend at Hozho..." placeholderTextColor="#a0b8b8" value={description} onChangeText={setDescription} multiline numberOfLines={4} />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Posting...' : 'Post to Board'}</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  back: { paddingHorizontal: 20, marginBottom: 8 },
  backText: { fontSize: 16, color: '#008080', fontWeight: '600' },
  header: { fontSize: 32, fontWeight: 'bold', color: '#003333', paddingHorizontal: 20 },
  sub: { fontSize: 16, color: '#5a7a7a', paddingHorizontal: 20, marginBottom: 24 },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#003333', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1a0f0a', marginBottom: 16, borderWidth: 1, borderColor: '#e0f0f0' },
  textArea: { height: 100, textAlignVertical: 'top' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0f0f0' },
  dropdownPlaceholder: { fontSize: 15, color: '#a0b8b8' },
  dropdownSelected: { fontSize: 15, color: '#003333' },
  dropdownArrow: { fontSize: 12, color: '#008080' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e0f0f0' },
  stateList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, maxHeight: 200, borderWidth: 1, borderColor: '#e0f0f0' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  dropdownItemText: { fontSize: 15, color: '#003333' },
  dropdownItemActive: { color: '#008080', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});