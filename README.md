# 🃏 Taas Master — Real-Time Dashain Card Game Assistant

> **Sub-5-Second Mobile Card Perception & Deterministic Game-Theory Solver for Nepali Festivals (Dashain & Tihar)**

Taas Master is a hybrid client-cloud Progressive Web App (PWA) engineered to assist players during Dashain family gatherings across canonical Nepali card games. It combines computer vision card perception with **<15ms client-side deterministic game-theory solvers** in TypeScript.

---

## 🎮 Supported Nepali Card Games & Solvers

| Game | Hand Size | Core Algorithmic Capability |
|---|---|---|
| **Jutpatti (Chutpati)** | 5 or 7 cards | Live-out probability scoring, pair completion, and opponent pickup safety ($V(r)$ formula). |
| **Marriage** | 21 cards (3 decks / 156 cards) | Phase 1 pure sequence backtracking, 7-Dublee path switch, Tiplu / Poplu / Jhiplu / Alter Maal EV calculator, and 3-deck proto-meld discard scoring. |
| **Kitti (9 Cards)** | 9 cards (split 3×3) | Instant Chauka (4-of-a-kind) pot win, Four Pairs redeal, exhaustive 280-partition evaluation against 22,100 hand percentiles ($H_1 \ge H_2 \ge H_3$), and Salami risk alert. |
| **Dhumbal (Jhyap)** | 5 cards | Nepali Zero-Jack ($J=0, Q=10, K=10, A=1$), Flat-10, and Ascending scoring, multi-card sequence/set shedding, and undercut risk model (+25 penalty guard). |
| **Callbreak** | 13 cards | 5-step floor trick-counting bid calculator (trump power + backed side Aces) and real-time mandatory overtrump/upgrade play filter. |
| **Faras (Teen Patti)** | 3 cards | Exact 22,100 combination percentile ranking, calibrated to 2× Seen bet costs. |
| **In-Between** | 2 boundary cards | Exact single-deck spread win probability: $P(\text{Win}) = \frac{4 \times \max(0, R_{\text{high}} - R_{\text{low}} - 1)}{50}$ and expected value (EV) betting advice. |

---

## ⚡ Operational Ergonomics for Live Table Play

1. **One-Scan Setup, Tap-Play Turns**:
   - The player photographs their hand once at the start of the deal.
   - For all subsequent turns, the player taps **+ Draw Stock**, **+ Take Floor**, or **- Discard**, updating the solver recommendation in **<15ms** without lifting the camera at the table.
2. **1-Tap Card-Chip Matrix**:
   - Tapping any card chip allows 1-tap optical corrections ($A \leftrightarrow 4$, $\spadesuit \leftrightarrow \clubsuit$, $\heartsuit \leftrightarrow \diamondsuit$).
3. **Dual Viewfinder Overlays**:
   - Horizontal Fan Guide for 5–13 card hands.
   - Staggered 2-Row Guide (10 + 11) for 21-card Marriage hands.
4. **Offline Capability & Zero Database**:
   - Fully client-side operation with offline fallback demo hands and 52-card manual picker matrix.

---

## 🛠️ Quickstart

### Prerequisites
- Node.js 18+ (tested on Node 24)
- npm

### Installation & Development Server
```bash
# Install dependencies
npm install

# Run verification test suite (tests all 6 solvers against document benchmarks)
npm test

# Start local dev server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 🧪 Benchmark Verification Suite
Run `npm test` to execute the verification suite:
- **Jutpatti**: Instant winning pickup and declaration verification, live-outs discard safety.
- **Kitti**: Benchmark hand `[5H, 6H, 7H, 7S, 7D, KH, KD, 9C, 2S]` produces optimal 3×3 split ($5\heartsuit\text{-}6\heartsuit\text{-}7\heartsuit, K\heartsuit\text{-}K\diamondsuit\text{-}9\clubsuit, 7\spadesuit\text{-}7\diamondsuit\text{-}2\spadesuit$) achieving **94.3% pot win equity**.
- **Marriage**: 3 pure sequences Phase 1 detection, Poplu/Jhiplu/Alter Maal values.
- **Dhumbal**: Zero-Jack sum (sum=5), Jhyap call threshold, and 3-card sequence throw.
- **Callbreak**: Floor bidding (5 tricks from 5.75 raw score) and mandatory upgrade enforcement.
- **Faras & In-Between**: Trail 99.7% equity and In-Between spread probability.
