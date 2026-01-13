import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// SHA-256 hash function
async function sha256(message) {
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

// Map hash to reel positions (5 reels x 3 rows = 15 positions)
function hashToReelPositions(hash, symbolCount = 8) {
    const positions = [];
    // Use different parts of the 64-char hash for each position
    for (let i = 0; i < 15; i++) {
        // Take 4 chars at a time, cycling through the hash
        const startIndex = (i * 4) % 56;
        const hexPart = hash.substring(startIndex, startIndex + 4);
        const num = parseInt(hexPart, 16);
        positions.push(num % symbolCount);
    }
    return positions;
}

// Check wins on the grid
// Symbols are 0-7, representing S1-S8 (0=S1, 1=S2, ..., 7=S8)
function checkWins(positions, betAmount = 1) {
    let totalWin = 0;
    const winDetails = [];
    
    // Middle row indices in 5x3 grid: [1, 4, 7, 10, 13]
    // Grid layout: [0,1,2] [3,4,5] [6,7,8] [9,10,11] [12,13,14]
    const middleRow = [positions[1], positions[4], positions[7], positions[10], positions[13]];
    
    // Check for matching symbols from left to right
    const firstSymbol = middleRow[0];
    let matchCount = 1;
    
    for (let i = 1; i < 5; i++) {
        if (middleRow[i] === firstSymbol) {
            matchCount++;
        } else {
            break;
        }
    }
    
    // Calculate line wins
    if (matchCount === 3) {
        totalWin += betAmount * 5;
        winDetails.push({ type: 'line', symbol: `S${firstSymbol + 1}`, count: 3, payout: betAmount * 5 });
    } else if (matchCount === 4) {
        totalWin += betAmount * 20;
        winDetails.push({ type: 'line', symbol: `S${firstSymbol + 1}`, count: 4, payout: betAmount * 20 });
    } else if (matchCount === 5) {
        totalWin += betAmount * 100;
        winDetails.push({ type: 'line', symbol: `S${firstSymbol + 1}`, count: 5, payout: betAmount * 100 });
    }
    
    // Check for feature trigger: 3 or more S5 symbols (index 4)
    const s5Count = positions.filter(symbol => symbol === 4).length;
    const isFeatureTriggered = s5Count >= 3;
    
    if (isFeatureTriggered) {
        const bonusWin = betAmount * 50;
        totalWin += bonusWin;
        winDetails.push({ type: 'bonus', symbol: 'S5', count: s5Count, payout: bonusWin });
    }
    
    return {
        totalWin,
        winDetails,
        isFeatureTriggered
    };
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
            // Generate new server seed and return its hash
            const newServerSeed = generateServerSeed();
            const serverSeedHash = await sha256(newServerSeed);
            
            return Response.json({
                serverSeedHash,
                serverSeed: newServerSeed // This will be stored securely, revealed after spin
            });
        }

        if (action === 'executeSpin') {
            const betAmount = body.betAmount || 1;
            
            // Combine seeds and nonce, then hash
            const combinedString = `${serverSeed}-${clientSeed}-${nonce}`;
            const combinedHash = await sha256(combinedString);
            
            // Map to reel positions
            const reelPositions = hashToReelPositions(combinedHash);
            
            // Calculate wins
            const { totalWin, winDetails, isFeatureTriggered } = checkWins(reelPositions, betAmount);
            
            // Calculate server seed hash for verification
            const serverSeedHash = await sha256(serverSeed);
            
            // Save spin record with actual win amount
            await base44.entities.SpinRecord.create({
                server_seed_hash: serverSeedHash,
                server_seed: serverSeed,
                client_seed: clientSeed,
                nonce,
                combined_hash: combinedHash,
                reel_positions: reelPositions,
                win_amount: totalWin
            });
            
            return Response.json({
                combinedHash,
                reelPositions,
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
            // Verification endpoint - allows manual verification
            const combinedString = `${verifyServerSeed}-${verifyClientSeed}-${verifyNonce}`;
            const combinedHash = await sha256(combinedString);
            const reelPositions = hashToReelPositions(combinedHash);
            const serverSeedHash = await sha256(verifyServerSeed);
            
            return Response.json({
                serverSeedHash,
                combinedHash,
                reelPositions,
                verified: true
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});