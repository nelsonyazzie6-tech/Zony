import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

const iAmOptions = ['Player', 'Team'];
const lookingForOptions = ['Player', 'Team'];
const sportOptions = ['Basketball', 'Volleyball', 'Softball'];
const divisionOptions = ['6U','8U','10U','12U','14U','16U','18U','Adults'];
const genderOptions = ['Boys', 'Girls', 'Coed', 'Womens', 'Mens'];
const stateOptions = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function EditBoardScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [lookingFor, setLookingFor] = useState('');
  const [showLookingForPicker, setShowLookingForPicker] = useState(false);
  const [forTournament, setForTournament] = useState('');
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [tournaments, setTournaments] = useState<{ id: string; name: string; sport: string }[]>([]);
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [division, setDivision] = useState('');
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [gender, setGender] = useState('');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'board', id as string));
      if (snap.exists()) {
        const d = snap.data();
        setName(d.name || '');
        setType(d.type || '');
        setLookingFor(d.lookingFor || '');
        setForTournament(d.forTournament || '');
        setSport(d.sport || '');
        setDivision(d.division || '');
        setGender(d.gender || '');
        setCity(d.city || '');
        setState(d.state || '');
        setContactPhone(d.contactPhone || '');
        setContactEmail(d.contactEmail || '');
        setDescription(d.description || '');
      }
      try {
        const tSnap = await getDocs(collection(db, 'tournaments'));
        const data = tSnap.docs.map(d => ({
          id: d.id,
          name: d.data().name || 'Unnamed',
          sport: d.data().sport || '',
        }));
        setTournaments(data);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const closeAll = () => {
    setShowTypePicker(false);
    setShowLookingForPicker(false);
    setShowTournamentPicker(false);
    setShowSportPicker(false);
    setShowDivisionPicker(false);
    setShowGenderPicker(false);
    setShowStatePicker(false);
  };

  const handleSave = async () => {
    if (!name || !type || !sport || !division || !city || !state) {
      Alert.alert('Missing fields', 'Please fill out all required fields.');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'board', id as string), {
        name, type, lookingFor, forTournament, sport, division,
        gender, city, state, contactPhone, contactEmail, description,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  const DropdownField = ({
    label, value, placeholder, show, onToggle, options, onSelect, scrollable, optional,
  }: {
    label: string; value: string; placeholder: string; show: boolean;
    onToggle: () => void; options: string[]; onSelect: (v: string) => void;
    scrollable?: boolean; optional?: boolean;
  }) => (
    <View>
      <Text style={styles.label}>
        {label}{optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <TouchableOpacity style={styles.dropdown} onPress={onToggle} activeOpacity={0.8}>
        <Text style={value ? styles.dropdownSelected : styles.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.dropdownArrow}>{show ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {show && (
        <ScrollView
          style={[styles.dropdownList, scrollable && { maxHeight: 200 }]}
          nestedScrollEnabled
          scrollEnabled={!!scrollable}
        >
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={styles.dropdownItem}
              onPress={() => { onSelect(opt); closeAll(); }}
            >
              <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.headerBlock}>
        <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EDIT POST</Text>
        <Text style={styles.sub}>Update your board post</Text>
      </View>

      <View style={styles.form}>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Marcus Webb"
          placeholderTextColor="#a0b8b8"
          value={name}
          onChangeText={setName}
        />

        <DropdownField
          label="I am a..."
          value={type}
          placeholder="Select type..."
          show={showTypePicker}
          onToggle={() => { closeAll(); setShowTypePicker(!showTypePicker); }}
          options={iAmOptions}
          onSelect={setType}
        />

        <DropdownField
          label="Looking for a..."
          value={lookingFor}
          placeholder="Select what you need..."
          show={showLookingForPicker}
          onToggle={() => { closeAll(); setShowLookingForPicker(!showLookingForPicker); }}
          options={lookingForOptions}
          onSelect={setLookingFor}
        />

        <View>
          <Text style={styles.label}>
            For... <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => { closeAll(); setShowTournamentPicker(!showTournamentPicker); }}
            activeOpacity={0.8}
          >
            <Text style={forTournament ? styles.dropdownSelected : styles.dropdownPlaceholder}>
              {forTournament || 'Select a tournament...'}
            </Text>
            <Text style={styles.dropdownArrow}>{showTournamentPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showTournamentPicker && (
            <ScrollView style={[styles.dropdownList, { maxHeight: 200 }]} nestedScrollEnabled>
              {tournaments.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemText}>No tournaments available</Text>
                </View>
              ) : (
                tournaments.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setForTournament(t.name);
                      if (t.sport) setSport(t.sport);
                      closeAll();
                    }}
                  >
                    <Text style={[styles.dropdownItemText, forTournament === t.name && styles.dropdownItemActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>

        <DropdownField
          label="Sport"
          value={sport}
          placeholder="Select a sport..."
          show={showSportPicker}
          onToggle={() => { closeAll(); setShowSportPicker(!showSportPicker); }}
          options={sportOptions}
          onSelect={setSport}
        />

        <DropdownField
          label="Division"
          value={division}
          placeholder="Select division..."
          show={showDivisionPicker}
          onToggle={() => { closeAll(); setShowDivisionPicker(!showDivisionPicker); }}
          options={divisionOptions}
          onSelect={setDivision}
        />

        <DropdownField
          label="Gender"
          value={gender}
          placeholder="Select gender..."
          show={showGenderPicker}
          onToggle={() => { closeAll(); setShowGenderPicker(!showGenderPicker); }}
          options={genderOptions}
          onSelect={setGender}
          optional
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Gallup"
          placeholderTextColor="#a0b8b8"
          value={city}
          onChangeText={setCity}
        />

        <DropdownField
          label="State"
          value={state}
          placeholder="Select a state..."
          show={showStatePicker}
          onToggle={() => { closeAll(); setShowStatePicker(!showStatePicker); }}
          options={stateOptions}
          onSelect={setState}
          scrollable
        />

        <Text style={styles.label}>
          Contact Phone <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 505-555-1234"
          placeholderTextColor="#a0b8b8"
          value={contactPhone}
          onChangeText={v => setContactPhone(formatPhone(v))}
          keyboardType="phone-pad"
          maxLength={12}
        />

        <Text style={styles.label}>
          Contact Email <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. john@email.com"
          placeholderTextColor="#a0b8b8"
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>
          Description <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g. Looking for 14U forward..."
          placeholderTextColor="#a0b8b8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
          <Text style={[styles.saveBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
            {loading ? 'Saving...' : 'SAVE CHANGES'}
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  back: { paddingHorizontal: 20, marginBottom: 6 },
  backText: { fontSize: 16, color: '#008080', fontWeight: '600' },
  headerBlock: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  header: { fontSize: 32, color: '#003333', letterSpacing: 2 },
  sub: { fontSize: 13, color: '#a0b8b8', marginTop: 2 },
  form: { paddingHorizontal: 20, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '700', color: '#003333', marginBottom: 6, marginTop: 12 },
  optional: { fontWeight: '400', color: '#a0b8b8' },
  input: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#1a0f0a', borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  textArea: { height: 110, textAlignVertical: 'top' },
  dropdown: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  dropdownPlaceholder: { fontSize: 14, color: '#a0b8b8' },
  dropdownSelected: { fontSize: 14, color: '#003333' },
  dropdownArrow: { fontSize: 11, color: '#008080' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 16, marginTop: 4, marginBottom: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e8e8', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownItemText: { fontSize: 14, color: '#003333' },
  dropdownItemActive: { color: '#008080', fontWeight: '700' },
  saveBtn: { backgroundColor: '#008080', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20, shadowColor: '#008080', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  saveBtnText: { color: '#fff', fontSize: 20, letterSpacing: 1 },
});