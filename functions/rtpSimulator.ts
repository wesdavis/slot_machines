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

function runSimulatedSpin(betAmount: number) {
  const positions: number[] = [];
  const WILD = 7, SCATTER_S5 = 4;
  const betPerLine = betAmount / 5;
  let win = 0;

  for (let i = 0; i < 5; i++) {
    const stop = Math.floor(Math.random() * REEL_STRIPS[i].length);
    for (let r = 0; r < 3; r++) positions.push(REEL_STRIPS[i][(stop + r) % REEL_STRIPS[i].length]);
  }

  PAYLINES.forEach((line) => {
    const syms = line.map((row, reel) => positions[reel * 3 + row]);
    let first = syms[0] === WILD ? syms.find(s => s !== WILD && s !== SCATTER_S5) : syms[0];
    if (first === SCATTER_S5 || first === undefined) return;
    let matches = 1;
    for (let i = 1; i < 5; i++) {
        if (syms[i] === first || syms[i] === WILD) matches++;
        else break;
    }
    const payTable: Record<number, number> = { 3: 2, 4: 10, 5: 50 };
    if (payTable[matches]) win += betPerLine * payTable[matches];
  });

  const s5Count = positions.filter(s => s === SCATTER_S5).length;
  const triggered = s5Count >= 6;
  
  if (triggered) {
    // Simulate a Hold & Win session: Start with s5Count, try to fill 15 spots
    let currentS5 = s5Count;
    let respins = 3;
    while (respins > 0 && currentS5 < 15) {
        let foundNew = false;
        for (let i = 0; i < (15 - currentS5); i++) {
            if (Math.random() < 0.15) { // 15% chance per empty spot
                currentS5++;
                foundNew = true;
            }
        }
        if (foundNew) respins = 3;
        else respins--;
    }
    win += currentS5 * (betAmount * 1.5);
  }
  return { win, triggered };
}

Deno.serve(async (req) => {
  const body = await req.json();
  const iterations = body.iterations || 100000;
  const bet = body.betAmount || 5;
  let totalBet = 0, totalWon = 0, triggers = 0;

  for (let i = 0; i < iterations; i++) {
    totalBet += bet;
    const res = runSimulatedSpin(bet);
    totalWon += res.win;
    if (res.triggered) triggers++;
  }

  return Response.json({
    iterations,
    rtp: ((totalWon / totalBet) * 100).toFixed(2) + "%",
    featureFrequency: `1 in ${(iterations / triggers).toFixed(0)} spins`
  });
});
