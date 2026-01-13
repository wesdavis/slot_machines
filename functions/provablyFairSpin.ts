import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const REEL_STRIPS = [
  [0, 3, 5, 6, 5, 3, 7, 5, 6, 0, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 0, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6],
  [1, 3, 5, 6, 5, 3, 7, 5, 6, 1, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 1, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6],
  [2, 3, 5, 6, 5, 3, 7, 5, 6, 2, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 2, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6],
  [1, 3, 5, 6, 5, 3, 7, 5, 6, 1, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 1, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6],
  [0, 3, 5, 6, 5, 3, 7, 5, 6, 0, 3, 5, 4, 6, 3, 5, 6, 7, 3, 5, 6, 0, 3, 5, 6, 3, 5, 6, 7, 3, 5, 6]
];

const PAYLINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2]
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

function getS5Value(betAmount: number) {
  const rand = Math.random();
  if (rand < 0.05) return betAmount * 20;
  if (rand < 0.20) return betAmount * 5;
  return betAmount * 1.5;
}

function checkWins(positions: number[], betAmount = 1) {
    let totalWin = 0;
    const winDetails: any[] = [];
    const WILD = 7, SCATTER_S5 = 4;
    const betPerLine = betAmount / 5;

    PAYLINES.forEach((line, index) => {
        const symbolsOnLine = line.map((row, reel) => positions[reel * 3 + row]);
        let first = symbolsOnLine[0] === WILD ? symbolsOnLine.find(s => s !== WILD && s !== SCATTER_S5) : symbolsOnLine[0];
        if (first === SCATTER_S5 || first === undefined) return;

        let matches = 1;
        for (let i = 1; i < 5; i++) {
            if (symbolsOnLine[i] === first || symbolsOnLine[i] === WILD) matches++;
            else break;
        }

        const payTable: Record<number, number> = { 3: 2, 4: 10, 5: 50 };
        if (payTable[matches]) {
            const payout = betPerLine * payTable[matches];
            totalWin += payout;
            winDetails.push({ type: 'line', line: index + 1, symbol: `S${first + 1}`, count: matches, payout });
        }
    });

    const s5Indices = positions.map((s, i) => s === SCATTER_S5 ? i : -1).filter(i => i !== -1);
    const isHoldAndWinTriggered = s5Indices.length >= 6;

    return { totalWin, winDetails, isHoldAndWinTriggered, s5Count: s5Indices.length };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { action, clientSeed, serverSeed, nonce, currentGrid } = body;

        if (action === 'initSpin') {
            const newServerSeed = generateServerSeed();
            return Response.json({ serverSeedHash: await sha256(newServerSeed), serverSeed: newServerSeed });
        }

        if (action === 'executeSpin') {
            const bet = body.betAmount || 5;
            const combinedHash = await sha256(`${serverSeed}-${clientSeed}-${nonce}`);
            const positions: number[] = [];
            for (let i = 0; i < 5; i++) {
                const stopIndex = parseInt(combinedHash.substring(i * 8, (i * 8) + 8), 16) % REEL_STRIPS[i].length;
                for (let r = 0; r < 3; r++) positions.push(REEL_STRIPS[i][(stopIndex + r) % REEL_STRIPS[i].length]);
            }
            const { totalWin, winDetails, isHoldAndWinTriggered, s5Count } = checkWins(positions, bet);
            
            return Response.json({
                reelPositions: positions,
                winAmount: totalWin,
                winDetails,
                isFeatureTriggered: isHoldAndWinTriggered,
                s5Count
            });
        }

        if (action === 'executeBonusSpin') {
            const bet = body.betAmount || 5;
            const combinedHash = await sha256(`${serverSeed}-${clientSeed}-${nonce}`);
            // In Bonus mode, we only generate new symbols for non-9mm spots
            const nextGrid = [...currentGrid];
            let newSymbolsAdded = 0;

            for (let i = 0; i < 15; i++) {
                if (nextGrid[i] !== 4) { // 4 is 9mm (S5)
                    const randVal = parseInt(combinedHash.substring((i % 8) * 4, (i % 8) * 4 + 4), 16) % 100;
                    if (randVal < 15) { // 15% chance to land a new sticky 9mm
                        nextGrid[i] = 4;
                        newSymbolsAdded++;
                    }
                }
            }

            return Response.json({
                reelPositions: nextGrid,
                newSymbolsAdded,
                isComplete: !nextGrid.includes(-1) && newSymbolsAdded === 0
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
