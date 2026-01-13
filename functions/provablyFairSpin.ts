import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PROFESSIONAL REEL STRIPS (Balanced for 5 lines)
 * 0-6 = Symbols S1-S7
 * 4   = Scatter Trigger (9mm / S5)
 * 7   = WILD (S8)
 */
const REEL_STRIPS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4],
  [1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5],
  [2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 3, 4, 5, 6],
  [3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 3, 4, 5, 6, 7],
  [4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 4, 5, 6, 7, 0]
];

/**
 * STANDARD 5 PAYLINES
 * Defined by row indices [Row, Row, Row, Row, Row] across 5 reels.
 */
const PAYLINES = [
  [1, 1, 1, 1, 1], // Line 1: Middle Row
  [0, 0, 0, 0, 0], // Line 2: Top Row
  [2, 2, 2, 2, 2], // Line 3: Bottom Row
  [0, 1, 2, 1, 0], // Line 4: V-Shape
  [2, 1, 0, 1, 2]  // Line 5: Inverted V
];

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateServerSeed(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function hashToReelPositions(hash: string) {
  const positions: number[] = [];
  const stops: number[] = [];

  for (let i = 0; i < 5; i++) {
    const startIndex = i * 8;
    const hexPart = hash.substring(startIndex, startIndex + 8);
    const stopIndex = parseInt(hexPart, 16) % REEL_STRIPS[i].length;
    stops.push(stopIndex);

    for (let row = 0; row < 3; row++) {
      const symbolIndex = (stopIndex + row) % REEL_STRIPS[i].length;
      positions.push(REEL_STRIPS[i][symbolIndex]);
    }
  }
  return { positions, stops };
}

function checkWins(positions: number[], betAmount = 1) {
  let totalWin = 0;
  const winDetails: any[] = [];
  const WILD = 7;
  const SCATTER = 4;
  const betPerLine = betAmount / 5;

  // 1. Calculate Line Wins (Left-to-Right)
  PAYLINES.forEach((line, index) => {
    // Map line path to symbols: grid[reel][row]
    const symbolsOnLine = line.map((row, reel) => positions[reel * 3 + row]);
    
    // Logic to find first non-wild symbol for line type
    let firstSymbol = symbolsOnLine[0] === WILD ? symbolsOnLine.find(s => s !== WILD && s !== SCATTER) : symbolsOnLine[0];
    
    // Scatters usually don't pay on lines
    if (firstSymbol === SCATTER || firstSymbol === undefined) return;

    let matchCount = 1;
    for (let i = 1; i < 5; i++) {
      if (symbolsOnLine[i] === firstSymbol || symbolsOnLine[i] === WILD) {
        matchCount++;
      } else {
        break;
      }
    }

    const payTable: Record<number, number> = { 3: 5, 4: 20, 5: 100 };
    if (payTable[matchCount]) {
      const lineWin = betPerLine * payTable[matchCount];
      totalWin += lineWin;
      winDetails.push({ 
        type: 'line', 
        line: index + 1, 
        symbol: `S${firstSymbol + 1}`, 
        count: matchCount, 
        payout: lineWin 
      });
    }
  });

  // 2. Calculate Scatter Wins (S5 / 9mm) - Pays anywhere
  const scatterCount = positions.filter(s => s === SCATTER).length;
  const isFeatureTriggered = scatterCount >= 3;

  if (isFeatureTriggered) {
    const scatterWin = betAmount * 10;
    totalWin += scatterWin;
    winDetails.push({ 
      type: 'bonus', 
      symbol: 'S5', 
      count: scatterCount, 
      payout: scatterWin 
    });
  }

  return { totalWin, winDetails, isFeatureTriggered };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, clientSeed, serverSeed, nonce, verifyServerSeed, verifyClientSeed, verifyNonce } = body;

    if (action === 'initSpin') {
      const newServerSeed = generateServerSeed();
      const serverSeedHash = await sha256(newServerSeed);
      return Response.json({ serverSeedHash, serverSeed: newServerSeed });
    }

    if (action === 'executeSpin') {
      const betAmount = body.betAmount || 5; // Defaulting to 5 for easy 1-per-line math
      const combinedString = `${serverSeed}-${clientSeed}-${nonce}`;
      const combinedHash = await sha256(combinedString);

      const { positions, stops } = hashToReelPositions(combinedHash);
      const { totalWin, winDetails, isFeatureTriggered } = checkWins(positions, betAmount);
      const serverSeedHash = await sha256(serverSeed);

      await base44.entities.SpinRecord.create({
        server_seed_hash: serverSeedHash,
        server_seed: serverSeed,
        client_seed: clientSeed,
        nonce,
        combined_hash: combinedHash,
        reel_positions: stops,
        win_amount: totalWin
      });

      return Response.json({
        combinedHash,
        reelPositions: positions,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        winAmount: totalWin,
        winDetails,
        isFeatureTriggered
      });
    }

    // ... verification logic ...
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
