import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REEL STRIPS (Diluted for Hold & Win)
 * S1-S7 = 0-6, S5 (9mm) = 4, WILD (Bada Bing) = 7
 */
const REEL_STRIPS = [
  [0, 3, 5, 6, 5, 3, 7, 5, 6, 0, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 0, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6],
  [1, 3, 5, 6, 5, 3, 7, 5, 6, 1, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 1, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6],
  [2, 3, 5, 6, 5, 3, 7, 5, 6, 2, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 2, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6],
  [1, 3, 5, 6, 5, 3, 7, 5, 6, 1, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 1, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6],
  [0, 3, 5, 6, 5, 3, 7, 5, 6, 0, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 0, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6]
];

const PAYLINES = [
  [1, 1, 1, 1, 1], // Middle
  [0, 0, 0, 0, 0], // Top
  [2, 2, 2, 2, 2], // Bottom
  [0, 1, 2, 1, 0], // V-Shape
  [2, 1, 0, 1, 2]  // Inverted V
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

// Helper for Hold & Win values
function getS5Value(betAmount: number) {
  const rand = Math.random();
  if (rand < 0.05) return betAmount * 20; // Mini
  if (rand < 0.20) return betAmount * 5;  // Med
  return betAmount * 1.5;                // Base
}

function checkWins(positions: number[], betAmount = 1) {
    let totalWin = 0;
    const winDetails: any[] = [];
    const WILD = 7;
    const SCATTER_S5 = 4;
    const betPerLine = betAmount / 5;

    // 1. Line Wins (Left-to-Right)
    PAYLINES.forEach((line, index) => {
        const symbolsOnLine = line.map((row, reel) => positions[reel * 3 + row]);
        let firstSymbol = symbolsOnLine[0] === WILD ? symbolsOnLine.find(s => s !== WILD && s !== SCATTER_S5) : symbolsOnLine[0];
        if (firstSymbol === SCATTER_S5 || firstSymbol === undefined) return;

        let matchCount = 1;
        for (let i = 1; i < 5; i++) {
            if (symbolsOnLine[i] === firstSymbol || symbolsOnLine[i] === WILD) matchCount++;
            else break;
        }

        const payTable: Record<number, number> = { 3: 2, 4: 10, 5: 50 };
        if (payTable[matchCount]) {
            const payout = betPerLine * payTable[matchCount];
            totalWin += payout;
            winDetails.push({ type: 'line', line: index + 1, symbol: `S${firstSymbol + 1}`, count: matchCount, payout });
        }
    });

    // 2. Hold & Win Trigger (Requires 6)
    const s5Indices = positions.map((s, i) => s === SCATTER_S5 ? i : -1).filter(i => i !== -1);
    const isHoldAndWinTriggered = s5Indices.length >= 6;

    if (isHoldAndWinTriggered) {
        let bonusTotal = 0;
        s5Indices.forEach(() => { bonusTotal += getS5Value(betAmount); });
        totalWin += bonusTotal;
        winDetails.push({ type: 'hold_and_win', count: s5Indices.length, payout: bonusTotal });
    }

    return { totalWin, winDetails, isHoldAndWinTriggered };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { action, clientSeed, serverSeed, nonce } = body;

        if (action === 'initSpin') {
            const newServerSeed = generateServerSeed();
            const serverSeedHash = await sha256(newServerSeed);
            return Response.json({ serverSeedHash, serverSeed: newServerSeed });
        }

        if (action === 'executeSpin') {
            const betAmount = body.betAmount || 5;
            const combinedString = `${serverSeed}-${clientSeed}-${nonce}`;
            const combinedHash = await sha256(combinedString);
            const { positions, stops } = hashToReelPositions(combinedHash);
            const { totalWin, winDetails, isHoldAndWinTriggered } = checkWins(positions, betAmount);
            
            await base44.entities.SpinRecord.create({
                server_seed_hash: await sha256(serverSeed),
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
                winAmount: totalWin,
                winDetails,
                isFeatureTriggered: isHoldAndWinTriggered
            });
        }
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
