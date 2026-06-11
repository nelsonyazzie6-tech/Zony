import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';

const iAmOptions = ['Player', 'Team', 'Parent/Guardian'];
const lookingForOptions = ['Player', 'Team'];
const sportOptions = ['Basketball', 'Volleyball', 'Softball'];
const divisionOptions = [
  '6U Boys', '6U Girls', '6U Coed',
  '8U Boys', '8U Girls', '8U Coed',
  '10U Boys', '10U Girls', '10U Coed',
  '12U Boys', '12U Girls', '12U Coed',
  '14U Boys', '14U Girls', '14U Coed',
  '16U Boys', '16U Girls', '16U Coed',
  '18U Boys', '18U Girls', '18U Coed',
  'Adult Men', 'Adult Women', 'Adult Coed',
];

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
  const [headerHeight, setHeaderHeight] = useState(120);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [lookingFor, setLookingFor] = useState('');
  const [showLookingForPicker, setShowLookingForPicker] = useState(false);
  const [forTournament, setForTournament] = useState('');
  const [forTournamentId, setForTournamentId] = useState('');
  const [forTournamentDivisions, setForTournamentDivisions] = useState<string[]>([]);
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [tournaments, setTournaments] = useState<{ id: string; name: string; sport: string; divisions: string[] }[]>([]);
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [division, setDivision] = useState('');
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');

  const availableDivisions = forTournamentDivisions.length > 0 ? forTournamentDivisions : divisionOptions;

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
        setForTournamentId(d.forTournamentId || '');
        setSport(d.sport || '');
        setDivision(d.division || '');
        setContactPhone(d.contactPhone || '');
        setContactEmail(d.contactEmail || auth.currentUser?.email || '');
        setDescription(d.description || '');
      }

      try {
        const tSnap = await getDocs(collection(db, 'tournaments'));
        const data = tSnap.docs.map(d => ({
          id: d.id,
          name: d.data().name || 'Unnamed',
          sport: d.data().sport || '',
          divisions: d.data().divisions || [],
        }));
        setTournaments(data);

        const snap2 = await getDoc(doc(db, 'board', id as string));
        if (snap2.exists() && snap2.data().forTournamentId) {
          const linkedTournament = data.find(t => t.id === snap2.data().forTournamentId);
          if (linkedTournament) setForTournamentDivisions(linkedTournament.divisions || []);
        }
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
  };

  const handleSave = async () => {
    if (!name || !type || !sport || !division) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'board', id as string), {
        name, type, lookingFor, forTournament, forTournamentId,
        sport, division,
        contactPhone, contactEmail, description,
      });
      router.back();
    } catch (e: any) { console.error(e); }
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
      <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); onToggle(); }} activeOpacity={0.8}>
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

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
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EDIT POST</Text>
            <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Update your board post</Text>
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
              <Text style={styles.label}>For... <Text style={styles.optional}>(optional)</Text></Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => { Keyboard.dismiss(); closeAll(); setShowTournamentPicker(!showTournamentPicker); }}
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
                          setForTournamentId(t.id);
                          setForTournamentDivisions(t.divisions || []);
                          setDivision('');
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
              options={availableDivisions}
              onSelect={setDivision}
            />
            {forTournament && forTournamentDivisions.length > 0 && (
              <Text style={styles.divisionHint}>Showing divisions offered by {forTournament}</Text>
            )}

            <Text style={styles.label}>Contact Phone <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 505-555-1234"
              placeholderTextColor="#a0b8b8"
              value={contactPhone}
              onChangeText={v => setContactPhone(formatPhone(v))}
              keyboardType="phone-pad"
              maxLength={12}
            />

            <Text style={styles.label}>Contact Email <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. john@email.com"
              placeholderTextColor="#a0b8b8"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  headerBlock: { backgroundColor: '#7A1E1E', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  back: { marginBottom: 12 },
  backText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  header: { fontSize: 28, color: '#fff', letterSpacing: 2, fontWeight: '900' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  form: { paddingHorizontal: 20, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '700', color: '#003333', marginBottom: 6, marginTop: 12 },
  optional: { fontWeight: '400', color: '#a0b8b8' },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 4 },
  textArea: { height: 110, textAlignVertical: 'top' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 4 },
  dropdownPlaceholder: { fontSize: 15, color: '#a0b8b8' },
  dropdownSelected: { fontSize: 15, color: '#003333', flex: 1, marginRight: 8 },
  dropdownArrow: { fontSize: 12, color: '#008080' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  dropdownItemText: { fontSize: 15, color: '#003333' },
  dropdownItemActive: { color: '#008080', fontWeight: '700' },
  divisionHint: { fontSize: 11, color: '#a0b8b8', marginTop: -4, marginBottom: 8, paddingLeft: 4 },
  saveBtn: { backgroundColor: '#7A1E1E', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
});