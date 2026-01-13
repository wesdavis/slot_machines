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
            // Combine seeds and nonce, then hash
            const combinedString = `${serverSeed}-${clientSeed}-${nonce}`;
            const combinedHash = await sha256(combinedString);
            
            // Map to reel positions
            const reelPositions = hashToReelPositions(combinedHash);
            
            // Calculate server seed hash for verification
            const serverSeedHash = await sha256(serverSeed);
            
            // Save spin record
            await base44.entities.SpinRecord.create({
                server_seed_hash: serverSeedHash,
                server_seed: serverSeed,
                client_seed: clientSeed,
                nonce,
                combined_hash: combinedHash,
                reel_positions: reelPositions,
                win_amount: 0
            });
            
            return Response.json({
                combinedHash,
                reelPositions,
                serverSeed,
                serverSeedHash,
                clientSeed,
                nonce
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