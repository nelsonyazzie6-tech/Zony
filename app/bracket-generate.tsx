import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  addDoc, collection, doc, getDoc, getDocs,
  serverTimestamp, updateDoc, writeBatch,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { generateBracketFromTeams, generateSeedPlacements, MAX_AUTO_BRACKET_TEAMS } from '../src/bracket/bracketEngine';
import { cascadeByeAdvancements, AdvancementGame } from '../src/bracket/bracketAdvancement';
import { BracketDoc, BracketPaths, GameDoc } from '../src/bracket/bracketSchema';
import { getChampionshipExplanation } from '../src/bracket/championshipFormat';
import { generateScheduleMultiDivision, generateSlots, SchedulerInput, validateConstraints } from '../src/bracket/schedulingEngine';

type DivisionSummary = {
  name: string;
  teamCount: number;
  teams: { id: string; teamName: string; registeredBy: string }[];
  bracketSize: number;
  byeCount: number;
  alreadyGenerated: boolean;
};

export default function BracketGenerateScreen() {
  const router = useRouter();
  const { tournamentId, divisionId } = useLocalSearchParams<{ tournamentId: string; divisionId: string }>();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tournament, setTournament] = useState<any>(null);
  const [divisionSummaries, setDivisionSummaries] = useState<DivisionSummary[]>([]);
  const [teams, setTeams] = useState<{ id: string; teamName: string; registeredBy: string }[]>([]);
  const [constraintError, setConstraintError] = useState<string | null>(null);
  const [generateProgress, setGenerateProgress] = useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCourtNames, setEditCourtNames] = useState<string[]>(['Court 1']);
  const [editDailyStart, setEditDailyStart] = useState('8:00 AM');
  const [editDailyEnd, setEditDailyEnd] = useState('8:00 PM');
  const [editGameDuration, setEditGameDuration] = useState('50');
  const [editBuffer, setEditBuffer] = useState('10');
  const [editChampFormat, setEditChampFormat] = useState<'single' | 'double'>('single');
  const [showChampPicker, setShowChampPicker] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editDuration, setEditDuration] = useState<1 | 2 | 3>(1);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showTestTeamsModal, setShowTestTeamsModal] = useState(false);
  const [generatingTestTeams, setGeneratingTestTeams] = useState(false);

  const generateTestTeams = async (count: number) => {
    if (!tournamentId) return;
    setGeneratingTestTeams(true);
    try {
      const divisions = divisionSummaries.length > 0
        ? divisionSummaries.map(d => d.name)
        : [divisionId];
      const batch = writeBatch(db);
      divisions.forEach(div => {
        for (let i = 1; i <= count; i++) {
          const teamRef = doc(collection(db, 'tournaments', tournamentId, 'teams'));
          batch.set(teamRef, {
            teamName: `Test Team ${i}`,
            contactName: 'Dev Test',
            contactInfo: '',
            division: div,
            registeredBy: `dev-test-${div}-${i}-${Date.now()}`,
            isDevTestTeam: true,
            createdAt: serverTimestamp(),
          });
        }
      });
      await batch.commit();
      await loadTournament();
      setShowTestTeamsModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not generate test teams.');
    } finally {
      setGeneratingTestTeams(false);
    }
  };

  const loadTournament = async () => {
    if (!tournamentId || !divisionId) return;
    try {
      const tSnap = await getDoc(doc(db, 'tournaments', tournamentId));
      if (!tSnap.exists()) return;
      const data = { id: tSnap.id, ...tSnap.data() };
      setTournament(data);

      const teamsSnap = await getDocs(collection(db, 'tournaments', tournamentId, 'teams'));
      const allTeams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const primaryTeams = allTeams.filter((t: any) => t.division === divisionId);
      setTeams(primaryTeams);

      const divisions: string[] = (data as any).divisions || [divisionId];
      const summaries: DivisionSummary[] = divisions.map(div => {
        const divTeams = allTeams.filter((t: any) => t.division === div);
        const count = divTeams.length;
        const bSize = count > 0 ? nextPow2(count) : 0;
        const alreadyGenerated = !!(data as any)[`bracketGenerated_${div}`];
        return {
          name: div,
          teamCount: count,
          teams: divTeams,
          bracketSize: bSize,
          byeCount: count > 0 ? bSize - count : 0,
          alreadyGenerated,
        };
      });
      setDivisionSummaries(summaries);
    } catch (e) {
      console.log('Error loading bracket data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTournament(); }, [tournamentId, divisionId]);

  // Soft constraint check — warn but don't hard block
  useEffect(() => {
    if (!tournament || teams.length === 0) return;
    const settings = tournament.bracketSettings;
    if (!settings) return;
    try {
      const dates = getTournamentDays(tournament);
      if (dates.length === 0) {
        setConstraintError('Tournament dates are not set. Please edit the tournament and save the start and end dates.');
        return;
      }
      const courts = resolveCourts(settings);
      if (courts.length === 0) {
        setConstraintError('No courts configured. Add at least one court in Edit Settings.');
        return;
      }
      // Soft check: just warn if slots are tight, don't hard block
      const input: SchedulerInput = {
        dates, courts,
        dailyStartTime: settings.dailyStartTime || '08:00',
        dailyEndTime: settings.dailyEndTime || '20:00',
        gameDurationMinutes: settings.gameDurationMinutes || 50,
        bufferMinutes: settings.bufferMinutes || 10,
      };
      const tempBracket = generateBracketFromTeams(teams.map(t => t.teamName));
      const slots = generateSlots(input);
      const validation = validateConstraints(tempBracket, slots);
      // Only block on missing dates/courts — slot overflow is now handled
      // gracefully as TBD games, so we don't hard-block on it
      if (!validation.valid && (validation as any).reason?.includes('dates') || !validation.valid && (validation as any).reason?.includes('courts')) {
        setConstraintError((validation as any).reason);
      } else {
        setConstraintError(null);
      }
    } catch (e: any) {
      setConstraintError(e.message);
    }
  }, [tournament, teams]);

  const openEditModal = () => {
    const s = tournament?.bracketSettings || {};
    const courts = resolveCourts(s);
    setEditCourtNames(courts.length > 0 ? courts : ['Court 1']);
    setEditDailyStart(formatTimeAmPm(s.dailyStartTime || '08:00'));
    setEditDailyEnd(formatTimeAmPm(s.dailyEndTime || '20:00'));
    setEditGameDuration(String(s.gameDurationMinutes || 50));
    setEditBuffer(String(s.bufferMinutes || 10));
    setEditChampFormat(s.championshipFormat || 'single');
    setShowChampPicker(false);
    const days = getTournamentDays(tournament);
    setEditDuration((days.length as 1 | 2 | 3) || 1);
    if (days.length > 0) {
      const d = new Date(days[0] + 'T00:00:00');
      setEditStartDate(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    } else {
      setEditStartDate(tournament?.startDate || '');
    }
    setShowDatePicker(false);
    setShowEditModal(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const newSettings = {
        courtNames: editCourtNames.filter(c => c.trim()),
        dailyStartTime: parseAmPmToTime24(editDailyStart),
        dailyEndTime: parseAmPmToTime24(editDailyEnd),
        gameDurationMinutes: parseInt(editGameDuration) || 50,
        bufferMinutes: parseInt(editBuffer) || 10,
        championshipFormat: editChampFormat,
      };
      const tournamentDays: string[] = [];
      const startParsed = new Date(editStartDate);
      if (!isNaN(startParsed.getTime())) {
        for (let i = 0; i < editDuration; i++) {
          const d = new Date(startParsed);
          d.setDate(d.getDate() + i);
          tournamentDays.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
        }
      }
      const endDateDisplay = (() => {
        if (tournamentDays.length === 0) return editStartDate;
        const last = new Date(tournamentDays[tournamentDays.length - 1] + 'T00:00:00');
        return last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      })();
      await updateDoc(doc(db, 'tournaments', tournamentId!), {
        bracketSettings: newSettings,
        ...(tournamentDays.length > 0 && {
          tournamentDays,
          tournamentDuration: editDuration,
          date: `${editStartDate} - ${endDateDisplay}`,
        }),
      });
      await loadTournament();
      setShowEditModal(false);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not save settings. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!tournament || !tournamentId) return;
    const user = auth.currentUser;
    if (!user || user.uid !== tournament.postedBy) {
      Alert.alert('Error', 'Only the tournament organizer can generate brackets.');
      return;
    }
    if (constraintError) { Alert.alert('Cannot Generate', constraintError); return; }

    const eligible = divisionSummaries.filter(d => !d.alreadyGenerated && d.teamCount >= 2);
    const skipped = divisionSummaries.filter(d => !d.alreadyGenerated && d.teamCount < 2);
    const alreadyDone = divisionSummaries.filter(d => d.alreadyGenerated);

    if (eligible.length === 0) {
      Alert.alert(
        'Nothing to Generate',
        alreadyDone.length > 0
          ? 'All divisions already have brackets generated.'
          : 'No divisions have enough teams (minimum 2) to generate a bracket.',
      );
      return;
    }

    const skipMsg = skipped.length > 0
      ? `\n\nSkipping: ${skipped.map(d => `${d.name} (${d.teamCount} team${d.teamCount === 1 ? '' : 's'})`).join(', ')} — need at least 2.`
      : '';
    const alreadyMsg = alreadyDone.length > 0
      ? `\n\nAlready generated: ${alreadyDone.map(d => d.name).join(', ')} — will not be overwritten.`
      : '';

    Alert.alert(
      'Generate All Brackets?',
      `This will generate brackets for ${eligible.length} division${eligible.length === 1 ? '' : 's'}:\n${eligible.map(d => `• ${d.name} (${d.teamCount} teams)`).join('\n')}${skipMsg}${alreadyMsg}\n\nAll divisions share courts — the scheduler prevents conflicts. Games that can't fit will show as Time TBD.\n\nRegistration will be locked. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate All', style: 'default',
          onPress: async () => {
            setGenerating(true);
            try {
              const settings = tournament.bracketSettings || {};
              const dates = getTournamentDays(tournament);
              const courts = resolveCourts(settings);

              // Step 1: build all brackets in memory
              setGenerateProgress('Generating brackets...');
              const divisionBrackets: Array<{
                divisionId: string;
                bracket: ReturnType<typeof generateBracketFromTeams>;
                shuffled: DivisionSummary['teams'];
                slotTeams: (DivisionSummary['teams'][0] | null)[];
              }> = [];

              for (const div of eligible) {
                const shuffled = [...div.teams].sort(() => Math.random() - 0.5);
                const bracket = generateBracketFromTeams(shuffled.map(t => t.teamName));
                const seedPlacements = generateSeedPlacements(bracket.bracketSize, shuffled.length);
                const slotTeams = seedPlacements.map(s => (s === -1 ? null : shuffled[s - 1] || null));
                divisionBrackets.push({ divisionId: div.name, bracket, shuffled, slotTeams });
              }

              // Step 2: shared slot matrix — no two divisions clash
              setGenerateProgress('Scheduling across all courts...');
              const scheduleInput: SchedulerInput = {
                dates,
                courts,
                dailyStartTime: settings.dailyStartTime || '08:00',
                dailyEndTime: settings.dailyEndTime || '20:00',
                gameDurationMinutes: settings.gameDurationMinutes || 50,
                bufferMinutes: settings.bufferMinutes || 10,
              };

              const multiSchedule = generateScheduleMultiDivision(
                divisionBrackets.map(d => ({ divisionId: d.divisionId, bracket: d.bracket })),
                scheduleInput,
              );

              // Step 3: write each division to Firestore
              const failed: string[] = [];
              for (const divData of divisionBrackets) {
                setGenerateProgress(`Saving ${divData.divisionId}...`);
                try {
                  const { divisionId: div, bracket, shuffled, slotTeams } = divData;
                  const divSchedule = multiSchedule.byDivision[div] || [];
                  const scheduleLookup = new Map(divSchedule.map(sg => [sg.gameId, sg]));

                  const gameMap = new Map<string, AdvancementGame>();
                  for (const game of bracket.games) {
                    const topTeam = game.topSeed && game.topSeed > 0 ? slotTeams[game.topSeed - 1] : null;
                    const bottomTeam = game.bottomSeed && game.bottomSeed > 0 ? slotTeams[game.bottomSeed - 1] : null;
                    let status: AdvancementGame['status'] = 'pending';
                    if (!game.isBye && topTeam && bottomTeam) status = 'ready';
                    gameMap.set(game.id, {
                      id: game.id, isBye: game.isBye, status,
                      topTeamId: topTeam?.id || null, topTeamName: topTeam?.teamName || null,
                      bottomTeamId: bottomTeam?.id || null, bottomTeamName: bottomTeam?.teamName || null,
                      winnerId: null, winnerName: null, loserId: null, loserName: null,
                      winnerAdvancesTo: game.winnerAdvancesTo, winnerAdvancesToSlot: game.winnerAdvancesToSlot,
                      loserDropsTo: game.loserDropsTo, loserDropsToSlot: game.loserDropsToSlot,
                    });
                  }
                  cascadeByeAdvancements(gameMap);

                  const batch = writeBatch(db);
                  const bracketRef = doc(db, BracketPaths.bracket(tournamentId!, div));
                  const bracketDoc: Partial<BracketDoc> = {
                    divisionId: div, tournamentId: tournamentId!,
                    championshipFormat: settings.championshipFormat || 'single',
                    bracketSize: bracket.bracketSize,
                    teamCount: shuffled.length,
                    status: 'generated',
                    generatedAt: serverTimestamp() as any,
                    completedAt: null,
                    seededTeams: shuffled.map((team, i) => ({ seed: i + 1, teamId: team.id, teamName: team.teamName, isBye: false })),
                    championTeamId: null,
                    grandFinalId: 'GF-1',
                    bracketResetId: settings.championshipFormat === 'double' ? 'GF-2' : null,
                    bracketResetRequired: false,
                    scheduleGeneratedAt: serverTimestamp() as any,
                    explanation: getChampionshipExplanation(settings.championshipFormat || 'single'),
                  };
                  batch.set(bracketRef, bracketDoc);

                  for (const game of bracket.games) {
                    const state = gameMap.get(game.id)!;
                    const gameRef = doc(db, BracketPaths.game(tournamentId!, div, game.id));
                    const sg = scheduleLookup.get(game.id);
                    const gameDoc: Partial<GameDoc> = {
                      id: game.id, divisionId: div, tournamentId: tournamentId!,
                      bracket: game.bracket, round: game.round, position: game.position,
                      topTeamId: state.topTeamId, topTeamName: state.topTeamName,
                      bottomTeamId: state.bottomTeamId, bottomTeamName: state.bottomTeamName,
                      isBye: game.isBye,
                      fedByWinnerOf: game.fedByWinner || null,
                      winnerAdvancesTo: state.winnerAdvancesTo, winnerAdvancesToSlot: state.winnerAdvancesToSlot,
                      loserDropsTo: state.loserDropsTo, loserDropsToSlot: state.loserDropsToSlot,
                      status: state.status,
                      winnerId: state.winnerId, winnerName: state.winnerName,
                      loserId: state.loserId, loserName: state.loserName,
                      topScore: null, bottomScore: null,
                      resultEnteredAt: state.status === 'bye' ? (serverTimestamp() as any) : null,
                      resultEnteredBy: state.status === 'bye' ? 'system' : null,
                      courtId: sg?.courtId || null,
                      courtName: sg?.courtId || null,
                      scheduledDate: sg?.date || null,
                      scheduledTime: sg?.startTime || null,
                      scheduledSlotIndex: sg?.slotIndex ?? null,
                      createdAt: serverTimestamp() as any,
                    };
                    batch.set(gameRef, gameDoc);
                  }

                  batch.update(doc(db, 'tournaments', tournamentId!), {
                    bracketStatus: 'bracket_generated',
                    [`bracketGenerated_${div}`]: true,
                  });
                  await batch.commit();

                  // Notify teams
                  try {
                    const notified = new Set<string>();
                    await Promise.all(shuffled.map(async (td) => {
                      const uid = td.registeredBy;
                      if (!uid || notified.has(uid)) return;
                      notified.add(uid);
                      await addDoc(collection(db, 'notifications'), {
                        toUserId: uid,
                        message: `Bracket is now live for ${tournament.name}`,
                        body: `The ${div} bracket is ready. Tap to view matchups.`,
                        link: `/bracket?tournamentId=${tournamentId}&divisionId=${div}&postedBy=${tournament.postedBy}`,
                        createdAt: serverTimestamp(), read: false,
                      });
                      const userSnap = await getDoc(doc(db, 'users', uid));
                      if (userSnap.exists() && userSnap.data().pushToken && userSnap.data().notificationsEnabled !== false) {
                        await fetch('https://exp.host/--/api/v2/push/send', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ to: userSnap.data().pushToken, title: '🏆 Bracket is Live!', body: `${tournament.name} — ${div} bracket is ready.`, sound: 'default' }),
                        });
                      }
                    }));
                  } catch (e) { console.log('Notification error:', e); }

                } catch (e: any) {
                  console.error(`Failed ${divData.divisionId}:`, e);
                  failed.push(divData.divisionId);
                }
              }

              setGenerating(false);
              setGenerateProgress(null);
              await loadTournament();

              const overflowMsg = multiSchedule.overflowGames > 0
                ? `\n\n${multiSchedule.overflowGames} game${multiSchedule.overflowGames === 1 ? '' : 's'} couldn't fit the schedule and will show as "Time TBD" — add more courts or extend hours to fill these in.`
                : '';

              if (failed.length > 0) {
                Alert.alert(
                  'Partial Success',
                  `Generated ${eligible.length - failed.length} of ${eligible.length} divisions.\n\nFailed: ${failed.join(', ')}${overflowMsg}`,
                  [{ text: 'OK', onPress: () => router.back() }],
                );
              } else {
                Alert.alert(
                  'All Brackets Generated!',
                  `${eligible.length} division${eligible.length === 1 ? '' : 's'} generated with a conflict-free shared schedule.${overflowMsg}`,
                  [{ text: 'View Bracket', onPress: () => router.back() }],
                );
              }
            } catch (e: any) {
              console.error('Multi-division generation error:', e);
              setGenerating(false);
              setGenerateProgress(null);
              Alert.alert('Generation Failed', e.message || 'Something went wrong. Please try again.');
            }
          },
        },
      ],
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#008080" /></View>;
  if (!tournament) return <View style={styles.centered}><Text style={styles.errorText}>Tournament not found.</Text></View>;

  const settings = tournament.bracketSettings || {};
  const dates = getTournamentDays(tournament);
  const resolvedCourts = resolveCourts(settings);
  const courts = resolvedCourts.length;
  const gameDuration = settings.gameDurationMinutes || 50;
  const buffer = settings.bufferMinutes || 10;
  const format = settings.championshipFormat || 'single';

  const allGenerated = divisionSummaries.length > 0 && divisionSummaries.every(d => d.alreadyGenerated);
  const anyEligible = divisionSummaries.some(d => !d.alreadyGenerated && d.teamCount >= 2);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.title, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>GENERATE BRACKET</Text>
      <Text style={styles.subtitle}>{tournament.name}</Text>

      {/* Bracket Settings Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={[styles.summaryTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>BRACKET SETTINGS</Text>
          <TouchableOpacity style={styles.editSettingsBtn} onPress={openEditModal}>
            <Text style={styles.editSettingsBtnText}>Edit Settings</Text>
          </TouchableOpacity>
        </View>
        <Row label="Format" value="Double Elimination" />
        <Row label="Championship" value={format === 'single' ? 'Single Game' : 'Double Game (bracket reset)'} />
        <Row label="Courts" value={courts > 0 ? resolvedCourts.join(', ') : '—'} />
        <Row label="Daily Hours" value={`${formatTimeAmPm(settings.dailyStartTime || '08:00')} – ${formatTimeAmPm(settings.dailyEndTime || '20:00')}`} />
        <Row label="Game Duration" value={`${gameDuration} min + ${buffer} min buffer`} />
        <Row label="Tournament Dates" value={dates.length > 0 ? dates.map(d => {
          const dt = new Date(d + 'T00:00:00');
          return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }).join(', ') : 'Not set'} />
      </View>

      {/* Explanation */}
      <View style={styles.explanationCard}>
        <Text style={styles.explanationText}>{getChampionshipExplanation(format)}</Text>
      </View>

      {/* Constraint error */}
      {constraintError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorCardText}>{constraintError}</Text>
          <TouchableOpacity onPress={openEditModal} style={{ marginTop: 8 }}>
            <Text style={styles.errorCardHint}>Tap "Edit Settings" above to fix this.</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Division summaries */}
      <Text style={[styles.sectionTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
        DIVISIONS ({divisionSummaries.length})
      </Text>

      {divisionSummaries.map(div => (
        <View key={div.name} style={[styles.divisionCard, div.alreadyGenerated && styles.divisionCardDone]}>
          <View style={styles.divisionCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.divisionCardName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                {div.name}
              </Text>
              {div.alreadyGenerated && (
                <Text style={styles.divisionCardDoneLabel}>✓ Bracket already generated</Text>
              )}
              {!div.alreadyGenerated && div.teamCount < 2 && (
                <Text style={styles.divisionCardWarning}>⚠ Need at least 2 teams</Text>
              )}
            </View>
            <View style={styles.divisionCardRight}>
              <Text style={styles.divisionCardCount}>{div.teamCount}</Text>
              <Text style={styles.divisionCardCountLabel}>teams</Text>
            </View>
          </View>
          {div.teamCount > 0 && !div.alreadyGenerated && (
            <View style={styles.divisionCardMeta}>
              <Text style={styles.divisionCardMetaText}>
                {div.bracketSize}-team bracket{div.byeCount > 0 ? ` · ${div.byeCount} bye${div.byeCount === 1 ? '' : 's'}` : ''}
              </Text>
            </View>
          )}
          {div.teams.map((t, i) => (
            <View key={t.id} style={styles.teamRow}>
              <Text style={styles.teamIndex}>{i + 1}</Text>
              <Text style={styles.teamName}>{t.teamName}</Text>
            </View>
          ))}
          {div.teamCount === 0 && (
            <Text style={styles.divisionCardEmpty}>No teams registered yet</Text>
          )}
        </View>
      ))}

      {__DEV__ && (
        <TouchableOpacity style={styles.devTestBtn} onPress={() => setShowTestTeamsModal(true)}>
          <Text style={styles.devTestBtnText}>🧪 DEV: Generate Test Teams</Text>
        </TouchableOpacity>
      )}

      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          Once you generate brackets, registration will be locked and no new teams can be added. All divisions share courts — the scheduler prevents conflicts. Teams are randomly seeded. Divisions with fewer than 2 teams will be skipped.
        </Text>
      </View>

      {generating && generateProgress && (
        <View style={styles.progressCard}>
          <ActivityIndicator size="small" color="#008080" style={{ marginRight: 10 }} />
          <Text style={styles.progressText}>{generateProgress}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.generateBtn,
          (!!constraintError || generating || !anyEligible) && styles.generateBtnDisabled,
        ]}
        onPress={handleGenerateAll}
        disabled={!!constraintError || generating || !anyEligible}
      >
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={[styles.generateBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              {allGenerated ? 'ALL BRACKETS GENERATED' : 'GENERATE ALL BRACKETS & SCHEDULES'}
            </Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>

      {/* Edit Settings Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>EDIT BRACKET SETTINGS</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.editLabel}>Tournament Start Date</Text>
              <TouchableOpacity style={styles.editInput} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: editStartDate ? '#003333' : '#a0b8b8', fontSize: 15 }}>{editStartDate || 'Select start date...'}</Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                onConfirm={(date) => {
                  setEditStartDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                  setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
              />

              <Text style={styles.editLabel}>Tournament Duration</Text>
              <View style={styles.durationRow}>
                {([1, 2, 3] as const).map(d => (
                  <TouchableOpacity key={d} style={[styles.durationOption, editDuration === d && styles.durationOptionActive]} onPress={() => setEditDuration(d)}>
                    <Text style={[styles.durationText, editDuration === d && styles.durationTextActive]}>{d} Day{d > 1 ? 's' : ''}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.editLabel}>Courts</Text>
              {editCourtNames.map((name, i) => (
                <View key={i} style={styles.courtRow}>
                  <TextInput
                    style={[styles.editInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="e.g. Main Court"
                    placeholderTextColor="#a0b8b8"
                    value={name}
                    onChangeText={v => setEditCourtNames(prev => prev.map((c, idx) => idx === i ? v : c))}
                  />
                  {editCourtNames.length > 1 && (
                    <TouchableOpacity onPress={() => setEditCourtNames(prev => prev.filter((_, idx) => idx !== i))} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addCourtBtn} onPress={() => setEditCourtNames(prev => [...prev, `Court ${prev.length + 1}`])}>
                <Text style={styles.addCourtBtnText}>+ Add Court</Text>
              </TouchableOpacity>

              <Text style={styles.editLabel}>Daily Start Time</Text>
              <TextInput style={styles.editInput} placeholder="e.g. 8:00 AM" placeholderTextColor="#a0b8b8" value={editDailyStart} onChangeText={setEditDailyStart} />

              <Text style={styles.editLabel}>Daily End Time</Text>
              <TextInput style={styles.editInput} placeholder="e.g. 8:00 PM" placeholderTextColor="#a0b8b8" value={editDailyEnd} onChangeText={setEditDailyEnd} />

              <Text style={styles.editLabel}>Game Duration (minutes)</Text>
              <TextInput style={styles.editInput} placeholder="e.g. 50" placeholderTextColor="#a0b8b8" value={editGameDuration} onChangeText={setEditGameDuration} keyboardType="numeric" />

              <Text style={styles.editLabel}>Buffer Between Games (minutes)</Text>
              <TextInput style={styles.editInput} placeholder="e.g. 10" placeholderTextColor="#a0b8b8" value={editBuffer} onChangeText={setEditBuffer} keyboardType="numeric" />

              <Text style={styles.editLabel}>Championship Format</Text>
              <TouchableOpacity style={styles.editInput} onPress={() => setShowChampPicker(!showChampPicker)}>
                <Text style={{ color: '#003333', fontSize: 15 }}>{editChampFormat === 'single' ? 'Single Championship Game' : 'Double Championship Game (bracket reset)'}</Text>
              </TouchableOpacity>
              {showChampPicker && (
                <View style={styles.champPickerBox}>
                  {(['single', 'double'] as const).map(fmt => (
                    <TouchableOpacity key={fmt} style={[styles.champPickerItem, editChampFormat === fmt && styles.champPickerItemActive]} onPress={() => { setEditChampFormat(fmt); setShowChampPicker(false); }}>
                      <Text style={[styles.champPickerText, editChampFormat === fmt && { color: '#008080', fontWeight: '700' }]}>
                        {fmt === 'single' ? 'Single Championship Game' : 'Double Championship Game (bracket reset)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveSettings} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={[styles.saveBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>SAVE SETTINGS</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dev-only: Generate Test Teams Modal */}
      {__DEV__ && (
        <Modal visible={showTestTeamsModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>🧪 GENERATE TEST TEAMS</Text>
                <TouchableOpacity onPress={() => setShowTestTeamsModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.devTestHint}>
                Adds test teams to ALL divisions ({divisionSummaries.length > 0 ? divisionSummaries.map(d => d.name).join(', ') : divisionId}). Pick how many teams per division:
              </Text>
              <View style={styles.testTeamCountGrid}>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(count => (
                  <TouchableOpacity key={count} style={styles.testTeamCountBtn} onPress={() => generateTestTeams(count)} disabled={generatingTestTeams}>
                    <Text style={styles.testTeamCountText}>{count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {generatingTestTeams && <ActivityIndicator color="#008080" style={{ marginTop: 16 }} />}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowTestTeamsModal(false)} disabled={generatingTestTeams}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function getTournamentDays(tournament: any): string[] {
  if (tournament.tournamentDays?.length > 0) return tournament.tournamentDays;
  return parseTournamentDates(tournament.date);
}

function parseTournamentDates(dateStr: string): string[] {
  if (!dateStr) return [];
  const parts = dateStr.split(' - ');
  const startStr = parts[0]?.trim();
  const endStr = parts[1]?.trim();
  if (!startStr) return [];
  const tryParse = (s: string) => { const d = new Date(s.includes('-') && s.length === 10 ? s + 'T00:00:00' : s); return isNaN(d.getTime()) ? null : d; };
  const start = tryParse(startStr);
  if (!start) return [];
  const end = endStr ? (tryParse(endStr) || start) : start;
  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end && dates.length < 3) {
    dates.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function resolveCourts(settings: any): string[] {
  if (settings.courtNames?.length > 0) return settings.courtNames.filter((c: string) => c?.trim());
  if (settings.courts && typeof settings.courts === 'number') return Array.from({ length: settings.courts }, (_, i) => `Court ${i + 1}`);
  return [];
}

function formatTimeAmPm(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12; else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

function parseAmPmToTime24(input: string): string {
  const cleaned = input.trim().toUpperCase();
  const m = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2] || '00';
    if (m[3] === 'AM') { if (h === 12) h = 0; } else { if (h !== 12) h += 12; }
    return `${String(h).padStart(2,'0')}:${min}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) return cleaned.padStart(5, '0');
  return input;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5ede0' },
  backBtn: { paddingTop: 60, paddingBottom: 8 },
  backText: { fontSize: 16, color: '#008080', fontWeight: '600' },
  title: { fontSize: 26, color: '#003333', letterSpacing: 1.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#5a7a7a', marginBottom: 20 },
  sectionTitle: { fontSize: 14, color: '#003333', letterSpacing: 1, marginTop: 24, marginBottom: 8 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e0d8c8' },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryTitle: { fontSize: 13, color: '#008080', letterSpacing: 1 },
  editSettingsBtn: { backgroundColor: '#e8f4f4', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#008080' },
  editSettingsBtnText: { fontSize: 13, color: '#008080', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0e8d8' },
  rowLabel: { fontSize: 14, color: '#5a7a7a', flex: 1 },
  rowValue: { fontSize: 14, color: '#003333', fontWeight: '600', textAlign: 'right', flex: 1 },
  explanationCard: { backgroundColor: '#e8f4f4', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#b0d8d8' },
  explanationText: { fontSize: 13, color: '#003333', lineHeight: 20 },
  errorCard: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#fca5a5' },
  errorCardText: { fontSize: 13, color: '#dc2626', lineHeight: 20 },
  errorCardHint: { fontSize: 12, color: '#dc2626', fontWeight: '600', textDecorationLine: 'underline' },
  errorText: { fontSize: 15, color: '#dc2626' },
  divisionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e0d8c8' },
  divisionCardDone: { backgroundColor: '#f0faf8', borderColor: '#a0d8d0' },
  divisionCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  divisionCardName: { fontSize: 16, color: '#003333', letterSpacing: 0.5 },
  divisionCardDoneLabel: { fontSize: 12, color: '#008080', fontWeight: '600', marginTop: 2 },
  divisionCardWarning: { fontSize: 12, color: '#B8860B', fontWeight: '600', marginTop: 2 },
  divisionCardRight: { alignItems: 'center', minWidth: 48 },
  divisionCardCount: { fontSize: 24, color: '#008080', fontWeight: '900' },
  divisionCardCountLabel: { fontSize: 11, color: '#a0b8b8', fontWeight: '600', textTransform: 'uppercase' },
  divisionCardMeta: { marginBottom: 10 },
  divisionCardMetaText: { fontSize: 12, color: '#5a7a7a' },
  divisionCardEmpty: { fontSize: 13, color: '#a0b8b8', fontStyle: 'italic', marginTop: 4 },
  teamRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f6f2', borderRadius: 8, padding: 10, marginBottom: 4 },
  teamIndex: { fontSize: 12, color: '#a0b8b8', width: 24 },
  teamName: { fontSize: 14, color: '#003333', fontWeight: '600' },
  warningCard: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, marginTop: 20, marginBottom: 14, borderWidth: 1, borderColor: '#fde68a' },
  warningText: { fontSize: 13, color: '#92400e', lineHeight: 20 },
  progressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f4f4', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#b0d8d8' },
  progressText: { fontSize: 14, color: '#003333', fontWeight: '600' },
  generateBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  generateBtnDisabled: { opacity: 0.45 },
  generateBtnText: { color: '#fff', fontSize: 17, letterSpacing: 1 },
  cancelBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  cancelBtnText: { fontSize: 15, color: '#a0b8b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#f5ede0', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, color: '#003333', letterSpacing: 1 },
  modalClose: { fontSize: 22, color: '#a0b8b8', padding: 4 },
  editLabel: { fontSize: 13, fontWeight: '600', color: '#003333', marginBottom: 6, marginTop: 12 },
  editInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#003333', borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 4 },
  courtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  removeBtn: { padding: 8 },
  removeBtnText: { fontSize: 16, color: '#cc4444' },
  addCourtBtn: { borderWidth: 1, borderColor: '#008080', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 4, backgroundColor: '#e0f5f5' },
  addCourtBtnText: { color: '#008080', fontWeight: '700', fontSize: 14 },
  champPickerBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e0d8c8', marginBottom: 8, overflow: 'hidden' },
  champPickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0e8d8' },
  champPickerItemActive: { backgroundColor: '#f5ede0' },
  champPickerText: { fontSize: 15, color: '#003333' },
  saveBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 17, letterSpacing: 1 },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  durationOption: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e0d8c8' },
  durationOptionActive: { borderColor: '#008080', backgroundColor: '#e8f4f4' },
  durationText: { fontSize: 14, color: '#5a7a7a', fontWeight: '600' },
  durationTextActive: { color: '#008080' },
  devTestBtn: { backgroundColor: '#1a1a2e', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  devTestBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  devTestHint: { fontSize: 13, color: '#5a7a7a', lineHeight: 19, marginBottom: 16 },
  testTeamCountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  testTeamCountBtn: { width: '28%', backgroundColor: '#e8f4f4', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#008080' },
  testTeamCountText: { fontSize: 18, color: '#008080', fontWeight: '700' },
});