/**
 * Bracket Generate Screen
 *
 * Shown to the organizer before generating a bracket for a specific division.
 * Displays a summary of settings and team count, requires confirmation,
 * then runs bracket + schedule generation in a single batch write.
 *
 * Route: /bracket-generate?tournamentId=...&divisionId=...
 */

import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    writeBatch,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { generateBracketFromTeams, MAX_AUTO_BRACKET_TEAMS } from '../src/bracket/bracketEngine';
import { BracketDoc, BracketPaths, GameDoc } from '../src/bracket/bracketSchema';
import { getChampionshipExplanation } from '../src/bracket/championshipFormat';
import { generateSchedule, generateSlots, SchedulerInput, validateConstraints } from '../src/bracket/schedulingEngine';

export default function BracketGenerateScreen() {
  const router = useRouter();
  const { tournamentId, divisionId } = useLocalSearchParams<{ tournamentId: string; divisionId: string }>();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<{ id: string; teamName: string; registeredBy: string }[]>([]);
  const [constraintError, setConstraintError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!tournamentId || !divisionId) return;
      try {
        const tSnap = await getDoc(doc(db, 'tournaments', tournamentId));
        if (!tSnap.exists()) return;
        setTournament({ id: tSnap.id, ...tSnap.data() });

        // Load registered teams for this division
        const teamsSnap = await getDocs(
          collection(db, 'tournaments', tournamentId, 'teams')
        );
        const divTeams = teamsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter((t: any) => !divisionId || t.division === divisionId || !divisionId);
        setTeams(divTeams);
      } catch (e) {
        console.log('Error loading bracket data:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tournamentId, divisionId]);

  // Validate constraints once we have tournament + teams
  useEffect(() => {
    if (!tournament || teams.length === 0) return;
    const settings = tournament.bracketSettings;
    if (!settings) return;

    try {
      // Parse tournament dates from the date string
      const dates = parseTournamentDates(tournament.date);
      const courts = Array.from({ length: settings.courts || 2 }, (_, i) => `Court ${i + 1}`);
      const input: SchedulerInput = {
        dates,
        courts,
        dailyStartTime: settings.dailyStartTime || '08:00',
        dailyEndTime: settings.dailyEndTime || '20:00',
        gameDurationMinutes: settings.gameDurationMinutes || 50,
        bufferMinutes: settings.bufferMinutes || 10,
      };

      // Quick bracket generation to get game count for validation
      const teamNames = teams.map(t => t.teamName);
      const tempBracket = generateBracketFromTeams(teamNames);
      const slots = generateSlots(input);
      const validation = validateConstraints(tempBracket, slots);

      if (!validation.valid) {
        setConstraintError(validation.reason);
      } else {
        setConstraintError(null);
      }
    } catch (e: any) {
      setConstraintError(e.message);
    }
  }, [tournament, teams]);

  const handleGenerate = async () => {
    if (!tournament || !tournamentId || !divisionId) return;
    const user = auth.currentUser;
    if (!user || user.uid !== tournament.postedBy) {
      Alert.alert('Error', 'Only the tournament organizer can generate the bracket.');
      return;
    }

    if (constraintError) {
      Alert.alert('Cannot Generate', constraintError);
      return;
    }

    if (teams.length < 2) {
      Alert.alert('Not Enough Teams', 'You need at least 2 registered teams to generate a bracket.');
      return;
    }

    if (teams.length > MAX_AUTO_BRACKET_TEAMS) {
      Alert.alert('Too Many Teams', `Automatic bracket generation supports a maximum of ${MAX_AUTO_BRACKET_TEAMS} teams per division. This division has ${teams.length} teams.`);
      return;
    }

    setGenerating(true);
    try {
      const settings = tournament.bracketSettings || {};
      const dates = parseTournamentDates(tournament.date);
      const courts = Array.from({ length: settings.courts || 2 }, (_, i) => `Court ${i + 1}`);

      // Step 1: Random shuffle (the ONLY randomness in the system)
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      const teamNames = shuffled.map(t => t.teamName);

      // Step 2: Generate bracket (pure deterministic logic)
      const bracket = generateBracketFromTeams(teamNames);

      // Step 3: Generate schedule (pure deterministic logic)
      const scheduleInput: SchedulerInput = {
        dates,
        courts,
        dailyStartTime: settings.dailyStartTime || '08:00',
        dailyEndTime: settings.dailyEndTime || '20:00',
        gameDurationMinutes: settings.gameDurationMinutes || 50,
        bufferMinutes: settings.bufferMinutes || 10,
      };
      const schedule = generateSchedule(bracket, scheduleInput);

      // Step 4: Write everything to Firestore in a single batch
      const batch = writeBatch(db);

      // Write bracket metadata document
      const bracketRef = doc(db, BracketPaths.bracket(tournamentId, divisionId));
      const bracketDoc: Partial<BracketDoc> = {
        divisionId,
        tournamentId,
        championshipFormat: settings.championshipFormat || 'single',
        bracketSize: bracket.bracketSize,
        teamCount: teams.length,
        status: 'generated',
        generatedAt: serverTimestamp() as any,
        completedAt: null,
        seededTeams: shuffled.map((team, i) => ({
          seed: i + 1,
          teamId: team.id,
          teamName: team.teamName,
          isBye: false,
        })),
        championTeamId: null,
        grandFinalId: 'GF-1',
        bracketResetId: settings.championshipFormat === 'double' ? 'GF-2' : null,
        bracketResetRequired: false,
        scheduleGeneratedAt: serverTimestamp() as any,
        explanation: getChampionshipExplanation(settings.championshipFormat || 'single'),
      };
      batch.set(bracketRef, bracketDoc);

      // Build a schedule lookup for quick access
      const scheduleLookup = new Map(schedule.scheduledGames.map(sg => [sg.gameId, sg]));

      // Write each game document
      for (const game of bracket.games) {
        const gameRef = doc(db, BracketPaths.game(tournamentId, divisionId, game.id));
        const scheduledGame = scheduleLookup.get(game.id);

        // Resolve seed slots to team info
        const topTeam = game.topSeed && game.topSeed > 0 ? shuffled[game.topSeed - 1] : null;
        const bottomTeam = game.bottomSeed && game.bottomSeed > 0 ? shuffled[game.bottomSeed - 1] : null;

        let gameStatus: GameDoc['status'] = 'pending';
        if (game.isBye) gameStatus = 'bye';
        else if (topTeam && bottomTeam) gameStatus = 'ready';

        const gameDoc: Partial<GameDoc> = {
          id: game.id,
          divisionId,
          tournamentId,
          bracket: game.bracket,
          round: game.round,
          position: game.position,
          topTeamId: topTeam?.id || null,
          topTeamName: topTeam?.teamName || null,
          bottomTeamId: bottomTeam?.id || null,
          bottomTeamName: bottomTeam?.teamName || null,
          isBye: game.isBye,
          fedByWinnerOf: game.fedByWinner || null,
          winnerAdvancesTo: game.winnerAdvancesTo || null,
          loserDropsTo: game.loserDropsTo || null,
          status: gameStatus,
          winnerId: null,
          winnerName: null,
          loserId: null,
          loserName: null,
          topScore: null,
          bottomScore: null,
          resultEnteredAt: null,
          resultEnteredBy: null,
          courtId: scheduledGame?.courtId || null,
          courtName: scheduledGame?.courtId || null,
          scheduledDate: scheduledGame?.date || null,
          scheduledTime: scheduledGame?.startTime || null,
          scheduledSlotIndex: scheduledGame?.slotIndex ?? null,
          createdAt: serverTimestamp() as any,
        };

        // Auto-resolve bye games immediately
        if (game.isBye) {
          const realTeam = topTeam || bottomTeam;
          if (realTeam) {
            gameDoc.winnerId = realTeam.id;
            gameDoc.winnerName = realTeam.teamName;
            gameDoc.resultEnteredBy = 'system';
            gameDoc.resultEnteredAt = serverTimestamp() as any;
          }
        }

        batch.set(gameRef, gameDoc);
      }

      // Lock registration on the tournament doc
      batch.update(doc(db, 'tournaments', tournamentId), {
        bracketStatus: 'bracket_generated',
        [`bracketGenerated_${divisionId}`]: true,
      });

      await batch.commit();

      Alert.alert(
        'Bracket Generated',
        `${teams.length} teams have been seeded into a ${bracket.bracketSize}-team bracket. Registration is now locked for this division.`,
        [{ text: 'View Bracket', onPress: () => router.back() }]
      );
    } catch (e: any) {
      console.error('Bracket generation error:', e);
      Alert.alert('Generation Failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#008080" />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Tournament not found.</Text>
      </View>
    );
  }

  const settings = tournament.bracketSettings || {};
  const dates = parseTournamentDates(tournament.date);
  const courts = settings.courts || 2;
  const gameDuration = settings.gameDurationMinutes || 50;
  const buffer = settings.bufferMinutes || 10;
  const format = settings.championshipFormat || 'single';
  const byeCount = teams.length > 0 ? nextPow2(teams.length) - teams.length : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={[styles.title, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
        GENERATE BRACKET
      </Text>
      <Text style={styles.subtitle}>{tournament.name} — {divisionId}</Text>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={[styles.summaryTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>SUMMARY</Text>
        <Row label="Registered Teams" value={`${teams.length}`} />
        <Row label="Bracket Size" value={teams.length > 0 ? `${nextPow2(teams.length)}-team` : '—'} />
        {byeCount > 0 && <Row label="Byes" value={`${byeCount} (auto-assigned to top seeds)`} />}
        <Row label="Format" value="Double Elimination" />
        <Row label="Championship" value={format === 'single' ? 'Single Game' : 'Double Game (bracket reset)'} />
        <Row label="Courts" value={`${courts}`} />
        <Row label="Daily Hours" value={`${settings.dailyStartTime || '08:00'} – ${settings.dailyEndTime || '20:00'}`} />
        <Row label="Game Duration" value={`${gameDuration} min + ${buffer} min buffer`} />
        <Row label="Tournament Dates" value={dates.join(', ')} />
      </View>

      {/* Explanation */}
      <View style={styles.explanationCard}>
        <Text style={styles.explanationText}>{getChampionshipExplanation(format)}</Text>
      </View>

      {/* Constraint error */}
      {constraintError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorCardText}>{constraintError}</Text>
          <Text style={styles.errorCardHint}>Fix the settings above before generating.</Text>
        </View>
      )}

      {/* Team list */}
      <Text style={[styles.sectionTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
        REGISTERED TEAMS ({teams.length})
      </Text>
      {teams.map((team, i) => (
        <View key={team.id} style={styles.teamRow}>
          <Text style={styles.teamIndex}>{i + 1}</Text>
          <Text style={styles.teamName}>{team.teamName}</Text>
        </View>
      ))}

      {/* Warning */}
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          Once you generate the bracket, registration will be locked and no new teams can be added to this division. Teams are randomly seeded.
        </Text>
      </View>

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateBtn, (!!constraintError || generating || teams.length < 2) && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={!!constraintError || generating || teams.length < 2}
      >
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={[styles.generateBtnText, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              GENERATE BRACKET & SCHEDULE
            </Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function parseTournamentDates(dateStr: string): string[] {
  // Tournament date field is stored as "YYYY-MM-DD - YYYY-MM-DD"
  if (!dateStr) return [];
  const parts = dateStr.split(' - ');
  if (parts.length === 1) return [parts[0].trim()];
  const start = new Date(parts[0].trim());
  const end = new Date(parts[1].trim());
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates.slice(0, 3); // max 3 days per spec
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5ede0' },
  title: { fontSize: 26, color: '#003333', letterSpacing: 1.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#5a7a7a', marginBottom: 20 },
  sectionTitle: { fontSize: 14, color: '#003333', letterSpacing: 1, marginTop: 24, marginBottom: 8 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e0d8c8' },
  summaryTitle: { fontSize: 13, color: '#008080', letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0e8d8' },
  rowLabel: { fontSize: 14, color: '#5a7a7a', flex: 1 },
  rowValue: { fontSize: 14, color: '#003333', fontWeight: '600', textAlign: 'right', flex: 1 },
  explanationCard: { backgroundColor: '#e8f4f4', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#b0d8d8' },
  explanationText: { fontSize: 13, color: '#003333', lineHeight: 20 },
  errorCard: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#fca5a5' },
  errorCardText: { fontSize: 13, color: '#dc2626', lineHeight: 20 },
  errorCardHint: { fontSize: 12, color: '#dc2626', marginTop: 6, fontWeight: '600' },
  errorText: { fontSize: 15, color: '#dc2626' },
  teamRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#e0d8c8' },
  teamIndex: { fontSize: 13, color: '#a0b8b8', width: 28 },
  teamName: { fontSize: 15, color: '#003333', fontWeight: '600' },
  warningCard: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, marginTop: 20, marginBottom: 14, borderWidth: 1, borderColor: '#fde68a' },
  warningText: { fontSize: 13, color: '#92400e', lineHeight: 20 },
  generateBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  generateBtnDisabled: { opacity: 0.45 },
  generateBtnText: { color: '#fff', fontSize: 17, letterSpacing: 1 },
  cancelBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  cancelBtnText: { fontSize: 15, color: '#a0b8b8' },
});