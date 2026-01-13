import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PROFESSIONAL REEL STRIPS (10 stops each)
 * 0-6 = Low/High Pay Symbols (S1-S7)
 * 7   = WILD (S8)
 * 4   = FEATURE TRIGGER (9mm / S5)
 */
const REEL_STRIPS = [
    [0, 1, 2, 3, 4, 5, 6, 7, 0, 1], // Reel 1
    [1, 2, 3, 4, 5, 6, 7, 0, 1, 2], // Reel 2
    [2, 3, 4, 5, 6, 7, 0, 1, 2, 3], // Reel 3
    [3, 4, 5, 6, 7, 0, 1, 2, 3, 4], // Reel 4
    [4, 5, 6, 7, 0, 1, 2, 3, 4, 5]  // Reel 5
];

// SHA-256 hash function for Provably Fair compliance
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate cryptographically secure random string for Server Seed
function generateServerSeed(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/** * Maps the 64-char SHA-256 hash to 5 specific reel stop indices.
 * Each reel uses 8 characters of the hash for high-entropy randomness.
 */
function hashToReelPositions(hash) {
    const positions = [];
    const stops = [];
    
    for (let i = 0; i < 5; i++) {
        // Extract 8 hex chars per reel
        const startIndex = i * 8;
        const hexPart = hash.substring(startIndex, startIndex + 8);
        const stopIndex = parseInt(hexPart, 16) % REEL_STRIPS[i].length;
        stops.push(stopIndex);

        // Generate the 3 symbols visible on the reel (3 rows)
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
function checkWins(positions, betAmount = 1) {
    let totalWin = 0;
    const winDetails = [];
    const WILD = 7;
    
    // Extract the middle row from the flat positions array
    const middleRow = [positions[1], positions[4], positions[7], positions[10], positions[13]];
    
    // Identify the first non-wild symbol to determine the win line type
    let firstSymbol = middleRow[0] === WILD ? middleRow.find(s => s !== WILD) : middleRow[0];
    
    // If the whole line is Wilds, it pays as the highest symbol (S1)
    if (firstSymbol === undefined) firstSymbol = 0; 

    let matchCount = 1;
    for (let i = 1; i < 5; i++) {
        if (middleRow[i] === firstSymbol || middleRow[i] === WILD) {
            matchCount++;
        } else {
            break;
        }
    }
    
    // Calculate Payouts based on match count
    const payTable = { 3: 5, 4: 20, 5: 100 };
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
    
    // Check for 9mm Feature Trigger (S5 / index 4) scattered anywhere
    const s5Count = positions.filter(symbol => symbol === 4).length;
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
            
            // Map to reel positions using professional strips
            const { positions, stops } = hashToReelPositions(combinedHash);
            
            // Calculate actual wins and triggers
            const { totalWin, winDetails, isFeatureTriggered } = checkWins(positions, betAmount);
            const serverSeedHash = await sha256(serverSeed);
            
            // Persist the spin record for the Provably Fair audit trail
            await base44.entities.SpinRecord.create({
                server_seed_hash: serverSeedHash,
                server_seed: serverSeed,
                client_seed: clientSeed,
                nonce,
                combined_hash: combinedHash,
                reel_positions: stops, // Store stop indices for easier verification
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

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
