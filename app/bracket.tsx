import { auth, db } from '@/firebaseConfig';
import { enterResult } from '@/src/bracket/bracketProgression';
import { BracketPaths } from '@/src/bracket/bracketSchema';
import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type GameDoc = {
  id: string;
  bracket: 'winners' | 'losers' | 'final';
  round: number;
  position: number;
  topTeamId: string | null;
  topTeamName: string | null;
  bottomTeamId: string | null;
  bottomTeamName: string | null;
  isBye: boolean;
  status: 'pending' | 'ready' | 'bye' | 'completed';
  winnerId: string | null;
  winnerName: string | null;
  loserId: string | null;
  topScore: number | null;
  bottomScore: number | null;
  courtName: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
};

type BracketMeta = {
  status: string;
  championTeamId: string | null;
  championshipFormat: 'single' | 'double';
  bracketResetRequired: boolean;
  teamCount: number;
  bracketSize: number;
};

export default function BracketScreen() {
  const router = useRouter();
  const { tournamentId, divisionId, postedBy } = useLocalSearchParams<{
    tournamentId: string;
    divisionId: string;
    postedBy: string;
  }>();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  const user = auth.currentUser;
  const isOwner = user?.uid === postedBy;

  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameDoc[]>([]);
  const [bracketMeta, setBracketMeta] = useState<BracketMeta | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameDoc | null>(null);
  const [topScore, setTopScore] = useState('');
  const [bottomScore, setBottomScore] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tournamentId || !divisionId) return;
    const bracketRef = doc(db, BracketPaths.bracket(tournamentId, divisionId));
    const unsubBracket = onSnapshot(bracketRef, (snap) => {
      if (snap.exists()) setBracketMeta(snap.data() as BracketMeta);
    }, (e) => console.log('Bracket meta listener error:', e));
    const gamesRef = collection(db, BracketPaths.games(tournamentId, divisionId));
    const unsubGames = onSnapshot(gamesRef, (snap) => {
      setGames(snap.docs.map(d => d.data() as GameDoc));
      setLoading(false);
    }, (e) => { console.log('Games listener error:', e); setLoading(false); });
    return () => { unsubBracket(); unsubGames(); };
  }, [tournamentId, divisionId]);

  const anyGamesPlayed = games.some(g => g.status === 'completed' && !g.isBye);
  const canRegenerate = isOwner && !anyGamesPlayed && bracketMeta?.status !== 'completed';

  const handleRegenerateBracket = () => {
    if (!canRegenerate) {
      Alert.alert('Cannot Regenerate', 'The bracket cannot be regenerated once games have been played.');
      return;
    }
    Alert.alert(
      'Regenerate Bracket?',
      'This will delete the current bracket and schedule, then regenerate with a new random seeding. No games have been played yet, so no results will be lost.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate', style: 'destructive',
          onPress: async () => {
            setRegenerating(true);
            try {
              const gamesSnap = await getDocs(collection(db, BracketPaths.games(tournamentId!, divisionId!)));
              const batch = writeBatch(db);
              gamesSnap.docs.forEach(d => batch.delete(d.ref));
              batch.delete(doc(db, BracketPaths.bracket(tournamentId!, divisionId!)));
              batch.update(doc(db, 'tournaments', tournamentId!), { bracketStatus: 'registration_open' });
              await batch.commit();
              Alert.alert('Bracket Cleared', 'Tap "Generate Bracket" on the tournament page to generate a new one.',
                [{ text: 'OK', onPress: () => router.back() }]);
            } catch (e: any) {
              Alert.alert('Error', 'Failed to clear the bracket. Please try again.');
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  const handleGamePress = (game: GameDoc) => {
    if (!isOwner) return;
    if (game.status !== 'ready' && game.status !== 'completed') return;
    if (game.isBye) return;
    setSelectedGame(game);
    setTopScore(game.topScore?.toString() || '');
    setBottomScore(game.bottomScore?.toString() || '');
  };

  const handleEnterResult = async (winnerId: string, winnerName: string, loserId: string, loserName: string) => {
    if (!selectedGame || !tournamentId || !divisionId || !user) return;
    setSubmitting(true);
    try {
      await enterResult({
        tournamentId, divisionId,
        gameId: selectedGame.id,
        winnerId, winnerName, loserId, loserName,
        topScore: topScore ? parseInt(topScore) : null,
        bottomScore: bottomScore ? parseInt(bottomScore) : null,
        enteredByUid: user.uid,
      });
      setSelectedGame(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save result. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#008080" /></View>;

  const winnersGames = games.filter(g => g.bracket === 'winners' && !g.isBye).sort((a, b) => a.round !== b.round ? a.round - b.round : a.position - b.position);
  const losersGames = games.filter(g => g.bracket === 'losers').sort((a, b) => a.round !== b.round ? a.round - b.round : a.position - b.position);
  const finalGames = games.filter(g => g.bracket === 'final').sort((a, b) => a.round - b.round);
  const byeGames = games.filter(g => g.isBye);
  const winnersRounds = [...new Set(winnersGames.map(g => g.round))].sort((a, b) => a - b);
  const losersRounds = [...new Set(losersGames.map(g => g.round))].sort((a, b) => a - b);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>BRACKET</Text>
        {isOwner && <Text style={styles.organizerBadge}>Organizer</Text>}
      </View>

      {bracketMeta?.championTeamId && (
        <View style={styles.championBanner}>
          <Text style={[styles.championLabel, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>🏆 CHAMPION</Text>
          <Text style={styles.championName}>{games.find(g => g.winnerId === bracketMeta.championTeamId)?.winnerName || ''}</Text>
        </View>
      )}

      {isOwner && !bracketMeta?.championTeamId && (
        <View style={styles.organizerHint}>
          <Text style={styles.organizerHintText}>Tap any ready game to enter the result.</Text>
          {canRegenerate && (
            <TouchableOpacity onPress={handleRegenerateBracket} disabled={regenerating}>
              <Text style={styles.regenerateLink}>{regenerating ? 'Clearing...' : 'Remove team & regenerate bracket'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {byeGames.length > 0 && (
          <Section title="BYES (AUTO-ADVANCED)" fontsLoaded={fontsLoaded}>
            {byeGames.map(game => <GameCard key={game.id} game={game} isOwner={isOwner} onPress={() => {}} fontsLoaded={fontsLoaded} />)}
          </Section>
        )}
        {winnersRounds.map(round => (
          <Section key={`w-${round}`} title={round === Math.max(...winnersRounds) ? 'WINNERS FINAL' : `WINNERS BRACKET — ROUND ${round}`} fontsLoaded={fontsLoaded}>
            {winnersGames.filter(g => g.round === round).map(game => <GameCard key={game.id} game={game} isOwner={isOwner} onPress={() => handleGamePress(game)} fontsLoaded={fontsLoaded} />)}
          </Section>
        ))}
        {losersRounds.map(round => (
          <Section key={`l-${round}`} title={round === Math.max(...losersRounds) ? 'LOSERS FINAL' : `LOSERS BRACKET — ROUND ${round}`} fontsLoaded={fontsLoaded}>
            {losersGames.filter(g => g.round === round).map(game => <GameCard key={game.id} game={game} isOwner={isOwner} onPress={() => handleGamePress(game)} fontsLoaded={fontsLoaded} />)}
          </Section>
        ))}
        {finalGames.length > 0 && (
          <Section title="CHAMPIONSHIP" fontsLoaded={fontsLoaded}>
            {finalGames.map(game => <GameCard key={game.id} game={game} isOwner={isOwner} onPress={() => handleGamePress(game)} fontsLoaded={fontsLoaded} />)}
          </Section>
        )}
        {bracketMeta?.championshipFormat === 'double' && !bracketMeta?.championTeamId && (
          <Text style={styles.formatNote}>Double Championship: if the losers-bracket team wins the first championship game, a second game will be played.</Text>
        )}
      </ScrollView>

      <Modal visible={!!selectedGame} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>ENTER RESULT</Text>
            <Text style={styles.modalGameId}>{selectedGame?.id}</Text>
            {selectedGame && (
              <>
                <Text style={styles.modalTeamLabel}>Who won?</Text>
                <TouchableOpacity style={styles.winnerBtn}
                  onPress={() => { if (!selectedGame.topTeamId || !selectedGame.topTeamName || !selectedGame.bottomTeamId || !selectedGame.bottomTeamName) return; handleEnterResult(selectedGame.topTeamId, selectedGame.topTeamName, selectedGame.bottomTeamId, selectedGame.bottomTeamName); }}
                  disabled={submitting || !selectedGame.topTeamId}>
                  <Text style={styles.winnerBtnText}>{selectedGame.topTeamName || 'TBD'}</Text>
                </TouchableOpacity>
                <Text style={styles.vsText}>vs</Text>
                <TouchableOpacity style={styles.winnerBtn}
                  onPress={() => { if (!selectedGame.bottomTeamId || !selectedGame.bottomTeamName || !selectedGame.topTeamId || !selectedGame.topTeamName) return; handleEnterResult(selectedGame.bottomTeamId, selectedGame.bottomTeamName, selectedGame.topTeamId, selectedGame.topTeamName); }}
                  disabled={submitting || !selectedGame.bottomTeamId}>
                  <Text style={styles.winnerBtnText}>{selectedGame.bottomTeamName || 'TBD'}</Text>
                </TouchableOpacity>
                {submitting && <ActivityIndicator color="#008080" style={{ marginTop: 12 }} />}
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelectedGame(null)} disabled={submitting}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, children, fontsLoaded }: { title: string; children: React.ReactNode; fontsLoaded: boolean }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.title, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>{title}</Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 13, color: '#008080', letterSpacing: 1, marginBottom: 8 },
});

function GameCard({ game, isOwner, onPress, fontsLoaded }: { game: GameDoc; isOwner: boolean; onPress: () => void; fontsLoaded: boolean }) {
  const isCompleted = game.status === 'completed';
  const isReady = game.status === 'ready';
  const isPending = game.status === 'pending';
  const isBye = game.isBye;
  const canTap = isOwner && (isReady || isCompleted) && !isBye;
  return (
    <TouchableOpacity style={[cardStyles.card, isCompleted && cardStyles.completed, isReady && isOwner && cardStyles.ready, isPending && cardStyles.pending]}
      onPress={onPress} activeOpacity={canTap ? 0.75 : 1} disabled={!canTap}>
      <Text style={cardStyles.gameId}>{game.id}</Text>
      {game.scheduledDate && <Text style={cardStyles.schedule}>{game.courtName} · {game.scheduledDate} {game.scheduledTime}</Text>}
      <TeamRow teamName={game.topTeamName} score={game.topScore} isWinner={isCompleted && game.winnerId === game.topTeamId} fontsLoaded={fontsLoaded} />
      <TeamRow teamName={game.bottomTeamName} score={game.bottomScore} isWinner={isCompleted && game.winnerId === game.bottomTeamId} fontsLoaded={fontsLoaded} />
      <View style={cardStyles.statusRow}>
        {isBye && <Text style={cardStyles.badgeBye}>BYE</Text>}
        {isPending && !isBye && <Text style={cardStyles.badgePending}>WAITING</Text>}
        {isReady && !isBye && <Text style={cardStyles.badgeReady}>{isOwner ? 'TAP TO ENTER RESULT' : 'IN PROGRESS'}</Text>}
        {isCompleted && <Text style={cardStyles.badgeCompleted}>FINAL</Text>}
      </View>
    </TouchableOpacity>
  );
}

function TeamRow({ teamName, score, isWinner, fontsLoaded }: { teamName: string | null; score: number | null; isWinner: boolean; fontsLoaded: boolean }) {
  return (
    <View style={cardStyles.teamRow}>
      <Text style={[cardStyles.teamName, fontsLoaded && isWinner && { fontFamily: 'Rajdhani_700Bold' }, isWinner && cardStyles.teamNameWinner, !teamName && cardStyles.teamNameTBD]} numberOfLines={1}>
        {teamName || 'TBD'}
      </Text>
      {score !== null && <Text style={[cardStyles.score, isWinner && cardStyles.scoreWinner]}>{score}</Text>}
      {isWinner && <Text style={cardStyles.winnerIcon}>✓</Text>}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e0d8c8' },
  completed: { borderColor: '#008080', borderWidth: 1.5 },
  ready: { borderColor: '#B8860B', borderWidth: 1.5 },
  pending: { opacity: 0.6 },
  gameId: { fontSize: 11, color: '#a0b8b8', marginBottom: 4 },
  schedule: { fontSize: 12, color: '#5a7a7a', marginBottom: 8 },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  teamName: { flex: 1, fontSize: 15, color: '#003333' },
  teamNameWinner: { color: '#008080' },
  teamNameTBD: { color: '#a0b8b8', fontStyle: 'italic' },
  score: { fontSize: 16, color: '#5a7a7a', marginRight: 6, minWidth: 24, textAlign: 'right' },
  scoreWinner: { color: '#008080', fontWeight: '700' },
  winnerIcon: { color: '#008080', fontSize: 14 },
  statusRow: { flexDirection: 'row', marginTop: 8 },
  badgeBye: { fontSize: 10, color: '#a0b8b8', backgroundColor: '#f0e8d8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgePending: { fontSize: 10, color: '#a0b8b8', backgroundColor: '#f0e8d8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeReady: { fontSize: 10, color: '#B8860B', backgroundColor: '#fffbeb', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeCompleted: { fontSize: 10, color: '#008080', backgroundColor: '#e8f4f4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5ede0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: '#003333' },
  backBtn: { padding: 4 },
  backText: { color: '#a0c8c8', fontSize: 15 },
  headerTitle: { fontSize: 20, color: '#fff', letterSpacing: 1.5 },
  organizerBadge: { fontSize: 11, color: '#B8860B', backgroundColor: '#fffbeb', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  championBanner: { backgroundColor: '#008080', padding: 16, alignItems: 'center' },
  championLabel: { fontSize: 13, color: '#a0f0e0', letterSpacing: 2 },
  championName: { fontSize: 22, color: '#fff', marginTop: 2 },
  organizerHint: { backgroundColor: '#fffbeb', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  organizerHintText: { fontSize: 13, color: '#92400e' },
  regenerateLink: { fontSize: 12, color: '#7A1E1E', marginTop: 6, textDecorationLine: 'underline' },
  scroll: { flex: 1 },
  formatNote: { fontSize: 12, color: '#a0b8b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#f5ede0', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, color: '#003333', letterSpacing: 1, marginBottom: 4 },
  modalGameId: { fontSize: 12, color: '#a0b8b8', marginBottom: 16 },
  modalTeamLabel: { fontSize: 14, color: '#5a7a7a', marginBottom: 12 },
  winnerBtn: { backgroundColor: '#008080', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  winnerBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  vsText: { textAlign: 'center', color: '#a0b8b8', fontSize: 13, marginVertical: 4 },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  modalCancelText: { color: '#a0b8b8', fontSize: 15 },
});