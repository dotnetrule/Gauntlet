# Wintermaul Wars — Game Definition Document

## 1. Concept

**Genre:** Competitive Tower Defense (1v1)
**Inspiration:** Wintermaul Wars (Warcraft III custom map)
**Platform target:** Browser-first; extensible to desktop and multiplayer
**Perspective:** Top-down 2D grid

A 1v1 competitive tower defense where each player builds a maze on their own lane and spends gold to send attack units into the opponent's lane. **Sending is the economy**: every unit sent permanently raises your income, so each gold piece is a gamble between defending now and getting richer through aggression — the core tension of the original Wintermaul Wars. The game ends when one player loses all their lives.

---

## 2. Core Loop

```
Income pays out every 15 seconds
       ↓
Players spend gold: towers/upgrades (defense) OR sends (offense + eco)
       ↓
Every send PERMANENTLY raises the sender's income
       ↓
Sent units walk the opponent's maze — leaks cost lives
       ↓
Baseline creep waves drip bounty gold to both lanes
       ↓
Richer player snowballs → bigger sends → more pressure
       ↓
Repeat until one player hits 0 lives → that player loses
```

---

## 3. The Grid

- Each player has a private **22×20 tile grid**
- Tiles are either **open** (path) or **blocked** (tower)
- Creeps always path from **top-left → bottom-right**
- Players maze the grid by placing towers to force a longer route
- **Constraint:** placing a tower must never fully block the path (validated via A*)

---

## 4. Economy

| Source | Amount |
|---|---|
| Starting gold | 200 |
| Starting income | 15 per tick |
| Income tick | Every 15 seconds |
| Per creep killed | Creep's `reward` value (bounty only — kills do NOT raise income) |
| Per unit sent | Permanent `+incomeBonus` to the **sender's** income |

Income only grows by sending. Payback on a send is roughly 9–13 income ticks, and bigger sends are slightly more income-efficient — saving up for a large send is the greedy eco play, but it leaves you poor while the opponent pressures you.

---

## 5. Towers

| Name | Cost | Upgrades (T2 / T3) | Role | Key stat progression |
|---|---|---|---|---|
| Arrow | 50g | 75g / 150g | Single-target DPS | 12→30→75 dmg, rate up to 1.6/s |
| Frost | 90g | 135g / 260g | Utility / slow | 45%→55%→65% slow |
| Cannon | 120g | 180g / 350g | AoE burst | 60→150→360 dmg, splash to 1.8 tiles |
| Flame | 160g | 240g / 480g | Rapid AoE | 20→50→120 dmg at 3/s |
| Sniper | 200g | 300g / 600g | Long-range snipe | 120→300→750 dmg, 8-tile range |
| Lightning | 240g | 360g / 700g | Chain damage | 45→110→260 dmg, chains 3→4→5 creeps |

**Tower rules:**
- Placement blocked by maze validity check (A*)
- Each tower has two upgrade tiers with better damage-per-gold than the base — upgrading beats spamming when maze tiles are scarce
- Selling refunds **50% of everything invested** (base + upgrades)
- Towers target the furthest-along creep in range
- Upgraded towers grow visually and gain tier pips

---

## 6. Baseline Creep Waves (bounty drip)

Small waves spawn every ~30 seconds on both lanes. They exist to drip bounty gold and keep mazes visibly working — the real pressure comes from opponent sends. Tiers cap at Ogre; the top-tier monsters only ever arrive as sends.

| Tier | Name | Base HP | Reward |
|---|---|---|---|
| 1 | Footman | 80 | 3g |
| 2 | Grunt | 220 | 5g |
| 3 | Ogre | 550 | 8g |

Tier advances every 4 waves (capped). HP scales +12% per wave; count grows slowly (`4 + wave/4`).

---

## 7. Send Units (the PvP + eco engine)

Players spend gold to send units into the **opponent's lane**. Every send permanently raises the **sender's** income.

| Unit | Cost | HP | Count | +Income | Unlocks |
|---|---|---|---|---|---|
| Runner | 50g | 250 | 1 | +4 | Wave 1 |
| Swarm | 110g | 130 | ×6 | +10 | Wave 2 |
| Brute | 150g | 1100 | 1 | +14 | Wave 4 |
| Boss | 400g | 4500 | 1 | +42 | Wave 8 |
| Juggernaut | 900g | 12000 | 1 | +110 | Wave 13 |

Sent units walk the opponent's maze path. Each one that reaches the exit deals **1 life** of damage. Unlock waves prevent early boss rushes.

---

## 8. Lives & Winning

- Both players start with **20 lives**
- Lives are lost when any creep — baseline wave or sent unit — leaks through the maze (−1 life each)
- **Win condition:** Reduce opponent to 0 lives

---

## 9. Timing

- Income pays every **15 seconds** (both players simultaneously)
- Baseline waves spawn every **30 seconds**
- Sends can be dispatched **at any time** — the core real-time decision is *defend now vs. eco harder*

---

## 10. AI Opponent

The AI runs a 2-second decision tick with three modes:

- **Eco** (default): banks a small gold reserve, dumps surplus into the largest unlocked send, builds/upgrades a tower every few income ticks
- **Defend**: triggered by losing 2+ lives in 10s or a swamped lane; builds maze towers adjacent to its actual creep path and upgrades the tower covering the most path
- **Pressure**: triggered by a 25% income lead or a wounded player; dumps gold into Boss/Juggernaut + Swarm combos

A watchdog forces a send if the AI has been quiet for 45 seconds. All thresholds are named constants in `src/systems/ai.js` for tuning.

---

## 11. Presentation

All audio and visuals are procedural — no external assets:

- WebAudio synth effects: per-tower shot voices, hit ticks, death zaps, leak alarm, send sweep, upgrade arpeggio, income ding, wave horn, win/lose stingers
- Particle bursts on kills, leaks, cannon impacts, and upgrades
- Creep hit flashes, walk wobble, and facing nubs; tower muzzle flashes
- Screen shake when the player loses a life; HUD gold pulse on the income tick

---

## 12. Planned / Future Systems

- **Local 2-player** (split keyboard controls)
- **Online multiplayer** (WebSocket or WebRTC)
- **More tower types** (mortar, buff auras)
- **More send units** (invisible, armored, regenerating)
- **AI difficulty levels**
- **Lobby & matchmaking**
- **Leaderboard / stats**

---

## 13. Key Design Pillars

1. **Eco vs. defense gamble** — Income only grows by sending; every gold piece is a bet between safety now and wealth later
2. **Maze agency** — Path length is entirely player-driven; great mazes are the primary skill expression
3. **Player-driven pressure** — The dangerous creeps on your lane were sent by your opponent, not a timer
4. **Readable state** — Both lanes and both incomes visible at all times so players can read the eco race at a glance
