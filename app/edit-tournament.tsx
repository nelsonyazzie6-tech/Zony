import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { auth, db } from '../firebaseConfig';

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
  'Adult Men', 'Adult Women', 'Adult Coed',
];
const placeLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const paymentMethodOptions = ['Cash', 'Card', 'Zelle', 'Other'];

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
  } catch (e) { console.log('Push error:', e); }
}

// Reusable styled info/error modal matching app theme
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

export default function EditTournamentScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
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
  const [zip, setZip] = useState('');
  const [spots, setSpots] = useState('');
  const [divisions, setDivisions] = useState<string[]>([]);
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [divisionFees, setDivisionFees] = useState<Record<string, string>>({});
  const [divisionSpots, setDivisionSpots] = useState<Record<string, string>>({});
  const [spectatorFee, setSpectatorFee] = useState('');

  // Accepted payment methods for spectator entrance fee
  const [spectatorPaymentMethods, setSpectatorPaymentMethods] = useState<string[]>([]);
  const [spectatorPaymentOther, setSpectatorPaymentOther] = useState('');

  const [rosterSize, setRosterSize] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [prizeRows, setPrizeRows] = useState<{ cash: string; physical: string }[]>([
    { cash: '', physical: '' }, { cash: '', physical: '' }, { cash: '', physical: '' },
  ]);

  // Manual prizes fallback — toggle between structured rows and free text
  const [useManualPrizes, setUseManualPrizes] = useState(false);
  const [manualPrizes, setManualPrizes] = useState('');

  const [depositAmount, setDepositAmount] = useState('');
  const [depositDue, setDepositDue] = useState('');
  const [showDepositDuePicker, setShowDepositDuePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Styled info/error modal state
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false, title: '', message: '',
  });

  // Track original values to detect changes for notifications
  const originalRef = useRef<{ date: string; location: string; divisions: string[]; joinedUsers: string[] }>({
    date: '', location: '', divisions: [], joinedUsers: [],
  });

  // Track how many teams are currently registered per division (for shrink warnings)
  const registeredCountRef = useRef<Record<string, number>>({});

  const spectatorFeeRef = useRef<TextInput>(null);
  const spectatorPaymentOtherRef = useRef<TextInput>(null);
  const rosterSizeRef = useRef<TextInput>(null);
  const spotsRef = useRef<TextInput>(null);
  const contactNameRef = useRef<TextInput>(null);
  const contactPhoneRef = useRef<TextInput>(null);
  const contactEmailRef = useRef<TextInput>(null);
  const depositAmountRef = useRef<TextInput>(null);

  // "Available Spots" is only meaningful when there are no divisions, or
  // when at least one selected division has been left blank (and thus
  // needs this value as its fallback).
  const needsAvailableSpots = divisions.length === 0 || divisions.some(d => !divisionSpots[d]?.trim());

  const togglePaymentMethod = (method: string) => {
    setSpectatorPaymentMethods(prev => {
      if (prev.includes(method)) {
        if (method === 'Other') setSpectatorPaymentOther('');
        return prev.filter(m => m !== method);
      }
      return [...prev, method];
    });
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'tournaments', id as string));
      if (!snap.exists()) return;
      const d = snap.data();
      setName(d.name || '');
      setSport(d.sport || '');
      const dates = d.date?.split(' - ') || [];
      setStartDate(dates[0] || '');
      setEndDate(dates[1] || '');
      setAddress(d.address || '');
      setCity(d.city || '');
      setState(d.state || '');
      setZip(d.zip || '');
      setSpots(d.spots?.toString() || '');
      setDivisions(d.divisions || []);
      setDivisionFees(d.divisionFees || {});

      // Load current remaining spots per division (what's actually stored)
      const loadedDivisionSpots: Record<string, string> = {};
      if (d.divisionSpots) {
        Object.entries(d.divisionSpots).forEach(([div, val]) => {
          loadedDivisionSpots[div] = String(val);
        });
      }
      setDivisionSpots(loadedDivisionSpots);

      setSpectatorFee(d.spectatorFee?.replace('$', '') || '');
      setSpectatorPaymentMethods(d.spectatorPaymentMethods || []);
      setSpectatorPaymentOther(d.spectatorPaymentOther || '');
      setRosterSize(d.rosterSize || '');
      setContactName(d.contactName || '');
      setContactPhone(d.contactPhone || '');
      setContactEmail(d.contactEmail || '');
      setDepositAmount(d.depositAmount?.replace('$', '') || '');
      setDepositDue(d.depositDue || '');

      // Store originals for change detection
      originalRef.current = {
        date: d.date || '',
        location: d.location || `${d.city || ''}, ${d.state || ''}`,
        divisions: d.divisions || [],
        joinedUsers: d.joinedUsers || [],
      };

      // Count currently registered teams per division (for shrink warnings)
      try {
        const teamsSnap = await getDocs(collection(db, 'tournaments', id as string, 'teams'));
        const counts: Record<string, number> = {};
        teamsSnap.docs.forEach(t => {
          const div = t.data().division;
          if (div) counts[div] = (counts[div] || 0) + 1;
        });
        registeredCountRef.current = counts;
      } catch (_) {}

      // Determine whether prizes were entered in structured format
      // ("1st: ... · 2nd: ...") or free-form manual text. If every
      // non-empty segment starts with a recognized place label, treat
      // as structured; otherwise load into the manual textarea as-is.
      if (d.prizes) {
        const segments = d.prizes.split(/ · |\n/).map((s: string) => s.trim()).filter(Boolean);
        const isStructured = segments.length > 0 && segments.every((seg: string) =>
          placeLabels.some(label => seg.startsWith(`${label}:`))
        );

        if (isStructured) {
          const parsed = segments.map((p: string) => {
            const withoutLabel = p.replace(/^[^:]+:\s*/, '');
            if (withoutLabel.includes(' + ')) {
              const [cashPart, physical] = withoutLabel.split(' + ');
              return { cash: cashPart.replace('$', '').replace(/,/g, ''), physical };
            } else if (withoutLabel.startsWith('$')) {
              return { cash: withoutLabel.replace('$', '').replace(/,/g, ''), physical: '' };
            } else {
              return { cash: '', physical: withoutLabel };
            }
          });
          const padded = [...parsed, ...Array(Math.max(0, 3 - parsed.length)).fill({ cash: '', physical: '' })];
          setPrizeRows(padded);
          setUseManualPrizes(false);
        } else {
          setManualPrizes(d.prizes);
          setUseManualPrizes(true);
        }
      }

      setDataLoaded(true);
    };
    load();
  }, []);

  const toggleDivision = (d: string) => {
    setDivisions(prev => {
      if (prev.includes(d)) {
        setDivisionFees(f => { const n = { ...f }; delete n[d]; return n; });
        setDivisionSpots(s => { const n = { ...s }; delete n[d]; return n; });
        return prev.filter(x => x !== d);
      }
      return [...prev, d];
    });
  };

  const updatePrizeCash = (index: number, val: string) => {
    const digits = val.replace(/,/g, '');
    if (!/^\d*$/.test(digits)) return;
    const formatted = digits ? parseInt(digits).toLocaleString('en-US') : '';
    setPrizeRows(prev => prev.map((p, i) => i === index ? { ...p, cash: formatted } : p));
  };

  const updatePrizePhysical = (index: number, val: string) => {
    setPrizeRows(prev => prev.map((p, i) => i === index ? { ...p, physical: val } : p));
  };

  const addPrizeRow = () => {
    if (prizeRows.length < 8) setPrizeRows(prev => [...prev, { cash: '', physical: '' }]);
  };

  const formatPrizes = () => {
    if (useManualPrizes) return manualPrizes.trim();
    return prizeRows.map((row, i) => {
      const cash = row.cash.trim();
      const physical = row.physical.trim();
      if (!cash && !physical) return null;
      let combined = '';
      if (cash && physical) combined = `$${cash.replace(/,/g, '')} + ${physical}`;
      else if (cash) combined = `$${cash.replace(/,/g, '')}`;
      else combined = physical;
      return `${placeLabels[i]}: ${combined}`;
    }).filter(Boolean).join(' · ');
  };

  const focusDeposit = () => {
    depositAmountRef.current?.focus();
    scrollRef.current?.scrollTo({ y: 999, animated: true });
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

  const handleSave = async () => {
    const missing: string[] = [];
    if (!name) missing.push('Tournament Name');
    if (!sport) missing.push('Sport');
    if (!startDate) missing.push('Start Date');
    if (!endDate) missing.push('End Date');
    if (!city || !state) missing.push('Venue / Address (city & state)');
    if (needsAvailableSpots && !spots) missing.push('Available Spots');

    if (missing.length > 0) {
      setInfoModal({ visible: true, title: 'MISSING INFORMATION', message: `Please fill in:\n\n${missing.join('\n')}` });
      return;
    }

    setLoading(true);
    const prizesFormatted = formatPrizes();

    // Build final divisionSpots map. Blank entries fall back to the overall
    // "Available Spots" value, same as the create form.
    const fallbackSpots = parseInt(spots) || 0;
    const finalDivisionSpots: Record<string, number> = {};
    divisions.forEach(d => {
      const raw = divisionSpots[d];
      finalDivisionSpots[d] = raw && raw.trim() !== '' ? parseInt(raw) : fallbackSpots;
    });

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

      const newDate = `${startDate} - ${endDate}`;
      const newLocation = `${city}, ${state}`;

      await updateDoc(doc(db, 'tournaments', id as string), {
        name, sport,
        date: newDate,
        address, city, state, zip,
        location: newLocation,
        spots: parseInt(spots) || 0,
        divisions,
        divisionFees,
        divisionSpots: divisions.length > 0 ? finalDivisionSpots : {},
        spectatorFee: spectatorFee ? `$${spectatorFee}` : '',
        spectatorPaymentMethods,
        spectatorPaymentOther: spectatorPaymentMethods.includes('Other') ? spectatorPaymentOther.trim() : '',
        rosterSize, contactName, contactPhone, contactEmail,
        prizes: prizesFormatted,
        depositAmount: depositAmount ? `$${depositAmount}` : '',
        depositDue,
        organizerName,
        organizerPhoto,
      });

      // Notify registered users if schedule, location, or divisions changed
      const original = originalRef.current;
      const dateChanged = original.date !== newDate;
      const locationChanged = original.location !== newLocation;
      const divisionsChanged = JSON.stringify(original.divisions) !== JSON.stringify(divisions);

      if ((dateChanged || locationChanged || divisionsChanged) && original.joinedUsers.length > 0) {
        let message = 'Tournament details updated';
        if (dateChanged) message = 'Tournament schedule changed';
        else if (locationChanged) message = 'Tournament location changed';
        else if (divisionsChanged) message = 'Tournament divisions updated';

        const bodyParts = [];
        if (dateChanged) bodyParts.push(`New dates: ${newDate}`);
        if (locationChanged) bodyParts.push(`New location: ${newLocation}`);
        const body = bodyParts.length > 0 ? bodyParts.join(' • ') : `${name} has been updated`;

        try {
          await Promise.all(
            original.joinedUsers
              .filter((uid: string) => uid !== user?.uid)
              .map(async (uid: string) => {
                await addDoc(collection(db, 'notifications'), {
                  toUserId: uid,
                  message: `${message}: ${name}`,
                  body,
                  link: `/tournament?id=${id}`,
                  createdAt: serverTimestamp(),
                  read: false,
                });
                const userSnap = await getDoc(doc(db, 'users', uid));
                if (userSnap.exists() && userSnap.data().pushToken && userSnap.data().notificationsEnabled !== false) {
                  await sendPush(userSnap.data().pushToken, `📋 ${message}`, `${name} — ${body}`);
                }
              })
          );
        } catch (e) { console.log('Notify error:', e); }
      }

      router.back();
    } catch (e) {
      console.error(e);
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
          <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EDIT TOURNAMENT</Text>
          <Text style={styles.sub}>Update the details below</Text>

          <View style={styles.form}>

            <Text style={styles.label}>Tournament Name</Text>
            <TextInput style={styles.input} placeholder="Tournament name" placeholderTextColor="#a0b8b8" value={name} onChangeText={setName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => Keyboard.dismiss()} />

            <Text style={styles.label}>Sport</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowSportPicker(!showSportPicker); setShowDivisionPicker(false); }}>
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
              <Text style={styles.dropdownArrow}>📅</Text>
            </TouchableOpacity>
            <DateTimePickerModal isVisible={showStartPicker} mode="date" onConfirm={handleStartConfirm} onCancel={() => setShowStartPicker(false)} />

            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowEndPicker(true); }}>
              <Text style={endDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{endDate || 'Select end date...'}</Text>
              <Text style={styles.dropdownArrow}>📅</Text>
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
                <Text style={styles.autoFilledText}>📍 {[address, city, state, zip].filter(Boolean).join(', ')}</Text>
                <TouchableOpacity onPress={() => { setAddress(''); setCity(''); setState(''); setZip(''); }}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.label}>Divisions</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowDivisionPicker(!showDivisionPicker); setShowSportPicker(false); }}>
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
                <TouchableOpacity style={[styles.dropdownItem, { backgroundColor: '#e0f5f5' }]} onPress={() => setShowDivisionPicker(false)}>
                  <Text style={{ color: '#008080', fontWeight: 'bold', textAlign: 'center' }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {divisions.length > 0 && (
              <View style={styles.divisionFeesBlock}>
                <Text style={styles.divisionFeesTitle}>Spots & Entry Fee per Division</Text>
                <Text style={styles.divisionFeesHint}>Spots reflect what's currently open — leave blank to use Available Spots below</Text>
                {divisions.map(d => {
                  const registeredCount = registeredCountRef.current[d] || 0;
                  return (
                    <View key={d}>
                      <View style={styles.divisionRow}>
                        <View style={styles.divisionFeeLabel}>
                          <Text style={styles.divisionFeeLabelText}>{d}</Text>
                        </View>
                        <View style={styles.divisionRowInputs}>
                          <View style={styles.divisionSpotsInputWrapper}>
                            <TextInput
                              style={styles.divisionFeeInput}
                              placeholder="Spots"
                              placeholderTextColor="#a0b8b8"
                              value={divisionSpots[d] || ''}
                              onChangeText={v => setDivisionSpots(prev => ({ ...prev, [d]: v.replace(/[^0-9]/g, '') }))}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={styles.divisionFeeInputWrapper}>
                            <Text style={styles.prizeInputPrefix}>$</Text>
                            <TextInput
                              style={styles.divisionFeeInput}
                              placeholder="Fee"
                              placeholderTextColor="#a0b8b8"
                              value={divisionFees[d] || ''}
                              onChangeText={v => setDivisionFees(prev => ({ ...prev, [d]: v.replace(/[^0-9]/g, '') }))}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                      </View>
                      {registeredCount > 0 && (
                        <Text style={styles.divisionRegisteredHint}>{registeredCount} team{registeredCount === 1 ? '' : 's'} currently registered in {d}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={styles.label}>Spectator Entrance Fee <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput ref={spectatorFeeRef} style={styles.input} placeholder="Amount in dollars" placeholderTextColor="#a0b8b8" value={spectatorFee} onChangeText={setSpectatorFee} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => rosterSizeRef.current?.focus()} />

            {spectatorFee ? (
              <View style={styles.paymentMethodsBlock}>
                <Text style={styles.paymentMethodsLabel}>Accepted Payment Methods <Text style={styles.optional}>(optional)</Text></Text>
                <View style={styles.paymentMethodsRow}>
                  {paymentMethodOptions.map(method => {
                    const selected = spectatorPaymentMethods.includes(method);
                    return (
                      <TouchableOpacity
                        key={method}
                        style={[styles.paymentMethodPill, selected && styles.paymentMethodPillActive]}
                        onPress={() => togglePaymentMethod(method)}
                      >
                        <Text style={[styles.paymentMethodPillText, selected && styles.paymentMethodPillTextActive]}>{method}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {spectatorPaymentMethods.includes('Other') && (
                  <TextInput
                    ref={spectatorPaymentOtherRef}
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="e.g. Venmo, CashApp"
                    placeholderTextColor="#a0b8b8"
                    value={spectatorPaymentOther}
                    onChangeText={setSpectatorPaymentOther}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => rosterSizeRef.current?.focus()}
                  />
                )}
              </View>
            ) : null}

            <Text style={styles.label}>Roster Size</Text>
            <TextInput ref={rosterSizeRef} style={styles.input} placeholder="Number of players" placeholderTextColor="#a0b8b8" value={rosterSize} onChangeText={setRosterSize} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { if (needsAvailableSpots) { spotsRef.current?.focus(); } else { contactNameRef.current?.focus(); } }} />

            {needsAvailableSpots && (
              <>
                <Text style={styles.label}>Available Spots {divisions.length > 0 ? <Text style={styles.optional}>(default for divisions left blank above)</Text> : null}</Text>
                <TextInput ref={spotsRef} style={styles.input} placeholder="Number of teams" placeholderTextColor="#a0b8b8" value={spots} onChangeText={setSpots} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactNameRef.current?.focus()} />
              </>
            )}

            <Text style={styles.label}>Contact Name</Text>
            <TextInput ref={contactNameRef} style={styles.input} placeholder="Contact name" placeholderTextColor="#a0b8b8" value={contactName} onChangeText={setContactName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactPhoneRef.current?.focus()} />

            <Text style={styles.label}>Contact Phone <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput ref={contactPhoneRef} style={styles.input} placeholder="Phone number" placeholderTextColor="#a0b8b8" value={contactPhone} onChangeText={v => setContactPhone(formatPhone(v))} keyboardType="phone-pad" maxLength={12} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactEmailRef.current?.focus()} />

            <Text style={styles.label}>Contact Email <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput ref={contactEmailRef} style={styles.input} placeholder="Email address" placeholderTextColor="#a0b8b8" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => Keyboard.dismiss()} />

            {/* Prizes / Awards — structured rows or manual free text */}
            <Text style={styles.label}>Prizes / Awards</Text>

            {!useManualPrizes ? (
              <>
                <Text style={styles.prizesHint}>Fill in cash, physical prizes, or both per place</Text>

                {prizeRows.map((row, i) => (
                  <View key={i} style={styles.prizeRowBlock}>
                    <View style={styles.prizePlaceLabel}>
                      <Text style={styles.prizeLabelText}>{placeLabels[i]}</Text>
                    </View>
                    <View style={styles.prizeInputs}>
                      <View style={styles.prizeInputWrapper}>
                        <Text style={styles.prizeInputPrefix}>$</Text>
                        <TextInput style={styles.prizeInputCash} placeholder="Cash amount" placeholderTextColor="#a0b8b8" value={row.cash} onChangeText={(t) => updatePrizeCash(i, t)} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} />
                      </View>
                      <TextInput style={styles.prizeInputPhysical} placeholder="Trophy, Jacket, etc." placeholderTextColor="#a0b8b8" value={row.physical} onChangeText={(t) => updatePrizePhysical(i, t)} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={i === prizeRows.length - 1 ? focusDeposit : undefined} />
                    </View>
                  </View>
                ))}

                {prizeRows.length < 8 && (
                  <TouchableOpacity style={styles.addPrizeBtn} onPress={addPrizeRow}>
                    <Text style={styles.addPrizeBtnText}>+ Add Place</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.manualToggleBtn} onPress={() => setUseManualPrizes(true)}>
                  <Text style={styles.manualToggleText}>Don't see the right format? Enter manually</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.manualLocationBlock}>
                <View style={styles.manualLocationHeader}>
                  <Text style={styles.manualLocationTitle}>Manual Prizes Entry</Text>
                  <TouchableOpacity onPress={() => { setUseManualPrizes(false); setManualPrizes(''); }}>
                    <Text style={styles.manualLocationSwitch}>Use Structured Format Instead</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={'e.g.\n1st: $500 + Custom Trophy\n2nd: $250\nAll players: Tournament T-Shirt'}
                  placeholderTextColor="#a0b8b8"
                  value={manualPrizes}
                  onChangeText={setManualPrizes}
                  multiline
                  numberOfLines={5}
                />
              </View>
            )}

            <Text style={styles.label}>Deposit Amount <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput ref={depositAmountRef} style={styles.input} placeholder="Amount in dollars" placeholderTextColor="#a0b8b8" value={depositAmount} onChangeText={setDepositAmount} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { Keyboard.dismiss(); setShowDepositDuePicker(true); }} />

            <Text style={styles.label}>Deposit Due Date <Text style={styles.optional}>(optional)</Text></Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowDepositDuePicker(true); }}>
              <Text style={depositDue ? styles.dropdownSelected : styles.dropdownPlaceholder}>{depositDue || 'Select deposit due date...'}</Text>
              <Text style={styles.dropdownArrow}>📅</Text>
            </TouchableOpacity>
            <DateTimePickerModal isVisible={showDepositDuePicker} mode="date" onConfirm={handleDepositDueConfirm} onCancel={() => setShowDepositDuePicker(false)} />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
              <Text style={[styles.submitText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{loading ? 'Saving...' : 'SAVE CHANGES'}</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        onClose={() => setInfoModal({ visible: false, title: '', message: '' })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  backBtn: { paddingHorizontal: 20, marginBottom: 8 },
  backText: { fontSize: 16, color: '#008080', fontWeight: '600' },
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
  dropdownArrow: { fontSize: 12, color: '#008080' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  dropdownItemText: { fontSize: 15, color: '#003333' },
  dropdownItemActive: { color: '#008080', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  placesWrapper: { marginBottom: 12, zIndex: 10 },
  autoFilledBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  autoFilledText: { fontSize: 13, color: '#003333', flex: 1, marginRight: 8 },
  clearText: { fontSize: 13, color: '#008080', fontWeight: 'bold' },
  manualToggleBtn: { paddingVertical: 10, alignItems: 'center', marginBottom: 4 },
  manualToggleText: { fontSize: 13, color: '#008080', fontWeight: '600', textDecorationLine: 'underline' },
  manualLocationBlock: { backgroundColor: '#f0fafa', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e0f0f0', gap: 4 },
  manualLocationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  manualLocationTitle: { fontSize: 13, fontWeight: '700', color: '#003333' },
  manualLocationSwitch: { fontSize: 12, color: '#008080', fontWeight: '600', textDecorationLine: 'underline' },
  prizesHint: { fontSize: 12, color: '#a0b8b8', marginBottom: 10, marginTop: -4 },
  prizeRowBlock: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  prizePlaceLabel: { backgroundColor: '#7A1E1E', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, minWidth: 36, alignItems: 'center', marginTop: 2 },
  prizeLabelText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  prizeInputs: { flex: 1, gap: 6 },
  prizeInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e0d8c8', paddingHorizontal: 12 },
  prizeInputPrefix: { fontSize: 15, color: '#003333', fontWeight: '600', marginRight: 4 },
  prizeInputCash: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#003333' },
  prizeInputPhysical: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8' },
  addPrizeBtn: { borderWidth: 1, borderColor: '#008080', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 16, backgroundColor: '#e0f5f5' },
  addPrizeBtnText: { color: '#008080', fontWeight: 'bold', fontSize: 15 },
  divisionFeesBlock: { backgroundColor: '#f0fafa', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e0f0f0' },
  divisionFeesTitle: { fontSize: 13, fontWeight: '700', color: '#003333', marginBottom: 2 },
  divisionFeesHint: { fontSize: 11, color: '#a0b8b8', marginBottom: 10 },
  divisionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 10 },
  divisionRowInputs: { flex: 1, flexDirection: 'row', gap: 8 },
  divisionFeeLabel: { backgroundColor: '#008080', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 52, alignItems: 'center' },
  divisionFeeLabelText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  divisionSpotsInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e0d8c8', paddingHorizontal: 10 },
  divisionFeeInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e0d8c8', paddingHorizontal: 10 },
  divisionFeeInput: { flex: 1, paddingVertical: 8, fontSize: 15, color: '#003333' },
  divisionRegisteredHint: { fontSize: 11, color: '#a0b8b8', marginBottom: 8, paddingLeft: 4 },
  paymentMethodsBlock: { marginBottom: 8 },
  paymentMethodsLabel: { fontSize: 13, fontWeight: '600', color: '#003333', marginBottom: 8 },
  paymentMethodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentMethodPill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#e0d8c8', backgroundColor: '#fff' },
  paymentMethodPillActive: { backgroundColor: '#008080', borderColor: '#008080' },
  paymentMethodPillText: { fontSize: 13, color: '#5a7a7a', fontWeight: '600' },
  paymentMethodPillTextActive: { color: '#fff' },
  // Info/Error modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 24, width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 20, color: '#003333', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  modalMsg: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  modalOkBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalOkText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
});