import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PROFESSIONAL REEL STRIPS
 * To maintain compatibility with your UI:
 * Symbols 0-6 = S1-S7
 * Symbol 4   = Feature Trigger (S5/9mm)
 * Symbol 7   = WILD (S8)
 */
const REEL_STRIPS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4], // Reel 1
  [1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5], // Reel 2
  [2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 3, 4, 5, 6], // Reel 3
  [3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 3, 4, 5, 6, 7], // Reel 4
  [4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 4, 5, 6, 7, 0]  // Reel 5
];

// SHA-256 hash function
async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate cryptographically secure random string
function generateServerSeed(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * PROFESSIONAL MAPPING:
 * Instead of 15 random symbols, we find 5 "Stop Positions" (one per reel).
 * Then we return the 3x5 grid based on those strips.
 */
function hashToReelPositions(hash: string) {
  const positions: number[] = [];
  const stops: number[] = [];

  for (let i = 0; i < 5; i++) {
    // Take 8 chars of hash per reel for high precision
    const startIndex = i * 8;
    const hexPart = hash.substring(startIndex, startIndex + 8);
    const stopIndex = parseInt(hexPart, 16) % REEL_STRIPS[i].length;
    stops.push(stopIndex);

    // Get the 3 symbols visible on the reel (including wrapping around the end)
    for (let row = 0; row < 3; row++) {
      const symbolIndex = (stopIndex + row) % REEL_STRIPS[i].length;
      positions.push(REEL_STRIPS[i][symbolIndex]);
    }
  }
  return { positions, stops };
}

/**
 * Calculates payouts for the middle row (Indices 1, 4, 7, 10, 13)
 * Includes Wild (7) substitution logic.
 */
function checkWins(positions: number[], betAmount = 1) {
  let totalWin = 0;
  const winDetails: any[] = [];
  const WILD = 7;

  // Middle row indices in 5x3 flat array: [1, 4, 7, 10, 13]
  const middleRow = [positions[1], positions[4], positions[7], positions[10], positions[13]];

  // Identify first non-wild symbol
  let firstSymbol = middleRow[0] === WILD ? middleRow.find(s => s !== WILD) : middleRow[0];
  
  // Handle case where line is all Wilds (assigns highest pay symbol 0)
  if (firstSymbol === undefined) firstSymbol = 0;

  let matchCount = 1;
  for (let i = 1; i < 5; i++) {
    if (middleRow[i] === firstSymbol || middleRow[i] === WILD) {
      matchCount++;
    } else {
      break;
    }
  }

  // Paytable mapping
  const payTable: Record<number, number> = { 3: 5, 4: 20, 5: 100 };
  if (payTable[matchCount]) {
    const payout = betAmount * payTable[matchCount];
    totalWin += payout;
    winDetails.push({ 
      type: 'line', 
      symbol: `S${firstSymbol + 1}`, 
      count: matchCount, 
      payout 
    });
  }

  // Feature trigger check: 3 or more S5 symbols (index 4) anywhere on grid
  const s5Count = positions.filter(s => s === 4).length;
  const isFeatureTriggered = s5Count >= 3;

  if (isFeatureTriggered) {
    const bonusWin = betAmount * 50;
    totalWin += bonusWin;
    winDetails.push({ type: 'bonus', symbol: 'S5', count: s5Count, payout: bonusWin });
  }

  return { totalWin, winDetails, isFeatureTriggered };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, clientSeed, serverSeed, nonce, verifyServerSeed, verifyClientSeed, verifyNonce } = body;

    if (action === 'initSpin') {
      const newServerSeed = generateServerSeed();
      const serverSeedHash = await sha256(newServerSeed);
      return Response.json({ serverSeedHash, serverSeed: newServerSeed });
    }

    if (action === 'executeSpin') {
      const betAmount = body.betAmount || 1;
      const combinedString = `${serverSeed}-${clientSeed}-${nonce}`;
      const combinedHash = await sha256(combinedString);

      const { positions, stops } = hashToReelPositions(combinedHash);
      const { totalWin, winDetails, isFeatureTriggered } = checkWins(positions, betAmount);
      const serverSeedHash = await sha256(serverSeed);

      // Persist spin record
      await base44.entities.SpinRecord.create({
        server_seed_hash: serverSeedHash,
        server_seed: serverSeed,
        client_seed: clientSeed,
        nonce,
        combined_hash: combinedHash,
        reel_positions: stops, // Store stop indices for easier math verification
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

    if (action === 'verify') {
      const combinedString = `${verifyServerSeed}-${verifyClientSeed}-${verifyNonce}`;
      const combinedHash = await sha256(combinedString);
      const { positions } = hashToReelPositions(combinedHash);
      const serverSeedHash = await sha256(verifyServerSeed);

      return Response.json({
        serverSeedHash,
        combinedHash,
        reelPositions: positions,
        verified: true
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
