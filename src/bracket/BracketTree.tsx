import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

export type TreeGame = {
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
  fedByWinnerOf: [string, string] | null;
};

type BracketTreeProps = {
  rounds: TreeGame[][];
  finalColumn?: TreeGame[];
  roundLabel: (roundIndex: number, isLastRound: boolean) => string;
  finalColumnLabel?: string;
  accentColor: string;
  isOwner: boolean;
  onGamePress: (game: TreeGame) => void;
  emptyMessage: string;
};

export const CARD_WIDTH = 132;
export const CARD_HEIGHT = 56;
export const ROW_GAP = 14;
export const ROW_HEIGHT = CARD_HEIGHT + ROW_GAP;
const COL_GAP = 40;
const COL_WIDTH = CARD_WIDTH + COL_GAP;
const LABEL_HEIGHT = 28;
export const PADDING_TOP = LABEL_HEIGHT + 10;
const PADDING_LEFT = 14;
const PADDING_BOTTOM = 16;

type Positioned = { game: TreeGame; x: number; y: number; col: number };

function computeLayout(rounds: TreeGame[][], finalColumn: TreeGame[]) {
  const allColumns = finalColumn.length > 0 ? [...rounds, finalColumn] : rounds;
  const allGames = allColumns.flat();
  const idsInTree = new Set(allGames.map(g => g.id));

  const yCenter = new Map<string, number>();

  function resolveColumn(columnGames: TreeGame[], getRawY: (g: TreeGame, i: number) => number) {
    const entries = columnGames.map((g, i) => ({ id: g.id, rawY: getRawY(g, i) }));
    const sorted = [...entries].sort((a, b) => a.rawY - b.rawY);
    let prevY = -Infinity;
    for (const e of sorted) {
      const y = Math.max(e.rawY, prevY + ROW_HEIGHT);
      yCenter.set(e.id, y);
      prevY = y;
    }
  }

  allColumns.forEach(columnGames => {
    resolveColumn(columnGames, (g, i) => {
      const feeders = (g.fedByWinnerOf || []).filter(fid => idsInTree.has(fid) && yCenter.has(fid));
      if (feeders.length === 2) return (yCenter.get(feeders[0])! + yCenter.get(feeders[1])!) / 2;
      if (feeders.length === 1) return yCenter.get(feeders[0])!;
      return PADDING_TOP + i * ROW_HEIGHT + CARD_HEIGHT / 2;
    });
  });

  const positioned: Positioned[] = [];
  let colIndex = 0;
  let maxBottom = 0;

  allColumns.forEach(columnGames => {
    const x = PADDING_LEFT + colIndex * COL_WIDTH;
    columnGames.forEach(g => {
      const y = yCenter.get(g.id) ?? (PADDING_TOP + CARD_HEIGHT / 2);
      positioned.push({ game: g, x, y, col: colIndex });
      maxBottom = Math.max(maxBottom, y + CARD_HEIGHT / 2);
    });
    colIndex++;
  });

  const width = PADDING_LEFT + colIndex * COL_WIDTH + PADDING_LEFT;
  const height = maxBottom + PADDING_BOTTOM;

  return { positioned, width, height, columnCount: colIndex };
}

function statusColors(game: TreeGame, accentColor: string) {
  if (game.isBye) return { border: '#d3d1c7', borderWidth: 1, dashed: true };
  if (game.status === 'completed') return { border: accentColor, borderWidth: 1.5, dashed: false };
  if (game.status === 'ready') return { border: '#B8860B', borderWidth: 2, dashed: false };
  return { border: '#e0d8c8', borderWidth: 1, dashed: false };
}

function truncate(name: string | null, maxChars: number): string {
  if (!name) return 'TBD';
  return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
}

export default function BracketTree({
  rounds, finalColumn = [], roundLabel, finalColumnLabel = 'CHAMPIONSHIP',
  accentColor, isOwner, onGamePress, emptyMessage,
}: BracketTreeProps) {
  const scrollRef = useRef<ScrollView>(null);

  const layout = useMemo(() => computeLayout(rounds, finalColumn), [rounds, finalColumn]);

  const activeColIndex = useMemo(() => {
    const ready = layout.positioned.find(p => p.game.status === 'ready');
    if (ready) return ready.col;
    const pending = layout.positioned.find(p => p.game.status === 'pending');
    if (pending) return pending.col;
    return Math.max(0, layout.columnCount - 1);
  }, [layout]);

  useEffect(() => {
    if (layout.columnCount === 0) return;
    const targetX = Math.max(0, activeColIndex * COL_WIDTH - 20);
    scrollRef.current?.scrollTo({ x: targetX, animated: true });
  }, [activeColIndex, layout.columnCount]);

  if (layout.positioned.length === 0) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#a0b8b8', textAlign: 'center', paddingHorizontal: 24 }}>{emptyMessage}</Text>
      </View>
    );
  }

  const columnHeaders: { x: number; label: string }[] = [];
  rounds.forEach((_, i) => {
    columnHeaders.push({
      x: PADDING_LEFT + i * COL_WIDTH,
      label: roundLabel(i, i === rounds.length - 1),
    });
  });
  if (finalColumn.length > 0) {
    columnHeaders.push({ x: PADDING_LEFT + rounds.length * COL_WIDTH, label: finalColumnLabel });
  }

  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator style={{ marginBottom: 8 }}>
      <Svg width={layout.width} height={layout.height}>
        {columnHeaders.map(h => (
          <SvgText key={h.label + h.x} x={h.x} y={18} fontSize={11} fontWeight="500" fill={accentColor} letterSpacing={1}>
            {h.label}
          </SvgText>
        ))}

        {layout.positioned.map(p => {
          if (p.col === 0) return null;
          const feederIds = p.game.fedByWinnerOf || [];
          if (feederIds.length === 0) return null;

          const resolved = feederIds.map(fid => layout.positioned.find(pp => pp.game.id === fid) || null);
          const known = resolved.filter((f): f is Positioned => !!f);
          const pieces: ReactNode[] = [];

          if (known.length === 2) {
            const [f1, f2] = known;
            const stubX = f1.x + CARD_WIDTH + COL_GAP / 2;
            pieces.push(
              <G key="elbow" stroke="#b9c9c4" strokeWidth={2} fill="none">
                <Line x1={f1.x + CARD_WIDTH} y1={f1.y} x2={stubX} y2={f1.y} />
                <Line x1={f2.x + CARD_WIDTH} y1={f2.y} x2={stubX} y2={f2.y} />
                <Line x1={stubX} y1={f1.y} x2={stubX} y2={f2.y} />
                <Line x1={stubX} y1={p.y} x2={p.x} y2={p.y} />
              </G>
            );
          } else if (known.length === 1) {
            const f = known[0];
            pieces.push(
              <Line key="single" x1={f.x + CARD_WIDTH} y1={f.y} x2={p.x} y2={p.y}
                stroke="#b9c9c4" strokeWidth={2} fill="none" />
            );
          }

          // Any feeder NOT resolved in this same tree (most commonly a
          // losers-bracket slot waiting on a winners-bracket loser, which
          // lives on the other tab and isn't rendered here) gets a short
          // dashed stub instead of nothing — same convention printed
          // double-elim brackets use to mark a drop-in entry point, so the
          // slot reads as "connection coming" rather than a dead end.
          // Position 0 in fedByWinnerOf always feeds the top slot, position
          // 1 feeds bottom, so the stub lands on the correct half of the card.
          resolved.forEach((f, idx) => {
            if (f || !feederIds[idx]) return;
            const slotY = idx === 0 ? p.y - 14 : p.y + 14;
            pieces.push(
              <Line key={`stub-${idx}`} x1={p.x - 22} y1={slotY} x2={p.x} y2={slotY}
                stroke="#cdbfa3" strokeWidth={1.5} strokeDasharray="3,3" />
            );
          });

          return pieces.length ? <G key={`conn-${p.game.id}`}>{pieces}</G> : null;
        })}

        {/* Cards */}
        {layout.positioned.map(p => {
          const { game } = p;
          const colors = statusColors(game, accentColor);
          const isCompleted = game.status === 'completed';
          const topIsWinner = isCompleted && game.winnerId === game.topTeamId;
          const bottomIsWinner = isCompleted && game.winnerId === game.bottomTeamId;
          const canTap = isOwner && (game.status === 'ready' || game.status === 'completed') && !game.isBye;
          const top = p.y - CARD_HEIGHT / 2;

          return (
            <G key={game.id}>
              <Rect
                x={p.x} y={top} width={CARD_WIDTH} height={CARD_HEIGHT} rx={8}
                fill="#ffffff" stroke={colors.border} strokeWidth={colors.borderWidth}
                strokeDasharray={colors.dashed ? '4,3' : undefined}
                onPress={canTap ? () => onGamePress(game) : undefined}
              />
              {game.isBye ? (
                <>
                  <SvgText x={p.x + 10} y={top + 24} fontSize={12} fontWeight="500" fill="#003333">
                    {truncate(game.topTeamId ? game.topTeamName : game.bottomTeamName, 15)}
                  </SvgText>
                  <SvgText x={p.x + 10} y={top + 40} fontSize={10} fill="#a0b8b8">BYE — auto-advance</SvgText>
                </>
              ) : (
                <>
                  {topIsWinner && <Circle cx={p.x + 10} cy={top + 16} r={3} fill={accentColor} />}
                  <SvgText
                    x={topIsWinner ? p.x + 18 : p.x + 10} y={top + 20} fontSize={12}
                    fontWeight={topIsWinner ? '500' : '400'}
                    fill={topIsWinner ? accentColor : (game.topTeamName ? '#003333' : '#a0b8b8')}
                  >
                    {truncate(game.topTeamName, topIsWinner ? 13 : 15)}
                  </SvgText>
                  {bottomIsWinner && <Circle cx={p.x + 10} cy={top + 40} r={3} fill={accentColor} />}
                  <SvgText
                    x={bottomIsWinner ? p.x + 18 : p.x + 10} y={top + 44} fontSize={12}
                    fontWeight={bottomIsWinner ? '500' : '400'}
                    fill={bottomIsWinner ? accentColor : (game.bottomTeamName ? '#003333' : '#a0b8b8')}
                  >
                    {truncate(game.bottomTeamName, bottomIsWinner ? 13 : 15)}
                  </SvgText>
                </>
              )}
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}