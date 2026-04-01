# Wintermaul Wars — Game Definition Document

## 1. Concept

**Genre:** Competitive Tower Defense (1v1)
**Inspiration:** Wintermaul Wars (Warcraft III custom map)
**Platform target:** Browser-first; extensible to desktop and multiplayer
**Perspective:** Top-down 2D grid

A 1v1 competitive tower defense where each player builds a maze on their own lane to kill incoming creep waves. Players also spend gold to actively send attack units into the opponent's lane. The game ends when one player loses all their lives.

---

## 2. Core Loop

```
Wave Timer Ticks Down
       ↓
Both lanes receive creep wave simultaneously
       ↓
Players place/upgrade towers to kill creeps (maze building)
       ↓
Killed creeps reward gold
       ↓
Players spend gold on more towers OR send units to opponent
       ↓
Sent units walk the opponent's lane — if they leak, opponent loses lives
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
| Per creep killed | Creep's `reward` value (4–50g) |
| Income per wave | 10g + 2g per 5 kills accumulated |

Income scales with kill count, rewarding aggressive maze play over time.

---

## 5. Towers

| Name | Cost | Role | Key Stat |
|---|---|---|---|
| Arrow | 50g | Single-target DPS | Fast rate, medium range |
| Cannon | 120g | AoE burst | Splash radius, slower rate |
| Frost | 90g | Utility / slow | 45% slow, 2s duration |
| Sniper | 200g | Long-range snipe | 7 tile range, high damage |
| Flame | 160g | Rapid AoE | 3 attacks/sec, short range |

**Tower rules:**
- Placement blocked by maze validity check (A*)
- Selected towers can be sold for 50% of cost
- Towers target the furthest-along creep in range

---

## 6. Creep Waves (PvE component)

Waves spawn every ~25 seconds. Wave creep type and count scale with wave number:

| Tier | Name | HP range | Reward |
|---|---|---|---|
| 1 | Footman | 80–scaling | 4g |
| 2 | Grunt | 200–scaling | 8g |
| 3 | Ogre | 500–scaling | 15g |
| 4 | Troll | 1200–scaling | 25g |
| 5 | Demon | 3000–scaling | 50g |

HP scales by +15% per wave within each tier. Count grows with wave number.

---

## 7. Send Units (PvP Component)

Players spend gold to send units directly into the **opponent's lane**:

| Unit | Cost | HP | Speed | Special |
|---|---|---|---|---|
| Runner | 60g | 200 | Fast | Cheap harassment |
| Brute | 120g | 700 | Slow | Tanky |
| Swarm | 100g | 150×5 | Medium | Sends 5 at once |
| Boss | 350g | 4000 | Very slow | High-value threat |

Sent units walk the opponent's maze path. Each one that reaches the exit deals **1 life** of damage.

---

## 8. Lives & Winning

- Both players start with **20 lives**
- Lives are lost when:
  - A wave creep leaks through your maze (−1 life)
  - A sent unit reaches the exit of your lane (−1 life per unit)
- **Win condition:** Reduce opponent to 0 lives

---

## 9. Wave Send Timing

- Wave creeps spawn on a fixed timer (every 25s)
- Sent units can be dispatched **at any time** between waves (real-time economy decision)
- This creates the core tension: do you save gold to improve your maze, or spend it to pressure the opponent?

---

## 10. AI Opponent (v1)

The current AI:
- Attempts to place a tower every 4–9 seconds in a random valid cell
- Prioritizes affordable towers (spends up to 70% of gold on each build)
- Sends a random affordable unit every 18–28 seconds

Future AI improvements: difficulty levels, strategic maze-building heuristics, threat detection.

---

## 11. Planned / Future Systems

- **Tower upgrades** (tiered upgrade paths per tower)
- **Visual polish** (particles, hit effects, animated creeps)
- **Local 2-player** (split keyboard controls)
- **Online multiplayer** (WebSocket or WebRTC)
- **More tower types** (chain lightning, mortar, buff auras)
- **More send units** (invisible, armored, regenerating)
- **Lobby & matchmaking**
- **Leaderboard / stats**

---

## 12. Key Design Pillars

1. **Maze agency** — Path length is entirely player-driven; great maces are the primary skill expression
2. **Economy tension** — Every gold is a choice: build vs. attack
3. **Simultaneous pressure** — Both players race the same wave timer, creating shared urgency
4. **Readable state** — Both lanes visible at all times so players can read the match at a glance
