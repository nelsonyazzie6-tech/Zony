import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

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
const placeLabels = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const paymentMethodOptions = ['Cash', 'Card', 'Zelle', 'Other'];

const boardDescriptionPlaceholders = [
  'e.g. "I have a 14-year-old player looking for a team for an upcoming tournament."',
  'e.g. "Does anyone need a player for the 16U division this weekend?"',
  'e.g. "Looking for a 14U player to complete our roster for an upcoming event."',
];

type PrizeRow = { cash: string; physical: string };
type DayWindowDisplay = { startDisplay: string; endDisplay: string };

function defaultWindowForDay(i: number): DayWindowDisplay {
  if (i === 0) return { startDisplay: '6:00 PM', endDisplay: '10:00 PM' };
  if (i === 1) return { startDisplay: '8:00 AM', endDisplay: '10:00 PM' };
  return { startDisplay: '8:00 AM', endDisplay: '2:00 PM' };
}

function formatTimeAmPm(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

function parseAmPmToTime24(input: string): string {
  const cleaned = input.trim().toUpperCase();
  const ampmMatch = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] || '00';
    if (ampmMatch[3] === 'AM') { if (h === 12) h = 0; }
    else { if (h !== 12) h += 12; }
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) return cleaned.padStart(5, '0');
  return input;
}

function emptyPrizeRows(): PrizeRow[] {
  return [{ cash: '', physical: '' }, { cash: '', physical: '' }, { cash: '', physical: '' }];
}

function formatPrizeRows(rows: PrizeRow[], useManual: boolean, manual: string): string {
  if (useManual) return manual.trim();
  return rows.map((row, i) => {
    const cash = row.cash.trim();
    const physical = row.physical.trim();
    if (!cash && !physical) return null;
    let combined = '';
    if (cash && physical) combined = `$${cash.replace(/,/g, '')} + ${physical}`;
    else if (cash) combined = `$${cash.replace(/,/g, '')}`;
    else combined = physical;
    return `${placeLabels[i]}: ${combined}`;
  }).filter(Boolean).join('\n');
}

function LocationIcon({ size = 13, color = '#003333' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" />
      <Circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

function CheckIcon({ size = 13, color = '#008080' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="m8 12 3 3 5-6" />
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

function SuccessModal({ type, onBack }: { type: 'tournament' | 'board'; onBack: () => void }) {
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  return (
    <View style={styles.successContainer}>
      <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
        <Path d="M8 3h8v8a4 4 0 0 1-8 0V3Z" stroke="#008080" strokeWidth="1.5" strokeLinejoin="round" />
        <Path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3" stroke="#008080" strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M12 15v4M9 21h6" stroke="#008080" strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
      <Text style={[styles.successTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
        {type === 'tournament' ? 'TOURNAMENT POSTED!' : 'BOARD POST LIVE!'}
      </Text>
      <Text style={styles.successSub}>
        {type === 'tournament' ? 'Your tournament is now live on Zony.' : 'Your post is now visible on the Sports Board.'}
      </Text>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={[styles.backText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>BACK TO HOME</Text>
      </TouchableOpacity>
    </View>
  );
}

function HubScreen({ onSelect }: { onSelect: (tab: 'tournament' | 'board') => void }) {
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  return (
    <View style={styles.hubContainer}>
      <View style={styles.hubHeader}>
        <Text style={[styles.hubTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CREATE</Text>
        <Text style={styles.hubSub}>What would you like to post?</Text>
      </View>
      <View style={styles.hubCards}>
        <TouchableOpacity style={styles.hubCard} onPress={() => onSelect('tournament')} activeOpacity={0.85}>
          <View style={[styles.hubCardIcon, { backgroundColor: '#008080' }]}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
              <Path d="M8 3h8v8a4 4 0 0 1-8 0V3Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
              <Path d="M8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              <Path d="M12 15v4M9 21h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
          </View>
          <Text style={[styles.hubCardTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>TOURNAMENT</Text>
          <Text style={styles.hubCardDesc}>Post a tournament for teams to register and compete</Text>
          <View style={[styles.hubCardArrow, { backgroundColor: '#008080' }]}>
            <Text style={styles.hubCardArrowText}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.hubCard} onPress={() => onSelect('board')} activeOpacity={0.85}>
          <View style={[styles.hubCardIcon, { backgroundColor: '#7A1E1E' }]}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.5" />
              <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.5" />
              <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.5" />
              <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.5" />
            </Svg>
          </View>
          <Text style={[styles.hubCardTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>SPORTS BOARD</Text>
          <Text style={styles.hubCardDesc}>Looking for players, teams, or spots in a tournament</Text>
          <View style={[styles.hubCardArrow, { backgroundColor: '#7A1E1E' }]}>
            <Text style={styles.hubCardArrowText}>›</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PrizeEditor({
  rows, onUpdateCash, onUpdatePhysical, onAddRow,
  useManual, onToggleManual, manual, onChangeManual,
}: {
  rows: PrizeRow[];
  onUpdateCash: (i: number, v: string) => void;
  onUpdatePhysical: (i: number, v: string) => void;
  onAddRow: () => void;
  useManual: boolean;
  onToggleManual: () => void;
  manual: string;
  onChangeManual: (v: string) => void;
}) {
  if (!useManual) {
    return (
      <>
        <Text style={styles.prizesHint}>Fill in cash, physical prizes, or both per place</Text>
        {rows.map((row, i) => (
          <View key={i} style={styles.prizeRowBlock}>
            <View style={styles.prizePlaceLabel}>
              <Text style={styles.prizeLabelText}>{placeLabels[i]}</Text>
            </View>
            <View style={styles.prizeInputs}>
              <View style={styles.prizeInputWrapper}>
                <Text style={styles.prizeInputPrefix}>$</Text>
                <TextInput
                  style={styles.prizeInputCash}
                  placeholder="Cash amount"
                  placeholderTextColor="#a0b8b8"
                  value={row.cash}
                  onChangeText={v => onUpdateCash(i, v)}
                  keyboardType="numeric"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
              <TextInput
                style={styles.prizeInputPhysical}
                placeholder="Trophy, Jacket, etc."
                placeholderTextColor="#a0b8b8"
                value={row.physical}
                onChangeText={v => onUpdatePhysical(i, v)}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
          </View>
        ))}
        {rows.length < 8 && (
          <TouchableOpacity style={styles.addPrizeBtn} onPress={onAddRow}>
            <Text style={styles.addPrizeBtnText}>+ Add Place</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.manualToggleBtn} onPress={onToggleManual}>
          <Text style={styles.manualToggleText}>Don't see the right format? Enter manually</Text>
        </TouchableOpacity>
      </>
    );
  }
  return (
    <View style={styles.manualLocationBlock}>
      <View style={styles.manualLocationHeader}>
        <Text style={styles.manualLocationTitle}>Manual Prizes Entry</Text>
        <TouchableOpacity onPress={onToggleManual}>
          <Text style={styles.manualLocationSwitch}>Use Structured Format</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder={'e.g.\n1st: $500 + Custom Trophy\n2nd: $250\nAll players: Tournament T-Shirt'}
        placeholderTextColor="#a0b8b8"
        value={manual}
        onChangeText={onChangeManual}
        multiline
        numberOfLines={5}
      />
    </View>
  );
}

function TournamentForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const [headerHeight, setHeaderHeight] = useState(120);
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState('');
  const [tournamentDuration, setTournamentDuration] = useState<1 | 2 | 3>(1);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [zip, setZip] = useState('');
  const [divisions, setDivisions] = useState<string[]>([]);
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [divisionFees, setDivisionFees] = useState<Record<string, string>>({});
  const [divisionSpots, setDivisionSpots] = useState<Record<string, string>>({});
  const [spectatorFee, setSpectatorFee] = useState('');
  const [isFreeSpectator, setIsFreeSpectator] = useState(false);
  const [spectatorPaymentMethods, setSpectatorPaymentMethods] = useState<string[]>([]);
  const [spectatorPaymentOther, setSpectatorPaymentOther] = useState('');
  const [rosterSize, setRosterSize] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDue, setDepositDue] = useState('');
  const [showDepositDuePicker, setShowDepositDuePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [samePrizesForAll, setSamePrizesForAll] = useState(false);
  const [sharedPrizeRows, setSharedPrizeRows] = useState<PrizeRow[]>(emptyPrizeRows());
  const [sharedUseManual, setSharedUseManual] = useState(false);
  const [sharedManual, setSharedManual] = useState('');
  const [divPrizeRows, setDivPrizeRows] = useState<Record<string, PrizeRow[]>>({});
  const [divUseManual, setDivUseManual] = useState<Record<string, boolean>>({});
  const [divManual, setDivManual] = useState<Record<string, string>>({});

  const [bracketEnabled, setBracketEnabled] = useState(false);
  const [tournamentFormat, setTournamentFormat] = useState<'double' | 'single'>('double');
  const [courtNames, setCourtNames] = useState<string[]>(['Court 1']);
  const [bracketGameDuration, setBracketGameDuration] = useState('50');
  const [bracketBuffer, setBracketBuffer] = useState('10');
  const [dayWindows, setDayWindows] = useState<DayWindowDisplay[]>([defaultWindowForDay(0)]);
  const [championshipFormat, setChampionshipFormat] = useState<'single' | 'double'>('single');
  const [showChampionshipPicker, setShowChampionshipPicker] = useState(false);

  const [useManualLocation, setUseManualLocation] = useState(false);
  const [manualVenue, setManualVenue] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualZip, setManualZip] = useState('');
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

  const spectatorFeeRef = useRef<TextInput>(null);
  const spectatorPaymentOtherRef = useRef<TextInput>(null);
  const rosterSizeRef = useRef<TextInput>(null);
  const contactNameRef = useRef<TextInput>(null);
  const contactPhoneRef = useRef<TextInput>(null);
  const contactEmailRef = useRef<TextInput>(null);
  const depositAmountRef = useRef<TextInput>(null);

  const tournamentDayStrings: string[] = [];
  if (startDateObj) {
    const cur = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
    for (let i = 0; i < tournamentDuration; i++) {
      tournamentDayStrings.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`);
      cur.setDate(cur.getDate() + 1);
    }
  }

  useEffect(() => {
    setDayWindows(prev => {
      const next = [...prev];
      while (next.length < tournamentDuration) next.push(defaultWindowForDay(next.length));
      return next.slice(0, tournamentDuration);
    });
  }, [tournamentDuration]);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      if (user.email) setContactEmail(user.email);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().username) setContactName(snap.data().username);
      } catch (_) {}
    };
    load();
  }, []);

  const togglePaymentMethod = (method: string) => {
    setSpectatorPaymentMethods(prev => {
      if (prev.includes(method)) {
        if (method === 'Other') setSpectatorPaymentOther('');
        return prev.filter(m => m !== method);
      }
      return [...prev, method];
    });
  };

  const toggleDivision = (d: string) => {
    setDivisions(prev => {
      if (prev.includes(d)) {
        setDivisionFees(f => { const n = { ...f }; delete n[d]; return n; });
        setDivisionSpots(s => { const n = { ...s }; delete n[d]; return n; });
        setDivPrizeRows(r => { const n = { ...r }; delete n[d]; return n; });
        setDivUseManual(m => { const n = { ...m }; delete n[d]; return n; });
        setDivManual(m => { const n = { ...m }; delete n[d]; return n; });
        return prev.filter(x => x !== d);
      }
      setDivPrizeRows(r => ({ ...r, [d]: emptyPrizeRows() }));
      setDivUseManual(m => ({ ...m, [d]: false }));
      setDivManual(m => ({ ...m, [d]: '' }));
      return [...prev, d];
    });
  };

  const updateDivPrizeCash = (div: string, i: number, val: string) => {
    const digits = val.replace(/,/g, '');
    if (!/^\d*$/.test(digits)) return;
    const formatted = digits ? parseInt(digits).toLocaleString('en-US') : '';
    setDivPrizeRows(prev => ({ ...prev, [div]: prev[div].map((p, idx) => idx === i ? { ...p, cash: formatted } : p) }));
  };

  const updateDivPrizePhysical = (div: string, i: number, val: string) => {
    setDivPrizeRows(prev => ({ ...prev, [div]: prev[div].map((p, idx) => idx === i ? { ...p, physical: val } : p) }));
  };

  const addDivPrizeRow = (div: string) => {
    setDivPrizeRows(prev => {
      const rows = prev[div] || emptyPrizeRows();
      if (rows.length >= 8) return prev;
      return { ...prev, [div]: [...rows, { cash: '', physical: '' }] };
    });
  };

  const updateSharedPrizeCash = (i: number, val: string) => {
    const digits = val.replace(/,/g, '');
    if (!/^\d*$/.test(digits)) return;
    const formatted = digits ? parseInt(digits).toLocaleString('en-US') : '';
    setSharedPrizeRows(prev => prev.map((p, idx) => idx === i ? { ...p, cash: formatted } : p));
  };

  const updateSharedPrizePhysical = (i: number, val: string) => {
    setSharedPrizeRows(prev => prev.map((p, idx) => idx === i ? { ...p, physical: val } : p));
  };

  const resetFields = () => {
    setName(''); setSport(''); setStartDate(''); setStartDateObj(null); setEndDate('');
    setTournamentDuration(1); setAddress(''); setCity(''); setState(''); setZip('');
    setDivisionFees({}); setDivisionSpots({}); setSpectatorFee('');
    setIsFreeSpectator(false); setSpectatorPaymentMethods([]); setSpectatorPaymentOther('');
    setDivisions([]); setRosterSize('');
    setContactName(''); setContactPhone(''); setContactEmail('');
    setSamePrizesForAll(false);
    setSharedPrizeRows(emptyPrizeRows()); setSharedUseManual(false); setSharedManual('');
    setDivPrizeRows({}); setDivUseManual({}); setDivManual({});
    setDepositAmount(''); setDepositDue('');
    setUseManualLocation(false);
    setManualVenue(''); setManualAddress(''); setManualCity(''); setManualState(''); setManualZip('');
    setBracketEnabled(true); setTournamentFormat('double'); setCourtNames(['Court 1']);
    setBracketGameDuration('50'); setBracketBuffer('10');
    setDayWindows([defaultWindowForDay(0)]);
    setChampionshipFormat('single');
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

  const addCourtName = () => setCourtNames(prev => [...prev, `Court ${prev.length + 1}`]);
  const removeCourtName = (i: number) => setCourtNames(prev => prev.filter((_, idx) => idx !== i));
  const updateCourtName = (i: number, val: string) => setCourtNames(prev => prev.map((c, idx) => idx === i ? val : c));

  const handleStartConfirm = (date: Date) => {
    setStartDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setStartDateObj(date); setShowStartPicker(false);
  };
  const handleDepositDueConfirm = (date: Date) => {
    setDepositDue(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setShowDepositDuePicker(false);
  };

  useEffect(() => {
    if (!startDateObj) { setEndDate(''); return; }
    const end = new Date(startDateObj);
    end.setDate(end.getDate() + tournamentDuration - 1);
    setEndDate(end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  }, [startDateObj, tournamentDuration]);

  const handleSubmit = async () => {
    const finalCity = useManualLocation ? manualCity : city;
    const finalState = useManualLocation ? manualState : state;
    const finalAddress = useManualLocation
      ? (manualVenue ? `${manualVenue}${manualAddress ? ', ' + manualAddress : ''}` : manualAddress)
      : address;
    const finalZip = useManualLocation ? manualZip : zip;

    const missing: string[] = [];
    if (!name) missing.push('Tournament Name');
    if (!sport) missing.push('Sport');
    if (!startDate) missing.push('Start Date');
    if (!finalCity || !finalState) missing.push('Venue / Address (city & state)');

    if (missing.length > 0) {
      setInfoModal({ visible: true, title: 'MISSING INFORMATION', message: `Please fill in:\n\n${missing.join('\n')}` });
      return;
    }

    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);

    const divisionPrizes: Record<string, string> = {};
    if (divisions.length > 0) {
      divisions.forEach(d => {
        if (samePrizesForAll) {
          divisionPrizes[d] = formatPrizeRows(sharedPrizeRows, sharedUseManual, sharedManual);
        } else {
          divisionPrizes[d] = formatPrizeRows(
            divPrizeRows[d] || emptyPrizeRows(),
            divUseManual[d] || false,
            divManual[d] || '',
          );
        }
      });
    }

    const topLevelPrizes = samePrizesForAll
      ? formatPrizeRows(sharedPrizeRows, sharedUseManual, sharedManual)
      : Object.values(divisionPrizes).join('\n\n');

    const finalDivisionSpots: Record<string, number> = {};
    divisions.forEach(d => {
      const raw = divisionSpots[d];
      finalDivisionSpots[d] = raw && raw.trim() !== '' ? parseInt(raw) : 0;
    });

    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const organizerName = userSnap.exists() ? (userSnap.data().username || '') : '';
      const organizerPhoto = userSnap.exists() ? (userSnap.data().photoURL || '') : '';

      const tournamentRef = await addDoc(collection(db, 'tournaments'), {
        name, sport,
        date: `${startDate} - ${endDate}`,
        startDateValue: startDateObj ? Timestamp.fromDate(startDateObj) : null,
        tournamentDays: tournamentDayStrings,
        tournamentDuration,
        address: finalAddress, city: finalCity, state: finalState, zip: finalZip,
        location: `${finalCity}, ${finalState}`,
        spots: 0,
        divisionFees,
        divisionSpots: divisions.length > 0 ? finalDivisionSpots : {},
        divisionPrizes,
        prizes: topLevelPrizes,
        samePrizesForAll,
        spectatorFee: isFreeSpectator ? 'Free' : (spectatorFee ? `$${spectatorFee}` : ''),
        spectatorPaymentMethods,
        spectatorPaymentOther: spectatorPaymentMethods.includes('Other') ? spectatorPaymentOther.trim() : '',
        divisions, rosterSize, contactName, contactPhone, contactEmail,
        depositAmount: depositAmount ? `$${depositAmount}` : '',
        depositDue,
        status: 'active', createdAt: serverTimestamp(), postedBy: user.uid,
        organizerName, organizerPhoto,
        bracketEnabled, tournamentFormat,
        bracketSettings: bracketEnabled ? {
          courtNames: courtNames.filter(c => c.trim()),
          gameDurationMinutes: parseInt(bracketGameDuration) || 50,
          bufferMinutes: parseInt(bracketBuffer) || 10,
          dailyWindows: tournamentDayStrings.map((date, i) => ({
            date,
            startTime: parseAmPmToTime24(dayWindows[i]?.startDisplay ?? defaultWindowForDay(i).startDisplay),
            endTime: parseAmPmToTime24(dayWindows[i]?.endDisplay ?? defaultWindowForDay(i).endDisplay),
          })),
          championshipFormat,
        } : null,
        bracketStatus: 'registration_open',
      });

      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('preferredSports', 'array-contains', sport)));
        await Promise.all(
          usersSnap.docs
            .filter(d => d.id !== user.uid && d.data().notificationsEnabled !== false)
            .map(async (d) => {
              await addDoc(collection(db, 'notifications'), {
                toUserId: d.id,
                message: `New ${sport} tournament: ${name}`,
                body: `${finalCity}, ${finalState} • ${startDate}`,
                link: `/tournament?id=${tournamentRef.id}&postedBy=${user.uid}`,
                createdAt: serverTimestamp(),
                read: false,
              });
              if (d.data().pushToken) {
                await sendPush(d.data().pushToken, `🏆 New ${sport} Tournament`, `${name} — ${finalCity}, ${finalState}`);
              }
            })
        );
      } catch (_) {}

      resetFields();
      onSuccess();
    } catch (e) {
      setInfoModal({ visible: true, title: 'POST FAILED', message: 'We couldn\'t post your tournament. Check your internet connection and try again.' });
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <TouchableOpacity onPress={onBack} style={styles.formBackBtn}>
            <Text style={styles.formBackText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>CREATE TOURNAMENT</Text>
          <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Fill out the details below</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Tournament Name</Text>
          <TextInput style={styles.input} placeholder="Tournament name" placeholderTextColor="#a0b8b8" value={name} onChangeText={setName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { Keyboard.dismiss(); setShowSportPicker(true); }} />

          <Text style={styles.label}>Sport</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowSportPicker(!showSportPicker); setShowStatePicker(false); setShowDivisionPicker(false); }}>
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

          <Text style={styles.label}>Tournament Duration</Text>
          <View style={styles.durationRow}>
            {([1, 2, 3] as const).map(d => (
              <TouchableOpacity key={d} style={[styles.durationOption, tournamentDuration === d && styles.durationOptionActive]} onPress={() => setTournamentDuration(d)}>
                <Text style={[styles.durationOptionText, tournamentDuration === d && styles.durationOptionTextActive]}>{d} Day{d > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowStartPicker(true); }}>
            <Text style={startDate ? styles.dropdownSelected : styles.dropdownPlaceholder}>{startDate || 'Select start date...'}</Text>
          </TouchableOpacity>
          <DateTimePickerModal isVisible={showStartPicker} mode="date" onConfirm={(date) => { handleStartConfirm(date); setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 300); }} onCancel={() => setShowStartPicker(false)} />
          {startDate && tournamentDuration > 1 ? (
            <Text style={styles.durationHint}>{startDate} – {endDate}</Text>
          ) : null}

          <Text style={styles.label}>Venue / Address</Text>
          {!useManualLocation ? (
            <>
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
                  <View style={styles.autoFilledTextRow}>
                    <LocationIcon size={13} color="#003333" />
                    <Text style={styles.autoFilledText}>{[address, city, state, zip].filter(Boolean).join(', ')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setAddress(''); setCity(''); setState(''); setZip(''); }}>
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity style={styles.manualToggleBtn} onPress={() => setUseManualLocation(true)}>
                <Text style={styles.manualToggleText}>Can't find your venue? Enter manually</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.manualLocationBlock}>
              <View style={styles.manualLocationHeader}>
                <Text style={styles.manualLocationTitle}>Manual Location Entry</Text>
                <TouchableOpacity onPress={() => { setUseManualLocation(false); setManualVenue(''); setManualAddress(''); setManualCity(''); setManualState(''); setManualZip(''); }}>
                  <Text style={styles.manualLocationSwitch}>Use Search Instead</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="Venue name (e.g. Gallup High School Gym)" placeholderTextColor="#a0b8b8" value={manualVenue} onChangeText={setManualVenue} returnKeyType="next" />
              <TextInput style={styles.input} placeholder="Street address (optional)" placeholderTextColor="#a0b8b8" value={manualAddress} onChangeText={setManualAddress} returnKeyType="next" />
              <View style={styles.manualCityRow}>
                <TextInput style={[styles.input, { flex: 2 }]} placeholder="City" placeholderTextColor="#a0b8b8" value={manualCity} onChangeText={setManualCity} returnKeyType="next" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="State" placeholderTextColor="#a0b8b8" value={manualState} onChangeText={t => setManualState(t.toUpperCase().slice(0, 2))} autoCapitalize="characters" maxLength={2} returnKeyType="next" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="ZIP" placeholderTextColor="#a0b8b8" value={manualZip} onChangeText={setManualZip} keyboardType="numeric" maxLength={5} returnKeyType="next" />
              </View>
            </View>
          )}

          <Text style={styles.label}>Divisions</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowDivisionPicker(!showDivisionPicker); setShowSportPicker(false); setShowStatePicker(false); }}>
            <Text style={divisions.length > 0 ? styles.dropdownSelected : styles.dropdownPlaceholder}>{divisions.length > 0 ? divisions.join(', ') : 'Select divisions...'}</Text>
            <Text style={styles.dropdownArrow}>{showDivisionPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showDivisionPicker && (
            <ScrollView style={[styles.dropdownList, { maxHeight: 240 }]} nestedScrollEnabled>
              {divisionOptions.map((d) => (
                <TouchableOpacity key={d} style={styles.dropdownItemRow} onPress={() => toggleDivision(d)}>
                  {divisions.includes(d) ? <CheckIcon size={13} color="#008080" /> : null}
                  <Text style={[styles.dropdownItemText, divisions.includes(d) && styles.dropdownItemActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.dropdownItem, { backgroundColor: '#e0f5f5' }]} onPress={() => setShowDivisionPicker(false)}>
                <Text style={{ color: '#008080', fontWeight: 'bold', textAlign: 'center' }}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {divisions.length > 0 && (
            <View style={styles.divisionFeesBlock}>
              <Text style={styles.divisionFeesTitle}>Spots & Entry Fee per Division</Text>
              <Text style={styles.divisionFeesHint}>Leave spots blank — teams register and fill spots automatically</Text>
              {divisions.map(d => (
                <View key={d} style={styles.divisionRow}>
                  <View style={styles.divisionFeeLabel}>
                    <Text style={styles.divisionFeeLabelText}>{d}</Text>
                  </View>
                  <View style={styles.divisionRowInputs}>
                    <View style={styles.divisionSpotsInputWrapper}>
                      <TextInput style={styles.divisionFeeInput} placeholder="Spots" placeholderTextColor="#a0b8b8" value={divisionSpots[d] || ''} onChangeText={v => setDivisionSpots(prev => ({ ...prev, [d]: v.replace(/[^0-9]/g, '') }))} keyboardType="numeric" />
                    </View>
                    <View style={styles.divisionFeeInputWrapper}>
                      <Text style={styles.prizeInputPrefix}>$</Text>
                      <TextInput style={styles.divisionFeeInput} placeholder="Fee" placeholderTextColor="#a0b8b8" value={divisionFees[d] || ''} onChangeText={v => setDivisionFees(prev => ({ ...prev, [d]: v.replace(/[^0-9]/g, '') }))} keyboardType="numeric" />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.label}>Prizes / Awards</Text>
          {divisions.length > 1 && (
            <TouchableOpacity style={styles.samePrizesToggleRow} onPress={() => setSamePrizesForAll(p => !p)}>
              <View style={[styles.checkbox, samePrizesForAll && styles.checkboxActive]}>
                {samePrizesForAll ? <CheckIcon size={12} color="#fff" /> : null}
              </View>
              <Text style={styles.samePrizesLabel}>Same prizes for all divisions</Text>
            </TouchableOpacity>
          )}

          {divisions.length === 0 || samePrizesForAll ? (
            <PrizeEditor
              rows={sharedPrizeRows}
              onUpdateCash={updateSharedPrizeCash}
              onUpdatePhysical={updateSharedPrizePhysical}
              onAddRow={() => { if (sharedPrizeRows.length < 8) setSharedPrizeRows(prev => [...prev, { cash: '', physical: '' }]); }}
              useManual={sharedUseManual}
              onToggleManual={() => { setSharedUseManual(p => !p); setSharedManual(''); }}
              manual={sharedManual}
              onChangeManual={setSharedManual}
            />
          ) : (
            divisions.map(d => (
              <View key={d} style={styles.divPrizeBlock}>
                <Text style={styles.divPrizeLabel}>{d}</Text>
                <PrizeEditor
                  rows={divPrizeRows[d] || emptyPrizeRows()}
                  onUpdateCash={(i, v) => updateDivPrizeCash(d, i, v)}
                  onUpdatePhysical={(i, v) => updateDivPrizePhysical(d, i, v)}
                  onAddRow={() => addDivPrizeRow(d)}
                  useManual={divUseManual[d] || false}
                  onToggleManual={() => { setDivUseManual(prev => ({ ...prev, [d]: !prev[d] })); setDivManual(prev => ({ ...prev, [d]: '' })); }}
                  manual={divManual[d] || ''}
                  onChangeManual={v => setDivManual(prev => ({ ...prev, [d]: v }))}
                />
              </View>
            ))
          )}

          <Text style={styles.label}>Deposit Amount <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput ref={depositAmountRef} style={styles.input} placeholder="Amount in dollars" placeholderTextColor="#a0b8b8" value={depositAmount} onChangeText={setDepositAmount} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => { Keyboard.dismiss(); setShowDepositDuePicker(true); }} />

          <Text style={styles.label}>Deposit Due Date <Text style={styles.optional}>(optional)</Text></Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { Keyboard.dismiss(); setShowDepositDuePicker(true); }}>
            <Text style={depositDue ? styles.dropdownSelected : styles.dropdownPlaceholder}>{depositDue || 'Select deposit due date...'}</Text>
          </TouchableOpacity>
          <DateTimePickerModal isVisible={showDepositDuePicker} mode="date" onConfirm={handleDepositDueConfirm} onCancel={() => setShowDepositDuePicker(false)} />

          <Text style={styles.label}>Spectator Entrance Fee <Text style={styles.optional}>(optional)</Text></Text>
          <TouchableOpacity style={styles.freeSpectatorToggle} onPress={() => { const next = !isFreeSpectator; setIsFreeSpectator(next); if (next) { setSpectatorFee(''); setSpectatorPaymentMethods([]); setSpectatorPaymentOther(''); } }}>
            <View style={[styles.checkbox, isFreeSpectator && styles.checkboxActive]}>
              {isFreeSpectator ? <CheckIcon size={12} color="#fff" /> : null}
            </View>
            <Text style={styles.freeSpectatorText}>Open to Public — Free</Text>
          </TouchableOpacity>
          {!isFreeSpectator && (
            <TextInput ref={spectatorFeeRef} style={styles.input} placeholder="Amount in dollars" placeholderTextColor="#a0b8b8" value={spectatorFee} onChangeText={setSpectatorFee} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => rosterSizeRef.current?.focus()} />
          )}
          {spectatorFee && !isFreeSpectator ? (
            <View style={styles.paymentMethodsBlock}>
              <Text style={styles.paymentMethodsLabel}>Accepted Payment Methods <Text style={styles.optional}>(optional)</Text></Text>
              <View style={styles.paymentMethodsRow}>
                {paymentMethodOptions.map(method => {
                  const selected = spectatorPaymentMethods.includes(method);
                  return (
                    <TouchableOpacity key={method} style={[styles.paymentMethodPill, selected && styles.paymentMethodPillActive]} onPress={() => togglePaymentMethod(method)}>
                      <Text style={[styles.paymentMethodPillText, selected && styles.paymentMethodPillTextActive]}>{method}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {spectatorPaymentMethods.includes('Other') && (
                <TextInput ref={spectatorPaymentOtherRef} style={[styles.input, { marginTop: 8 }]} placeholder="e.g. Venmo, CashApp" placeholderTextColor="#a0b8b8" value={spectatorPaymentOther} onChangeText={setSpectatorPaymentOther} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => rosterSizeRef.current?.focus()} />
              )}
            </View>
          ) : null}

          <Text style={styles.label}>Roster Size</Text>
          <TextInput ref={rosterSizeRef} style={styles.input} placeholder="Number of players" placeholderTextColor="#a0b8b8" value={rosterSize} onChangeText={setRosterSize} keyboardType="numeric" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactNameRef.current?.focus()} />

          <Text style={styles.label}>Contact Name</Text>
          <TextInput ref={contactNameRef} style={styles.input} placeholder="Contact name" placeholderTextColor="#a0b8b8" value={contactName} onChangeText={setContactName} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactPhoneRef.current?.focus()} />

          <Text style={styles.label}>Contact Phone <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput ref={contactPhoneRef} style={styles.input} placeholder="Phone number" placeholderTextColor="#a0b8b8" value={contactPhone} onChangeText={v => setContactPhone(formatPhone(v))} keyboardType="phone-pad" maxLength={12} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => contactEmailRef.current?.focus()} />

          <Text style={styles.label}>Contact Email <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput ref={contactEmailRef} style={styles.input} placeholder="Email address" placeholderTextColor="#a0b8b8" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => Keyboard.dismiss()} />

          <View style={styles.sectionDivider} />

          <Text style={[styles.label, { marginTop: 8 }]}>Tournament Format</Text>
          <Text style={styles.bracketSettingsHint}>Displayed on the tournament card so teams know the structure before registering.</Text>
          <View style={styles.formatToggleRow}>
            <TouchableOpacity style={[styles.formatOption, tournamentFormat === 'double' && styles.formatOptionActive]} onPress={() => setTournamentFormat('double')}>
              <Text style={[styles.formatOptionText, tournamentFormat === 'double' && styles.formatOptionTextActive]}>Double Elimination</Text>
              <Text style={styles.formatOptionHint}>Teams need 2 losses to be eliminated</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.formatOption, tournamentFormat === 'single' && styles.formatOptionActive]} onPress={() => setTournamentFormat('single')}>
              <Text style={[styles.formatOptionText, tournamentFormat === 'single' && styles.formatOptionTextActive]}>Single Elimination</Text>
              <Text style={styles.formatOptionHint}>One loss and you're out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bracketToggleRow}>
            <View>
              <Text style={[styles.label, { marginTop: 12, marginBottom: 2 }]}>Bracket System</Text>
              <Text style={styles.bracketSettingsHint}>Use Zony's built-in bracket & scheduling</Text>
            </View>
            <TouchableOpacity style={[styles.togglePill, bracketEnabled && styles.togglePillActive]} onPress={() => setBracketEnabled(!bracketEnabled)}>
              <View style={[styles.toggleThumb, bracketEnabled && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          {bracketEnabled && (
            <>
              <Text style={styles.bracketSettingsHint}>Configure courts, hours, and format below.</Text>

              <Text style={styles.label}>Courts</Text>
              {courtNames.map((courtName, i) => (
                <View key={i} style={styles.courtNameRow}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. Main Court, Court A" placeholderTextColor="#a0b8b8" value={courtName} onChangeText={v => updateCourtName(i, v)} />
                  {courtNames.length > 1 && (
                    <TouchableOpacity onPress={() => removeCourtName(i)} style={styles.removeCourtBtn}>
                      <Text style={styles.removeCourtText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addCourtBtn} onPress={addCourtName}>
                <Text style={styles.addCourtBtnText}>+ Add Court</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Court Hours Per Day</Text>
              <Text style={styles.bracketSettingsHint}>Set the available game window for each tournament day.</Text>
              {tournamentDayStrings.length === 0 && (
                <Text style={styles.bracketSettingsHint}>Select a start date above to configure per-day hours.</Text>
              )}
              {tournamentDayStrings.map((date, i) => {
                const d = new Date(date + 'T00:00:00');
                const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
                const month = d.getMonth() + 1;
                const day = d.getDate();
                const window = dayWindows[i] ?? defaultWindowForDay(i);
                return (
                  <View key={date} style={styles.dayWindowRow}>
                    <Text style={styles.dayWindowLabel}>{dayName} {month}/{day}</Text>
                    <View style={styles.dayWindowInputs}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bracketSettingsHint}>Start</Text>
                        <TextInput style={styles.input} placeholder="e.g. 8:00 AM" placeholderTextColor="#a0b8b8" value={window.startDisplay} onChangeText={v => setDayWindows(prev => { const next = [...prev]; next[i] = { ...next[i], startDisplay: v }; return next; })} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bracketSettingsHint}>End</Text>
                        <TextInput style={styles.input} placeholder="e.g. 8:00 PM" placeholderTextColor="#a0b8b8" value={window.endDisplay} onChangeText={v => setDayWindows(prev => { const next = [...prev]; next[i] = { ...next[i], endDisplay: v }; return next; })} />
                      </View>
                    </View>
                  </View>
                );
              })}

              <Text style={styles.label}>Game Duration (minutes)</Text>
              <TextInput style={styles.input} placeholder="e.g. 50" placeholderTextColor="#a0b8b8" value={bracketGameDuration} onChangeText={setBracketGameDuration} keyboardType="numeric" />

              <Text style={styles.label}>Buffer Between Games (minutes)</Text>
              <TextInput style={styles.input} placeholder="e.g. 10" placeholderTextColor="#a0b8b8" value={bracketBuffer} onChangeText={setBracketBuffer} keyboardType="numeric" />

              <Text style={styles.label}>Championship Format</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowChampionshipPicker(true)}>
                <Text style={{ color: '#003333', fontSize: 15 }}>
                  {championshipFormat === 'single' ? 'Single Championship Game (default)' : 'Double Championship Game (bracket reset)'}
                </Text>
              </TouchableOpacity>
              {showChampionshipPicker && (
                <View style={styles.bracketPickerContainer}>
                  {(['single', 'double'] as const).map(fmt => (
                    <TouchableOpacity key={fmt} style={[styles.bracketPickerItem, championshipFormat === fmt && styles.bracketPickerItemActive]} onPress={() => { setChampionshipFormat(fmt); setShowChampionshipPicker(false); }}>
                      <Text style={[styles.bracketPickerText, championshipFormat === fmt && { color: '#008080', fontWeight: '700' }]}>
                        {fmt === 'single' ? 'Single Championship Game' : 'Double Championship Game (bracket reset)'}
                      </Text>
                      {fmt === 'single' && <Text style={styles.bracketPickerHint}>Most common. One game decides the champion.</Text>}
                      {fmt === 'double' && <Text style={styles.bracketPickerHint}>A second game is played if the losers-bracket team wins the first.</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.submitText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              {loading ? 'Posting...' : 'POST TOURNAMENT'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <InfoModal visible={infoModal.visible} title={infoModal.title} message={infoModal.message} onClose={() => setInfoModal({ visible: false, title: '', message: '' })} />
    </KeyboardAvoidingView>
  );
}

function BoardForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });
  const [headerHeight, setHeaderHeight] = useState(120);
  const [name, setName] = useState('');
  const [forTournament, setForTournament] = useState('');
  const [forTournamentId, setForTournamentId] = useState('');
  const [forTournamentStartDate, setForTournamentStartDate] = useState('');
  const [forTournamentDivisions, setForTournamentDivisions] = useState<string[]>([]);
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [tournaments, setTournaments] = useState<{ id: string; name: string; sport: string; startDate: string; divisions: string[] }[]>([]);
  const [sport, setSport] = useState('');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [division, setDivision] = useState('');
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: '', message: '' });

  const availableDivisions = forTournamentDivisions.length > 0 ? forTournamentDivisions : divisionOptions;
  const descPlaceholder = boardDescriptionPlaceholders[Math.floor(Math.random() * boardDescriptionPlaceholders.length)];

  useEffect(() => {
    const user = auth.currentUser;
    if (user?.email) setContactEmail(user.email);
    const loadTournaments = async () => {
      try {
        const snap = await getDocs(collection(db, 'tournaments'));
        const data = snap.docs.map(d => ({ id: d.id, name: d.data().name || 'Unnamed', sport: d.data().sport || '', startDate: d.data().date ? d.data().date.split(' - ')[0] : '', divisions: d.data().divisions || [] }));
        setTournaments(data);
      } catch (_) {}
    };
    const loadName = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().username) setName(snap.data().username);
      } catch (_) {}
    };
    loadTournaments(); loadName();
  }, []);

  const resetFields = () => {
    setName(''); setForTournament(''); setForTournamentId(''); setForTournamentStartDate('');
    setForTournamentDivisions([]); setSport(''); setDivision('');
    setContactPhone(''); setContactEmail(''); setDescription('');
  };

  const closeAll = () => { setShowTournamentPicker(false); setShowSportPicker(false); setShowDivisionPicker(false); };

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!name) missing.push('Your Name');
    if (!sport) missing.push('Sport');
    if (!division) missing.push('Division');
    if (missing.length > 0) {
      setInfoModal({ visible: true, title: 'MISSING INFORMATION', message: `Please fill in:\n\n${missing.join('\n')}` });
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      let expiresAt: Timestamp;
      if (forTournamentStartDate) {
        const parsed = new Date(forTournamentStartDate);
        expiresAt = Timestamp.fromDate(isNaN(parsed.getTime()) ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : parsed);
      } else {
        expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      }
      await addDoc(collection(db, 'board'), {
        name, forTournament, forTournamentId, sport, division,
        contactPhone, contactEmail, description,
        postedBy: user.uid, createdAt: serverTimestamp(), expiresAt,
      });
      resetFields(); onSuccess();
    } catch (_) {
      setInfoModal({ visible: true, title: 'POST FAILED', message: 'We couldn\'t post to the board. Check your internet connection and try again.' });
    }
    setLoading(false);
  };

  const DropdownField = ({ label, value, placeholder, show, onToggle, options, onSelect, scrollable }: { label: string; value: string; placeholder: string; show: boolean; onToggle: () => void; options: string[]; onSelect: (v: string) => void; scrollable?: boolean; }) => (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdown} onPress={onToggle} activeOpacity={0.8}>
        <Text style={value ? styles.dropdownSelected : styles.dropdownPlaceholder}>{value || placeholder}</Text>
        <Text style={styles.dropdownArrow}>{show ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {show && (
        <ScrollView style={[styles.dropdownList, scrollable && { maxHeight: 240 }]} nestedScrollEnabled scrollEnabled={!!scrollable}>
          {options.map(opt => (
            <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { onSelect(opt); closeAll(); }}>
              <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[styles.headerBlock, { backgroundColor: '#7A1E1E' }]} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
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
        <TouchableOpacity onPress={onBack} style={styles.formBackBtn}>
          <Text style={styles.formBackText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.header, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>SPORTS BOARD POST</Text>
        <Text style={[styles.sub, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>Let the community know</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput style={styles.input} placeholder="e.g. Marcus Webb" placeholderTextColor="#a0b8b8" value={name} onChangeText={setName} />

        <View>
          <Text style={styles.label}>For Tournament <Text style={styles.optional}>(optional)</Text></Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => { closeAll(); setShowTournamentPicker(!showTournamentPicker); }} activeOpacity={0.8}>
            <Text style={forTournament ? styles.dropdownSelected : styles.dropdownPlaceholder}>{forTournament || 'Select a tournament...'}</Text>
            <Text style={styles.dropdownArrow}>{showTournamentPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showTournamentPicker && (
            <ScrollView style={[styles.dropdownList, { maxHeight: 200 }]} nestedScrollEnabled>
              {tournaments.length === 0 ? (
                <View style={styles.dropdownItem}><Text style={styles.dropdownItemText}>No tournaments available</Text></View>
              ) : (
                tournaments.map(t => (
                  <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { setForTournament(t.name); setForTournamentId(t.id); setForTournamentStartDate(t.startDate); setForTournamentDivisions(t.divisions || []); setDivision(''); if (t.sport) setSport(t.sport); closeAll(); }}>
                    <Text style={[styles.dropdownItemText, forTournament === t.name && styles.dropdownItemActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>

        <DropdownField label="Sport" value={sport} placeholder="Select a sport..." show={showSportPicker} onToggle={() => { closeAll(); setShowSportPicker(!showSportPicker); }} options={sportOptions} onSelect={setSport} />
        <DropdownField label="Division" value={division} placeholder="Select division..." show={showDivisionPicker} onToggle={() => { closeAll(); setShowDivisionPicker(!showDivisionPicker); }} options={availableDivisions} onSelect={setDivision} scrollable />
        {forTournament && forTournamentDivisions.length > 0 && (
          <Text style={styles.divisionHint}>Showing divisions offered by {forTournament}</Text>
        )}

        <Text style={styles.label}>Contact Phone <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput style={styles.input} placeholder="e.g. 505-555-1234" placeholderTextColor="#a0b8b8" value={contactPhone} onChangeText={v => setContactPhone(formatPhone(v))} keyboardType="phone-pad" maxLength={12} />

        <Text style={styles.label}>Contact Email <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput style={styles.input} placeholder="e.g. john@email.com" placeholderTextColor="#a0b8b8" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>What are you looking for?</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder={descPlaceholder} placeholderTextColor="#a0b8b8" value={description} onChangeText={setDescription} multiline numberOfLines={5} />

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#7A1E1E' }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          <Text style={[styles.submitText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{loading ? 'Posting...' : 'POST TO BOARD'}</Text>
        </TouchableOpacity>
      </View>

      <InfoModal visible={infoModal.visible} title={infoModal.title} message={infoModal.message} onClose={() => setInfoModal({ visible: false, title: '', message: '' })} />
    </ScrollView>
  );
}

export default function PostScreen() {
  const router = useRouter();
  const [view, setView] = useState<'hub' | 'tournament' | 'board'>('hub');
  const [successType, setSuccessType] = useState<'tournament' | 'board' | null>(null);

  if (successType) {
    return <SuccessModal type={successType} onBack={() => { setSuccessType(null); setView('hub'); router.push('/'); }} />;
  }
  if (view === 'tournament') {
    return <TournamentForm onBack={() => setView('hub')} onSuccess={() => setSuccessType('tournament')} />;
  }
  if (view === 'board') {
    return <BoardForm onBack={() => setView('hub')} onSuccess={() => setSuccessType('board')} />;
  }
  return <HubScreen onSelect={setView} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  hubContainer: { flex: 1, backgroundColor: '#f5ede0', paddingTop: 60 },
  hubHeader: { paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
  hubTitle: { fontSize: 36, color: '#003333', letterSpacing: 3 },
  hubSub: { fontSize: 14, color: '#a0b8b8', marginTop: 4 },
  hubCards: { paddingHorizontal: 20, gap: 16 },
  hubCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, position: 'relative' },
  hubCardIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  hubCardTitle: { fontSize: 22, color: '#003333', letterSpacing: 1, marginBottom: 6 },
  hubCardDesc: { fontSize: 14, color: '#5a7a7a', lineHeight: 20 },
  hubCardArrow: { position: 'absolute', right: 20, top: '50%', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hubCardArrowText: { color: '#fff', fontSize: 20, lineHeight: 22 },
  headerBlock: { backgroundColor: '#008080', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 0, marginBottom: 8 },
  header: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 3 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 2 },
  formBackBtn: { paddingHorizontal: 20, marginBottom: 8 },
  formBackText: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  form: { paddingHorizontal: 20, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', color: '#003333', marginBottom: 6, marginTop: 10 },
  optional: { fontSize: 12, fontWeight: '400', color: '#a0b8b8' },
  bracketSettingsHint: { fontSize: 12, color: '#a0b8b8', marginBottom: 6 },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  durationOption: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e0d8c8' },
  durationOptionActive: { borderColor: '#008080', backgroundColor: '#e8f4f4' },
  durationOptionText: { fontSize: 14, color: '#5a7a7a', fontWeight: '600' },
  durationOptionTextActive: { color: '#008080' },
  durationHint: { fontSize: 12, color: '#008080', marginBottom: 6, marginTop: 2 },
  sectionDivider: { height: 1, backgroundColor: '#e0d8c8', marginTop: 20, marginBottom: 8 },
  formatToggleRow: { gap: 8, marginBottom: 8 },
  formatOption: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#e0d8c8' },
  formatOptionActive: { borderColor: '#008080', backgroundColor: '#e8f4f4' },
  formatOptionText: { fontSize: 15, color: '#5a7a7a', fontWeight: '600' },
  formatOptionTextActive: { color: '#008080' },
  formatOptionHint: { fontSize: 12, color: '#a0b8b8', marginTop: 2 },
  togglePill: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#e0d8c8', justifyContent: 'center', paddingHorizontal: 3 },
  togglePillActive: { backgroundColor: '#008080' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  courtNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  removeCourtBtn: { padding: 8 },
  removeCourtText: { fontSize: 16, color: '#cc4444' },
  addCourtBtn: { borderWidth: 1, borderColor: '#008080', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 8, backgroundColor: '#e0f5f5' },
  addCourtBtnText: { color: '#008080', fontWeight: 'bold', fontSize: 14 },
  bracketPickerContainer: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 12, overflow: 'hidden' },
  bracketPickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0e8d8' },
  bracketPickerItemActive: { backgroundColor: '#f5ede0' },
  bracketPickerText: { fontSize: 15, color: '#003333' },
  bracketPickerHint: { fontSize: 12, color: '#a0b8b8', marginTop: 2 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', marginBottom: 4, borderWidth: 1, borderColor: '#e0d8c8' },
  textArea: { height: 120, textAlignVertical: 'top' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 4 },
  dropdownPlaceholder: { fontSize: 15, color: '#a0b8b8' },
  dropdownSelected: { fontSize: 15, color: '#003333', flex: 1, marginRight: 8 },
  dropdownArrow: { fontSize: 12, color: '#008080' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e0d8c8' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  dropdownItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fafa' },
  dropdownItemText: { fontSize: 15, color: '#003333' },
  dropdownItemActive: { color: '#008080', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#7A1E1E', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  successContainer: { flex: 1, backgroundColor: '#f5ede0', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  successTitle: { fontSize: 32, color: '#008080', letterSpacing: 2, marginTop: 8, textAlign: 'center' },
  successSub: { fontSize: 16, color: '#5a7a7a', textAlign: 'center' },
  backBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, marginTop: 20 },
  backText: { color: '#fff', fontSize: 16, letterSpacing: 1 },
  placesWrapper: { marginBottom: 12, zIndex: 10 },
  autoFilledBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  autoFilledTextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  autoFilledText: { fontSize: 13, color: '#003333', flex: 1 },
  clearText: { fontSize: 13, color: '#008080', fontWeight: 'bold' },
  manualToggleBtn: { paddingVertical: 10, alignItems: 'center', marginBottom: 4 },
  manualToggleText: { fontSize: 13, color: '#008080', fontWeight: '600', textDecorationLine: 'underline' },
  manualLocationBlock: { backgroundColor: '#f0fafa', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e0f0f0', gap: 4 },
  manualLocationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  manualLocationTitle: { fontSize: 13, fontWeight: '700', color: '#003333' },
  manualLocationSwitch: { fontSize: 12, color: '#008080', fontWeight: '600', textDecorationLine: 'underline' },
  manualCityRow: { flexDirection: 'row', gap: 6 },
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
  divisionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  divisionRowInputs: { flex: 1, flexDirection: 'row', gap: 8 },
  divisionFeeLabel: { backgroundColor: '#008080', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 52, alignItems: 'center' },
  divisionFeeLabelText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  divisionSpotsInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e0d8c8', paddingHorizontal: 10 },
  divisionFeeInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e0d8c8', paddingHorizontal: 10 },
  divisionFeeInput: { flex: 1, paddingVertical: 8, fontSize: 15, color: '#003333' },
  divisionHint: { fontSize: 11, color: '#a0b8b8', marginTop: -4, marginBottom: 8, paddingLeft: 4 },
  paymentMethodsBlock: { marginBottom: 8 },
  paymentMethodsLabel: { fontSize: 13, fontWeight: '600', color: '#003333', marginBottom: 8 },
  paymentMethodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentMethodPill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#e0d8c8', backgroundColor: '#fff' },
  paymentMethodPillActive: { backgroundColor: '#008080', borderColor: '#008080' },
  paymentMethodPillText: { fontSize: 13, color: '#5a7a7a', fontWeight: '600' },
  paymentMethodPillTextActive: { color: '#fff' },
  freeSpectatorToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#e0d8c8', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#008080', borderColor: '#008080' },
  freeSpectatorText: { fontSize: 14, color: '#003333', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalBox: { backgroundColor: '#f5ede0', borderRadius: 24, padding: 24, width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 20, color: '#003333', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  modalMsg: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  modalOkBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalOkText: { fontSize: 15, color: '#fff', letterSpacing: 1 },
  bracketToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 8 },
  dayWindowRow: { marginBottom: 14 },
  dayWindowLabel: { fontSize: 13, fontWeight: '700', color: '#003333', marginBottom: 6 },
  dayWindowInputs: { flexDirection: 'row', gap: 10 },
  samePrizesToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  samePrizesLabel: { fontSize: 14, color: '#003333', fontWeight: '600' },
  divPrizeBlock: { backgroundColor: '#f0fafa', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e0f0f0' },
  divPrizeLabel: { fontSize: 13, fontWeight: '700', color: '#008080', marginBottom: 10 },
});