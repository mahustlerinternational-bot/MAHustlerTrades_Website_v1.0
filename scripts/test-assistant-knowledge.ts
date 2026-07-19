import assert from 'node:assert/strict';
import {BUILT_IN_TOPIC_COUNT,localKnowledgeAnswer,type SupportContext} from '../src/lib/support/knowledge';

const context:SupportContext={name:'Maria',role:'ib_member',ibStatus:'active',ibApplication:'approved',telegramLinked:true,discordLinked:false,hasTelegramInvite:true,hasDiscordInvite:true};
const cases:Array<[string,RegExp]>=[
  ['How do I apply for an IB broker account?',/IB Access|approved broker/i],
  ['What is the status of my IB application?',/active.*approved/i],
  ['Can I change my Telegram account?',/disconnect|replacement/i],
  ['How do I verify Discord?',/authorize|OAuth|Connect Discord/i],
  ['Where is my signal history?',/Signal History/i],
  ['Show daily weekly monthly performance',/Daily, weekly, and monthly/i],
  ['My Ziina payment finished but access is missing',/transaction reference/i],
  ['How can I enroll in academy lessons?',/My Courses/i],
  ['I need to speak with a human admin',/Contact Admin/i],
  ['Does this local assistant make paid API calls?',/no model API calls/i],
];
for(const [question,expected] of cases){const answer=localKnowledgeAnswer(question,context);assert.match(answer,expected,`${question} -> ${answer}`);}
const custom=localKnowledgeAnswer('What time is the Dubai support desk open?',context,'dubai support desk hours | The Dubai support desk is open from 9 AM to 6 PM.');
assert.match(custom,/9 AM to 6 PM/);
assert.ok(BUILT_IN_TOPIC_COUNT>=30);
console.log(`Local assistant knowledge: ${cases.length} intents + custom knowledge passed across ${BUILT_IN_TOPIC_COUNT} built-in topics`);
