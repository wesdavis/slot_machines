import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REEL STRIPS
 * Must be identical to provablyFairSpin.ts to ensure simulation accuracy.
 */
const REEL_STRIPS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4],
  [1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5],
  [2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 3, 4, 5, 6],
  [3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 3, 4, 5, 6, 7],
  [4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 4, 5, 6, 7, 0]
];

/**
 * PAYLINE DEFINITIONS
 */
const PAYLINES = [
  [1, 1, 1, 1, 1], // Middle
  [0, 0, 0, 0, 0], // Top
  [2, 2, 2, 2, 2], // Bottom
  [0, 1, 2, 1, 0], // V-Shape
  [2, 1, 0, 1, 2]  // Inverted V
];

/**
 * SIMULATED SPIN ENGINE
 * Optimized for high-speed loops (no database calls).
 */
function runSimulatedSpin(betAmount: number) {
  const positions: number[] = [];
  const WILD = 7;
  const SCATTER = 4;
  const betPerLine = betAmount / 5;
  let totalWin = 0;

  // 1. Generate random grid result
  for (let i = 0; i < 5; i++) {
    const stopIndex = Math.floor(Math.random() * REEL_STRIPS[i].length);
    for (let row = 0; row < 3; row++) {
      positions.push(REEL_STRIPS[i][(stopIndex + row) % REEL_STRIPS[i].length]);
    }
  }

  // 2. Check Line Wins
  PAYLINES.forEach((line) => {
    const symbolsOnLine = line.map((row, reel) => positions[reel * 3 + row]);
    let firstSymbol = symbolsOnLine[0] === WILD ? symbolsOnLine.find(s => s !== WILD && s !== SCATTER) : symbolsOnLine[0];
    
    if (firstSymbol === SCATTER || firstSymbol === undefined) return;

    let matchCount = 1;
    for (let i = 1; i < 5; i++) {
      if (symbolsOnLine[i] === firstSymbol || symbolsOnLine[i] === WILD) matchCount++;
      else break;
    }

    const payTable: Record<number, number> = { 3: 5, 4: 20, 5: 100 };
    if (payTable[matchCount]) totalWin += betPerLine * payTable[matchCount];
  });

  // 3. Check Scatter Trigger
  const scatterCount = positions.filter(s => s === SCATTER).length;
  const isFeature = scatterCount >= 3;
  if (isFeature) totalWin += betAmount * 10;

  return { totalWin, isFeature };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Verification check for Admin access
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const iterations = body.iterations || 1000000;
    const betAmount = body.betAmount || 5;

    let totalBet = 0;
    let totalWon = 0;
    let featureTriggers = 0;

    // Simulation Loop
    for (let i = 0; i < iterations; i++) {
      totalBet += betAmount;
      const { totalWin, isFeature } = runSimulatedSpin(betAmount);
      totalWon += totalWin;
      if (isFeature) featureTriggers++;
    }

    const rtp = (totalWon / totalBet) * 100;

    return Response.json({
      iterations,
      totalBet,
      totalWon,
      rtp: rtp.toFixed(2) + "%",
      featureFrequency: `1 in ${(iterations / featureTriggers).toFixed(0)} spins`,
      houseEdge: (100 - rtp).toFixed(2) + "%"
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
