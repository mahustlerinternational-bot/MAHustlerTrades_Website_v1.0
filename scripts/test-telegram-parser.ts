import assert from 'node:assert/strict';
import {parseTelegramPost} from '../src/lib/integrations/telegramParser';
import {
  formatSignalEntryZone,
  signalOutcomeLabel,
  signalDisplayLevels,
  signalLevelProgress,
} from '../src/lib/quant/signalLevels';
import {inboundTelegramPost} from '../src/lib/integrations/telegramUpdate';

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
assert.equal(events[5].normalized?.outcome,'tp2_hit');
assert.equal(events[6].normalized?.status,'closed_sl');
assert.equal(events[6].normalized?.outcome,'sl_hit');
assert.equal(events[7].normalized?.action,'regime');
assert.equal(events[8].category,'risk');
assert.equal(events[9].severity,'critical');
assert.equal(events[10].severity,'success');
assert.equal(events[11].metrics.net_pnl,24.18);
assert.equal(events[11].metrics.win_rate_pct,75);

const currentEaBuy=`🧈 XAUUSD 🧈
📉 BUY SIGNAL 📉

🟢 ENTRY ZONE: 4025 - 4024 🟢

📉 TP1: 4029 💰
📉 TP2: 4034 💰
📉 TP3: 4039 💰
📉 TP OPEN 💰

🛑 STOP LOSS: 4019 🛑

🚨 Use Proper Risk Management 🚨
⚠️ Not a financial advice. Trading is risky! ⚠️   r`;

const currentEaSell=`🧈 XAUUSD 🧈
📈 SELL SIGNAL 📈

🟢 ENTRY ZONE: 4023 - 4024 🟢

📈 TP1: 4018 💰
📈 TP2: 4013 💰
📈 TP3: 4008 💰
📈 TP OPEN 💰

🛑 STOP LOSS: 4028 🛑

🚨 Use Proper Risk Management 🚨
⚠️ Not a financial advice. Trading is risky! ⚠️`;

const [buy]=parseTelegramPost(currentEaBuy);
assert.equal(buy.category,'signal');
assert.equal(buy.normalized?.action,'open_signal');
assert.equal(buy.normalized?.signal_type,'long');
assert.equal(buy.normalized?.entry,4024.5);
assert.deepEqual(buy.normalized?.entry_zone,{low:4024,high:4025});
assert.equal(buy.normalized?.tp1,4029);
assert.equal(buy.normalized?.tp2,4034);
assert.equal(buy.normalized?.tp3,4039);
assert.equal(buy.normalized?.sl,4019);

const [sell]=parseTelegramPost(currentEaSell);
assert.equal(sell.category,'signal');
assert.equal(sell.normalized?.signal_type,'short');
assert.equal(sell.normalized?.entry,4023.5);
assert.deepEqual(sell.normalized?.entry_zone,{low:4023,high:4024});
assert.equal(sell.normalized?.tp1,4018);
assert.equal(sell.normalized?.tp2,4013);
assert.equal(sell.normalized?.tp3,4008);
assert.equal(sell.normalized?.sl,4028);

const display=signalDisplayLevels({
  entry_price:buy.normalized!.entry!,
  tp_price:buy.normalized!.tp1!,
  sl_price:buy.normalized!.sl!,
  metadata:{
    entry_zone:buy.normalized!.entry_zone!,
    take_profits:[buy.normalized!.tp1,buy.normalized!.tp2,buy.normalized!.tp3],
  },
});
assert.equal(formatSignalEntryZone('XAUUSD',display.entryZone),'4,024.00 – 4,025.00');
assert.deepEqual(display.takeProfits,[4029,4034,4039]);
assert.equal(signalOutcomeLabel({status:'active',metadata:{latest_outcome:'tp2_hit'}}),'TP2 HIT');
assert.equal(signalOutcomeLabel({status:'closed_sl',metadata:{}}),'SL HIT');
assert.deepEqual(
  signalLevelProgress({status:'active',metadata:{latest_outcome:'tp2_hit',hit_targets:[1,2]}}),
  {takeProfits:[true,true,false],stopLoss:false},
);
assert.deepEqual(
  signalLevelProgress({status:'closed_tp',metadata:{latest_outcome:'tp3_hit',hit_targets:[1,2,3]}}),
  {takeProfits:[true,true,true],stopLoss:false},
);
assert.deepEqual(
  signalLevelProgress({status:'closed_sl',metadata:{latest_outcome:'sl_hit',hit_targets:[1]}}),
  {takeProfits:[true,false,false],stopLoss:true},
);

const [tp1Update]=parseTelegramPost(`🎯 TP1 HIT — BREAKEVEN SECURED 🎯
🧈 XAUUSD BUY 🧈
🎫 Ticket: #1848244917
📈 Entry: 4108.340
✅ TP1 Reached: 4116.780`);
assert.equal(tp1Update.normalized?.action,'update_signal');
assert.equal(tp1Update.normalized?.outcome,'tp1_hit');
assert.equal(tp1Update.normalized?.outcome_price,4116.78);
assert.equal(tp1Update.normalized?.ticket,'1848244917');

const [tp2Update]=parseTelegramPost(`🎯 TP2 HIT 🎯
🧈 XAUUSD BUY 🧈
🎫 Ticket: #1848244917
📈 Entry: 4108.340
✅ TP2 Reached: 4124.200`);
assert.equal(tp2Update.normalized?.action,'update_signal');
assert.equal(tp2Update.normalized?.outcome,'tp2_hit');
assert.equal(tp2Update.normalized?.outcome_price,4124.2);

const [tp3Update]=parseTelegramPost(`🎯 TP3 REACHED 🎯
🧈 XAUUSD BUY 🧈
🎫 Ticket: #1848244917
📈 Entry: 4108.340
✅ TP3 Reached: 4132.000`);
assert.equal(tp3Update.normalized?.action,'update_signal');
assert.equal(tp3Update.normalized?.outcome,'tp3_hit');
assert.equal(tp3Update.normalized?.outcome_price,4132);

const [slUpdate]=parseTelegramPost(`🛑 STOP LOSS HIT 🛑
🧈 XAUUSD SELL 🧈
🎫 Ticket: #1848244918
📈 Entry: 4124.880
🏁 Exit: 4133.200`);
assert.equal(slUpdate.normalized?.action,'update_signal');
assert.equal(slUpdate.normalized?.outcome,'sl_hit');
assert.equal(slUpdate.normalized?.outcome_price,4133.2);

const [realTp1Update]=parseTelegramPost(`XAUUSD SIGNAL
🎯 Congrats we just Hit!  TP1! - 50 Pips Smashed!`);
assert.equal(realTp1Update.category,'trade_update');
assert.equal(realTp1Update.normalized?.action,'update_signal');
assert.equal(realTp1Update.normalized?.outcome,'tp1_hit');

const [realTp2Update]=parseTelegramPost(`XAUUSD SIGNAL
🎯 Congrats we just Hit!  TP2! - 100 Pips Smashed!

Move your BE at TP1 to Lock in Profits!`);
assert.equal(realTp2Update.normalized?.outcome,'tp2_hit');

const [realTp3Update]=parseTelegramPost(`🎯 Congrats we just Hit!  TP3! - 150 Pips Smashed!`);
assert.equal(realTp3Update.normalized?.outcome,'tp3_hit');

const [realRiskUpdate]=parseTelegramPost(`XAUUSD SIGNAL:

😰Sorry it Hit our Risk! Let's Focus on the Next Setup!💪`);
assert.equal(realRiskUpdate.category,'trade_update');
assert.equal(realRiskUpdate.severity,'critical');
assert.equal(realRiskUpdate.normalized?.action,'update_signal');
assert.equal(realRiskUpdate.normalized?.outcome,'sl_hit');

const [breakevenUpdate]=parseTelegramPost(`XAUUSD SIGNAL
Trade closed at breakeven.`);
assert.equal(breakevenUpdate.normalized?.outcome,'breakeven');

const [entryCloseUpdate]=parseTelegramPost(`XAUUSD SIGNAL
Price returned to the entry zone. Signal closed.`);
assert.equal(entryCloseUpdate.normalized?.outcome,'entry_close');

const [beInstruction]=parseTelegramPost(`Move your BE at TP1 to lock in profits.`);
assert.equal(beInstruction.normalized,undefined);

const [dailySummary]=parseTelegramPost(`DAILY SUMMARY
TP1 Hits: 4
TP2 Hits: 2
TP3 Hits: 1
BE Hits: 1`);
assert.equal(dailySummary.normalized,undefined);

assert.equal(signalOutcomeLabel({status:'closed_manual',metadata:{latest_outcome:'breakeven'}}),'BREAKEVEN');
assert.equal(signalOutcomeLabel({status:'closed_manual',metadata:{latest_outcome:'entry_close'}}),'ENTRY CLOSE');

const supergroupMessage={
  update_id:1,
  message:{message_id:10,date:1,text:currentEaBuy,chat:{id:-1002564548970,type:'supergroup'}},
};
const inboundSupergroup=inboundTelegramPost(supergroupMessage);
assert.equal(inboundSupergroup?.post.message_id,10);
assert.equal(inboundSupergroup?.edited,false);

const channelPost={
  update_id:2,
  channel_post:{message_id:11,date:1,text:currentEaSell,chat:{id:-100123,type:'channel'}},
};
const inboundChannel=inboundTelegramPost(channelPost);
assert.equal(inboundChannel?.post.message_id,11);
assert.equal(inboundChannel?.edited,false);

const privateMessage={
  update_id:3,
  message:{message_id:12,date:1,text:'hello',chat:{id:123,type:'private'}},
};
assert.equal(inboundTelegramPost(privateMessage),null);

console.log('Telegram parser and signal outcome templates passed');
