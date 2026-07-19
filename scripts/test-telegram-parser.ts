import assert from 'node:assert/strict';
import {parseTelegramPost} from '../src/lib/integrations/telegramParser';

const sample=`**1/12 — SYSTEM ONLINE**
🤖 **QUANT-SWARM-XAU v3.0**
⚡ **21 AI Agents Initialized**
📡 **MT5 Connected:** XAUUSDm
💰 **Balance:** $10,726.70
🔁 **Market Regime:** Ranging Tight
🌍 **Session:** London
**2/12 — BUY TRADE OPENED**
🧈 **XAUUSD** 🧈
📈 **BUY SIGNAL OPENED**
🟢 **ENTRY:** 4108.340
🎯 **TP1:** 4116.780
🎯 **TP2:** 4124.200
🎯 **TP3:** 4132.000
🛑 **STOP LOSS:** 4100.120
📦 **Lot Size:** 0.07
📊 **Confluence:** 82.4%
🏷 **Setup Tags:** ICT_OB + CRT_SWEEP + VOL_SURGE
**3/12 — SELL TRADE OPENED**
🧈 **XAUUSD** 🧈
📉 **SELL SIGNAL OPENED**
🔴 **ENTRY:** 4124.880
🎯 **TP1:** 4116.440
🎯 **TP2:** 4108.000
🎯 **TP3:** 4098.500
🛑 **STOP LOSS:** 4133.200
**4/12 — POSITIONS OPENED**
📊 **POSITIONS OPENED**
📈 **Direction:** BUY
🎯 **Entry:** 4108.340
**5/12 — TP1 HIT / BREAKEVEN SET**
🎫 **Ticket:** #1848244917
📈 **Entry:** 4108.340
✅ **TP1 Reached:** 4116.780
**6/12 — TRADE CLOSED IN PROFIT**
🧈 **XAUUSD BUY**
🎫 **Ticket:** #1848244917
🎯 **Entry:** 4108.340
🏁 **Exit:** 4124.200
💰 **Profit:** +$11.06
📊 **Result:** +1.35R
🏷 **Exit Reason:** TP2
**7/12 — TRADE CLOSED IN LOSS**
🧈 **XAUUSD SELL**
🎫 **Ticket:** #1848244918
🎯 **Entry:** 4124.880
🏁 **Exit:** 4133.200
💸 **Loss:** -$10.73
📊 **Result:** -1.00R
🏷 **Exit Reason:** Stop Loss
**8/12 — REGIME SHIFT DETECTED**
📊 **Previous Regime:** Ranging Tight
📈 **New Regime:** Trending Bull
**9/12 — DAILY HALT TRIGGERED**
📉 **Reason:** Daily loss limit reached
📊 **Drawdown:** 3.0%
💸 Daily Loss: -$320.80
**10/12 — MT5 DISCONNECTED**
🔌 **Status:** TCP connection lost
**11/12 — MT5 RECONNECTED**
🔌 **Status:** TCP connection restored
💰 **Equity:** $10,726.70
**12/12 — DAILY SUMMARY**
📊 **Trades Executed:** 4
✅ **Winning Trades:** 3
🛑 **Losing Trades:** 1
💰 **NET P&L:** +$24.18
📊 **BEST RESULT:** +1.85R
📊 **WIN RATE:** 75.0%
⚡ **Signals Evaluated:** 847`;

const events=parseTelegramPost(sample);
assert.equal(events.length,12);
assert.equal(events[0].category,'system');
assert.equal(events[1].normalized?.action,'open_signal');
assert.equal(events[1].normalized?.signal_type,'long');
assert.equal(events[1].normalized?.tp3,4132);
assert.equal(events[2].normalized?.signal_type,'short');
assert.equal(events[5].normalized?.action,'close_signal');
assert.equal(events[5].normalized?.result_r,1.35);
assert.equal(events[6].normalized?.status,'closed_sl');
assert.equal(events[7].normalized?.action,'regime');
assert.equal(events[8].category,'risk');
assert.equal(events[9].severity,'critical');
assert.equal(events[10].severity,'success');
assert.equal(events[11].metrics.net_pnl,24.18);
assert.equal(events[11].metrics.win_rate_pct,75);
console.log('Telegram parser: 12/12 templates passed');
