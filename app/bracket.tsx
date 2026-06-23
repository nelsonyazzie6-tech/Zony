import { auth, db } from '@/firebaseConfig';
import { enterResult } from '@/src/bracket/bracketProgression';
import { BracketPaths } from '@/src/bracket/bracketSchema';
import { Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection, doc, getDoc, getDocs, onSnapshot, writeBatch,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

function TrophyIcon({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8" />
      <Path d="M12 17v4" />
      <Path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <Path d="M17 5h3a2 2 0 0 1-2 4h-1" />
      <Path d="M7 5H4a2 2 0 0 0 2 4h1" />
    </Svg>
  );
}

function MedalIcon({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
      <Path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
    </Svg>
  );
}

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
  loserName: string | null;
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

type BracketView = 'winners' | 'losers';

function formatTime(raw: string | null): string | null {
  if (!raw) return null;
  const [hStr, mStr] = raw.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr ?? '0', 10);
  if (isNaN(h) || isNaN(m)) return raw;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  const minute = String(m).padStart(2, '0');
  return `${hour}:${minute} ${period}`;
}

function formatDate(raw: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split('-');
  if (parts.length !== 3) return raw;
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return raw;
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
  return `${dayName} - ${month}/${day}`;
}

function Section({
  title, color = '#008080', fontsLoaded, children,
}: {
  title: string; color?: string; fontsLoaded: boolean; children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.container}>
      <View style={[sectionStyles.bar, { backgroundColor: color }]} />
      <Text style={[sectionStyles.title, { color }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  bar: { height: 3, width: 32, borderRadius: 2, marginBottom: 8 },
  title: { fontSize: 12, letterSpacing: 1.2, marginBottom: 10, fontWeight: '700' },
});

function GameCard({
  game, accentColor, isOwner, onPress, fontsLoaded,
}: {
  game: GameDoc; accentColor: string; isOwner: boolean; onPress: () => void; fontsLoaded: boolean;
}) {
  const isCompleted = game.status === 'completed';
  const isReady = game.status === 'ready';
  const isPending = game.status === 'pending';
  const canTap = isOwner && (isReady || isCompleted) && !game.isBye;

  const topIsWinner = isCompleted && game.winnerId === game.topTeamId;
  const bottomIsWinner = isCompleted && game.winnerId === game.bottomTeamId;

  const borderColor = game.isBye ? '#d3d1c7'
    : isCompleted ? accentColor
    : isReady ? '#B8860B'
    : '#e0d8c8';

  const scheduleText = [
    game.courtName,
    formatDate(game.scheduledDate),
    formatTime(game.scheduledTime),
  ].filter(Boolean).join(' · ');

  if (game.isBye) {
    return (
      <View style={[cardStyles.card, { borderColor: '#d3d1c7', borderStyle: 'dashed' }]}>
        <Text style={cardStyles.gameId}>{game.id}</Text>
        <View style={cardStyles.teamRow}>
          <Text style={cardStyles.teamName} numberOfLines={1}>
            {game.topTeamId ? game.topTeamName : game.bottomTeamName}
          </Text>
        </View>
        <View style={cardStyles.statusRow}>
          <Text style={cardStyles.badgeBye}>BYE — AUTO ADVANCED</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        { borderColor, borderWidth: isReady ? 2 : 1.5 },
        isPending && cardStyles.pending,
      ]}
      onPress={canTap ? onPress : undefined}
      activeOpacity={canTap ? 0.75 : 1}
    >
      <Text style={cardStyles.gameId}>{game.id}</Text>
      {scheduleText ? (
        <Text style={cardStyles.schedule} numberOfLines={1}>{scheduleText}</Text>
      ) : null}

      <View style={cardStyles.teamRow}>
        {topIsWinner && <View style={[cardStyles.winDot, { backgroundColor: accentColor }]} />}
        <Text style={[
          cardStyles.teamName,
          topIsWinner && { color: accentColor },
          fontsLoaded && topIsWinner && { fontFamily: 'Rajdhani_700Bold' },
          !game.topTeamName && cardStyles.tbd,
        ]} numberOfLines={1}>
          {game.topTeamName || 'TBD'}
        </Text>
        {game.topScore !== null && (
          <Text style={[cardStyles.score, topIsWinner && { color: accentColor }]}>{game.topScore}</Text>
        )}
      </View>

      <View style={cardStyles.divider} />

      <View style={cardStyles.teamRow}>
        {bottomIsWinner && <View style={[cardStyles.winDot, { backgroundColor: accentColor }]} />}
        <Text style={[
          cardStyles.teamName,
          bottomIsWinner && { color: accentColor },
          fontsLoaded && bottomIsWinner && { fontFamily: 'Rajdhani_700Bold' },
          !game.bottomTeamName && cardStyles.tbd,
        ]} numberOfLines={1}>
          {game.bottomTeamName || 'TBD'}
        </Text>
        {game.bottomScore !== null && (
          <Text style={[cardStyles.score, bottomIsWinner && { color: accentColor }]}>{game.bottomScore}</Text>
        )}
      </View>

      <View style={cardStyles.statusRow}>
        {isPending && <Text style={cardStyles.badgePending}>WAITING ON PREVIOUS RESULTS</Text>}
        {isReady && (
          <Text style={[cardStyles.badgeReady, { color: '#B8860B' }]}>
            {isOwner ? 'TAP TO ENTER RESULT' : 'IN PROGRESS'}
          </Text>
        )}
        {isCompleted && (
          <Text style={[cardStyles.badgeCompleted, { color: accentColor }]}>FINAL</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e0d8c8' },
  pending: { opacity: 0.6 },
  gameId: { fontSize: 10, color: '#c0b8a8', marginBottom: 4 },
  schedule: { fontSize: 12, color: '#5a7a7a', marginBottom: 10 },
  teamRow: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  winDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  teamName: { flex: 1, fontSize: 15, color: '#003333' },
  tbd: { color: '#a0b8b8', fontStyle: 'italic' },
  score: { fontSize: 16, color: '#5a7a7a', minWidth: 28, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#f0ebe3', marginVertical: 8 },
  statusRow: { flexDirection: 'row', marginTop: 10 },
  badgeBye: { fontSize: 10, color: '#a0b8b8', backgroundColor: '#f0e8d8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgePending: { fontSize: 10, color: '#a0b8b8', backgroundColor: '#f0e8d8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeReady: { fontSize: 10, backgroundColor: '#fffbeb', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeCompleted: { fontSize: 10, backgroundColor: '#e8f4f4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});

export default function BracketScreen() {
  const router = useRouter();
  const {
    tournamentId, divisionId: initialDivisionId, postedBy,
    divisions: divisionsParam, tournamentName,
  } = useLocalSearchParams<{
    tournamentId: string; divisionId: string; postedBy: string;
    divisions: string; tournamentName: string;
  }>();
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold });

  const user = auth.currentUser;
  const [tournamentPostedBy, setTournamentPostedBy] = useState<string | null>(null);
  const [tournamentSport, setTournamentSport] = useState<string>('Basketball');
  const isOwner = user?.uid === (tournamentPostedBy || postedBy);

  useEffect(() => {
    if (!tournamentId) return;
    getDoc(doc(db, 'tournaments', tournamentId))
      .then(snap => {
        if (snap.exists()) {
          setTournamentPostedBy(snap.data().postedBy || null);
          setTournamentSport(snap.data().sport || 'Basketball');
        }
      })
      .catch(() => {});
  }, [tournamentId]);

  const sportColor = tournamentSport === 'Volleyball' ? '#7A1818'
    : tournamentSport === 'Softball' ? '#B8860B'
    : '#008080';

  const divisionsList = divisionsParam
    ? divisionsParam.split(',').map(d => d.trim()).filter(Boolean)
    : initialDivisionId ? [initialDivisionId] : [];
  const [activeDivision, setActiveDivision] = useState(initialDivisionId || divisionsList[0] || '');

  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameDoc[]>([]);
  const [bracketMeta, setBracketMeta] = useState<BracketMeta | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<BracketView>('winners');

  useEffect(() => {
    if (!tournamentId || !activeDivision) return;
    setLoading(true);
    setGames([]);
    setBracketMeta(null);
    setView('winners');

    const bracketRef = doc(db, BracketPaths.bracket(tournamentId, activeDivision));
    const unsubBracket = onSnapshot(bracketRef, snap => {
      if (snap.exists()) setBracketMeta(snap.data() as BracketMeta);
    }, () => {});

    const gamesRef = collection(db, BracketPaths.games(tournamentId, activeDivision));
    const unsubGames = onSnapshot(gamesRef, snap => {
      setGames(snap.docs.map(d => d.data() as GameDoc));
      setLoading(false);
    }, () => { setLoading(false); });

    return () => { unsubBracket(); unsubGames(); };
  }, [tournamentId, activeDivision]);

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
              const gamesSnap = await getDocs(collection(db, BracketPaths.games(tournamentId!, activeDivision)));
              const batch = writeBatch(db);
              gamesSnap.docs.forEach(d => batch.delete(d.ref));
              batch.delete(doc(db, BracketPaths.bracket(tournamentId!, activeDivision)));
              batch.update(doc(db, 'tournaments', tournamentId!), { bracketStatus: 'registration_open' });
              await batch.commit();
              Alert.alert('Bracket Cleared', 'Tap "Generate Bracket" on the tournament page to generate a new one.',
                [{ text: 'OK', onPress: () => router.back() }]);
            } catch (_) {
              Alert.alert('Error', 'Failed to clear the bracket. Please try again.');
            } finally { setRegenerating(false); }
          },
        },
      ],
    );
  };

  const handleGamePress = (game: GameDoc) => {
    if (!isOwner) return;
    if (game.status !== 'ready' && game.status !== 'completed') return;
    if (game.isBye) return;
    setSelectedGame(game);
  };

  const handleEnterResult = async (
    winnerId: string, winnerName: string,
    loserId: string, loserName: string,
  ) => {
    if (!selectedGame || !tournamentId || !activeDivision || !user) return;
    setSubmitting(true);
    try {
      await enterResult({
        tournamentId, divisionId: activeDivision,
        gameId: selectedGame.id,
        winnerId, winnerName, loserId, loserName,
        topScore: null, bottomScore: null,
        enteredByUid: user.uid,
      });
      setSelectedGame(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save result. Try again.');
    } finally { setSubmitting(false); }
  };

  const byeGames = games.filter(g => g.isBye);
  const winnersGames = games
    .filter(g => g.bracket === 'winners' && !g.isBye)
    .sort((a, b) => a.round !== b.round ? a.round - b.round : a.position - b.position);
  const losersGames = games
    .filter(g => g.bracket === 'losers')
    .sort((a, b) => a.round !== b.round ? a.round - b.round : a.position - b.position);
  const finalGames = games
    .filter(g => g.bracket === 'final')
    .sort((a, b) => a.round - b.round);

  const winnersRounds = [...new Set(winnersGames.map(g => g.round))].sort((a, b) => a - b);
  const losersRounds = [...new Set(losersGames.map(g => g.round))].sort((a, b) => a - b);
  const hasLosers = losersRounds.length > 0;

  const visibleFinalGames = bracketMeta?.championshipFormat === 'double'
    ? finalGames
    : finalGames.slice(0, 1);

  const championGame = finalGames.find(g => g.status === 'completed');
  const championName = championGame?.winnerName || null;
  const runnerUpName = championGame?.loserName || null;
  const losersFinalGame = losersGames
    .filter(g => g.status === 'completed')
    .sort((a, b) => b.round - a.round)[0];
  const thirdPlaceName = losersFinalGame?.loserName || null;
  const showPlacements = !!bracketMeta?.championTeamId && !!championName;

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
            BRACKET
          </Text>
          {tournamentName
            ? <Text style={styles.headerSub} numberOfLines={1}>{tournamentName}</Text>
            : null}
        </View>
        <View style={styles.organizerBadgeWrap}>
          {isOwner && (
            <Text style={styles.organizerBadge}>Organizer</Text>
          )}
        </View>
      </View>

      {divisionsList.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.divisionTabsScroll}
          contentContainerStyle={styles.divisionTabsContent}
        >
          {divisionsList.map(div => (
            <TouchableOpacity
              key={div}
              style={[styles.divisionTab, activeDivision === div && styles.divisionTabActive]}
              onPress={() => setActiveDivision(div)}
            >
              <Text style={[styles.divisionTabText, activeDivision === div && styles.divisionTabTextActive]}>
                {div}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {showPlacements && (
        <View style={[styles.placementsBanner, { backgroundColor: sportColor }]}>
          <View style={styles.placementsRow}>
            <View style={[styles.placementBubble, styles.placementFirst]}>
              <TrophyIcon size={22} color="#B8860B" />
              <Text style={[styles.placementRank, { color: '#B8860B' }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                1ST PLACE
              </Text>
              <Text style={[styles.placementName, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]} numberOfLines={2}>
                {championName!.toUpperCase()}
              </Text>
            </View>
          </View>
          {(runnerUpName || thirdPlaceName) && (
            <View style={styles.placementsSubRow}>
              {runnerUpName && (
                <View style={[styles.placementBubble, styles.placementSecond]}>
                  <MedalIcon size={16} color="#a0a0a0" />
                  <Text style={[styles.placementRankSmall, { color: '#888' }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                    2ND PLACE
                  </Text>
                  <Text style={[styles.placementNameSmall, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]} numberOfLines={2}>
                    {runnerUpName.toUpperCase()}
                  </Text>
                </View>
              )}
              {thirdPlaceName && (
                <View style={[styles.placementBubble, styles.placementThird]}>
                  <MedalIcon size={16} color="#c87941" />
                  <Text style={[styles.placementRankSmall, { color: '#c87941' }, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
                    3RD PLACE
                  </Text>
                  <Text style={[styles.placementNameSmall, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]} numberOfLines={2}>
                    {thirdPlaceName.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {isOwner && !bracketMeta?.championTeamId && canRegenerate && (
        <View style={styles.organizerHint}>
          <TouchableOpacity onPress={handleRegenerateBracket} disabled={regenerating}>
            <Text style={styles.regenerateLink}>
              {regenerating ? 'Clearing...' : 'Remove team & regenerate bracket'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && hasLosers && (
        <View style={styles.viewToggleRow}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, view === 'winners' && styles.viewToggleBtnActiveW]}
            onPress={() => setView('winners')}
          >
            <Text style={[styles.viewToggleText, view === 'winners' && styles.viewToggleTextActive]}>
              WINNERS BRACKET
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, view === 'losers' && styles.viewToggleBtnActiveL]}
            onPress={() => setView('losers')}
          >
            <Text style={[styles.viewToggleText, view === 'losers' && styles.viewToggleTextActive]}>
              LOSERS BRACKET
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#008080" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {view === 'winners' && (
            <>
              {byeGames.length > 0 && (
                <Section title="BYES (AUTO-ADVANCED)" fontsLoaded={fontsLoaded}>
                  {byeGames.map(game => (
                    <GameCard key={game.id} game={game} accentColor={sportColor} isOwner={isOwner} onPress={() => {}} fontsLoaded={fontsLoaded} />
                  ))}
                </Section>
              )}
              {winnersRounds.map(round => (
                <Section
                  key={`w-${round}`}
                  title={round === Math.max(...winnersRounds) ? 'WINNERS FINAL' : `WINNERS BRACKET — ROUND ${round}`}
                  color={sportColor}
                  fontsLoaded={fontsLoaded}
                >
                  {winnersGames.filter(g => g.round === round).map(game => (
                    <GameCard key={game.id} game={game} accentColor={sportColor} isOwner={isOwner} onPress={() => handleGamePress(game)} fontsLoaded={fontsLoaded} />
                  ))}
                </Section>
              ))}
              {visibleFinalGames.length > 0 && (
                <Section title="CHAMPIONSHIP" color="#B8860B" fontsLoaded={fontsLoaded}>
                  {visibleFinalGames.map(game => (
                    <GameCard key={game.id} game={game} accentColor="#B8860B" isOwner={isOwner} onPress={() => handleGamePress(game)} fontsLoaded={fontsLoaded} />
                  ))}
                </Section>
              )}
            </>
          )}

          {view === 'losers' && (
            <>
              {losersRounds.map(round => (
                <Section
                  key={`l-${round}`}
                  title={round === Math.max(...losersRounds) ? 'LOSERS FINAL' : `LOSERS BRACKET — ROUND ${round}`}
                  color="#7A1818"
                  fontsLoaded={fontsLoaded}
                >
                  {losersGames.filter(g => g.round === round).map(game => (
                    <GameCard key={game.id} game={game} accentColor="#7A1818" isOwner={isOwner} onPress={() => handleGamePress(game)} fontsLoaded={fontsLoaded} />
                  ))}
                </Section>
              ))}
              {visibleFinalGames.length > 0 && (
                <Section title="CHAMPIONSHIP" color="#B8860B" fontsLoaded={fontsLoaded}>
                  {visibleFinalGames.map(game => (
                    <GameCard key={game.id} game={game} accentColor="#B8860B" isOwner={isOwner} onPress={() => handleGamePress(game)} fontsLoaded={fontsLoaded} />
                  ))}
                </Section>
              )}
            </>
          )}

          {!hasLosers && (
            <>
              {byeGames.length > 0 && (
                <Section title="BYES (AUTO-ADVANCED)" fontsLoaded={fontsLoaded}>
                  {byeGames.map(game => (
                    <GameCard key={game.id} game={game} accentColor={sportColor} isOwner={isOwner} onPress={() => {}} fontsLoaded={fontsLoaded} />
                  ))}
                </Section>
              )}
              {winnersRounds.map(round => (
                <Section
                  key={`w-${round}`}
                  title={round === Math.max(...winnersRounds) ? 'FINAL' : `ROUND ${round}`}
                  color={sportColor}
                  fontsLoaded={fontsLoaded}
                >
                  {winnersGames.filter(g => g.round === round).map(game => (
                    <GameCard key={game.id} game={game} accentColor={sportColor} isOwner={isOwner} onPress={() => handleGamePress(game)} fontsLoaded={fontsLoaded} />
                  ))}
                </Section>
              ))}
              {visibleFinalGames.length > 0 && (
                <Section title="CHAMPIONSHIP" color="#B8860B" fontsLoaded={fontsLoaded}>
                  {visibleFinalGames.map(game => (
                    <GameCard key={game.id} game={game} accentColor="#B8860B" isOwner={isOwner} onPress={() => handleGamePress(game)} fontsLoaded={fontsLoaded} />
                  ))}
                </Section>
              )}
            </>
          )}

          {bracketMeta?.championshipFormat === 'double' && !bracketMeta?.championTeamId && (
            <Text style={styles.formatNote}>
              Double Championship: if the losers-bracket team wins the first championship game, a second game will be played.
            </Text>
          )}

          {games.length === 0 && (
            <Text style={styles.formatNote}>No bracket found for this division.</Text>
          )}
        </ScrollView>
      )}

      <Modal visible={!!selectedGame} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, fontsLoaded && { fontFamily: 'Rajdhani_700Bold' }]}>
              SELECT WINNER
            </Text>
            <Text style={styles.modalGameId}>{selectedGame?.id} · {activeDivision}</Text>
            {selectedGame && (
              <>
                <Text style={styles.modalTeamLabel}>Who won this game?</Text>
                <TouchableOpacity
                  style={styles.winnerBtn}
                  onPress={() => {
                    if (!selectedGame.topTeamId || !selectedGame.topTeamName || !selectedGame.bottomTeamId || !selectedGame.bottomTeamName) return;
                    handleEnterResult(selectedGame.topTeamId, selectedGame.topTeamName, selectedGame.bottomTeamId, selectedGame.bottomTeamName);
                  }}
                  disabled={submitting || !selectedGame.topTeamId}
                >
                  <Text style={styles.winnerBtnText}>{selectedGame.topTeamName || 'TBD'}</Text>
                  <Text style={styles.winnerBtnSub}>Tap to select as winner</Text>
                </TouchableOpacity>
                <Text style={styles.vsText}>vs</Text>
                <TouchableOpacity
                  style={styles.winnerBtn}
                  onPress={() => {
                    if (!selectedGame.bottomTeamId || !selectedGame.bottomTeamName || !selectedGame.topTeamId || !selectedGame.topTeamName) return;
                    handleEnterResult(selectedGame.bottomTeamId, selectedGame.bottomTeamName, selectedGame.topTeamId, selectedGame.topTeamName);
                  }}
                  disabled={submitting || !selectedGame.bottomTeamId}
                >
                  <Text style={styles.winnerBtnText}>{selectedGame.bottomTeamName || 'TBD'}</Text>
                  <Text style={styles.winnerBtnSub}>Tap to select as winner</Text>
                </TouchableOpacity>
                {submitting && <ActivityIndicator color="#008080" style={{ marginTop: 12 }} />}
                <Text style={styles.modalNote}>
                  The winner advances automatically. The loser is moved to the losers bracket.
                </Text>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setSelectedGame(null)}
                  disabled={submitting}
                >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5ede0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#f5ede0',
    borderBottomWidth: 1, borderBottomColor: '#e0d8c8',
  },
  backBtn: { width: 80, padding: 4 },
  backText: { color: '#008080', fontSize: 16, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, color: '#003333', letterSpacing: 1.5 },
  headerSub: { fontSize: 12, color: '#5a7a7a', marginTop: 2 },
  organizerBadgeWrap: { width: 80, alignItems: 'flex-end', justifyContent: 'center' },
  organizerBadge: {
    fontSize: 11, color: '#B8860B', backgroundColor: '#fffbeb',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden',
    textAlign: 'center', borderWidth: 1, borderColor: '#fde68a',
  },
  divisionTabsScroll: { backgroundColor: '#f5ede0', maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#e0d8c8' },
  divisionTabsContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, flexDirection: 'row' },
  divisionTab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#e0d8c8',
    alignItems: 'center', justifyContent: 'center',
  },
  divisionTabActive: { backgroundColor: '#008080' },
  divisionTabText: { fontSize: 13, color: '#5a7a7a', textAlign: 'center', fontWeight: '600' },
  divisionTabTextActive: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  placementsBanner: { paddingTop: 20, paddingBottom: 16, paddingHorizontal: 16 },
  placementsRow: { alignItems: 'center', marginBottom: 10 },
  placementsSubRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  placementBubble: { borderRadius: 16, alignItems: 'center', padding: 14 },
  placementFirst: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 32, paddingVertical: 16, minWidth: 200 },
  placementSecond: { backgroundColor: 'rgba(255,255,255,0.10)', flex: 1, paddingVertical: 12 },
  placementThird: { backgroundColor: 'rgba(255,255,255,0.10)', flex: 1, paddingVertical: 12 },
  placementRank: { fontSize: 11, letterSpacing: 2, marginTop: 6, marginBottom: 4 },
  placementRankSmall: { fontSize: 10, letterSpacing: 1.5, marginTop: 4, marginBottom: 3 },
  placementName: { fontSize: 22, color: '#fff', letterSpacing: 0.5, textAlign: 'center' },
  placementNameSmall: { fontSize: 14, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.3, textAlign: 'center' },
  organizerHint: {
    backgroundColor: '#fffbeb', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#fde68a', alignItems: 'center',
  },
  regenerateLink: { fontSize: 13, color: '#7A1E1E', textDecorationLine: 'underline', textAlign: 'center' },
  viewToggleRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 12, borderRadius: 12,
    padding: 4, borderWidth: 1, borderColor: '#e0d8c8',
  },
  viewToggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  viewToggleBtnActiveW: { backgroundColor: '#008080' },
  viewToggleBtnActiveL: { backgroundColor: '#7A1818' },
  viewToggleText: { fontSize: 12, color: '#5a7a7a', fontWeight: '700', letterSpacing: 0.5 },
  viewToggleTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  formatNote: { fontSize: 12, color: '#a0b8b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#f5ede0', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  modalTitle: { fontSize: 22, color: '#003333', letterSpacing: 1, marginBottom: 2 },
  modalGameId: { fontSize: 12, color: '#a0b8b8', marginBottom: 16 },
  modalTeamLabel: { fontSize: 14, color: '#5a7a7a', marginBottom: 12 },
  winnerBtn: { backgroundColor: '#008080', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 8, alignItems: 'center' },
  winnerBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  winnerBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  vsText: { textAlign: 'center', color: '#a0b8b8', fontSize: 13, marginVertical: 6 },
  modalNote: { fontSize: 12, color: '#a0b8b8', textAlign: 'center', marginTop: 12, lineHeight: 18 },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  modalCancelText: { color: '#a0b8b8', fontSize: 15 },
});