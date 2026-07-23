'use client';

import {BellRing, Volume2, VolumeX, Wifi, WifiOff} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {toast} from 'sonner';

import {supabase} from '@/lib/supabase/client';
import {mergeSignalSnapshots, unseenReleasedSignals} from '@/lib/quant/liveSignal';
import {authFetch} from '@/lib/utils/authFetch';
import type {QuantSignal} from '@/types';
import SignalHistoryPanel from './SignalHistoryPanel';

const SOUND_PREFERENCE_KEY = 'maht-live-signal-sound';

function signalLabel(signal: QuantSignal) {
  return `${signal.instrument} ${signal.signal_type === 'long' ? 'BUY' : 'SELL'}`;
}

export default function LiveSignalWorkspace({
  initialSignal,
  initialSignals,
}: {
  initialSignal: QuantSignal | null;
  initialSignals: QuantSignal[];
}) {
  const seededSignals = useMemo(
    () => mergeSignalSnapshots(initialSignals, initialSignal ? [initialSignal] : []),
    [initialSignal, initialSignals],
  );
  const [signals, setSignals] = useState(seededSignals);
  const [connected, setConnected] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [notice, setNotice] = useState<QuantSignal | null>(null);
  const knownIds = useRef(new Set(seededSignals.map(signal => signal.id)));
  const inFlight = useRef(false);
  const alive = useRef(true);
  const audioContext = useRef<AudioContext | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const ensureAudio = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    const context = audioContext.current ?? new AudioContextConstructor();
    audioContext.current = context;
    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        setAudioReady(false);
        return null;
      }
    }
    const ready = context.state === 'running';
    setAudioReady(ready);
    return ready ? context : null;
  }, []);

  const playSpatialChime = useCallback(async () => {
    const context = await ensureAudio();
    if (!context) return false;
    const start = context.currentTime + 0.015;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.28;
    compressor.connect(context.destination);

    const master = context.createGain();
    master.gain.setValueAtTime(0.78, start);
    master.gain.exponentialRampToValueAtTime(0.0001, start + 2.45);
    master.connect(compressor);

    const reverb = context.createConvolver();
    const impulseLength = Math.floor(context.sampleRate * 1.7);
    const impulse = context.createBuffer(2, impulseLength, context.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < impulseLength; index += 1) {
        data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / impulseLength, 3.2);
      }
    }
    reverb.buffer = impulse;
    const wet = context.createGain();
    wet.gain.value = 0.24;
    reverb.connect(wet);
    wet.connect(master);

    const tones = [
      {frequency: 659.25, at: 0, pan: -0.62, duration: 1.35, gain: 0.20},
      {frequency: 830.61, at: 0.085, pan: 0.58, duration: 1.48, gain: 0.18},
      {frequency: 987.77, at: 0.19, pan: 0, duration: 1.62, gain: 0.15},
      {frequency: 1318.51, at: 0.32, pan: 0.32, duration: 1.7, gain: 0.08},
    ];
    for (const tone of tones) {
      const oscillator = context.createOscillator();
      oscillator.type = tone.frequency > 1000 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(tone.frequency, start + tone.at);
      oscillator.detune.setValueAtTime(-3, start + tone.at);
      oscillator.detune.linearRampToValueAtTime(2, start + tone.at + tone.duration);
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4800;
      filter.Q.value = 0.55;
      const panner = context.createStereoPanner();
      panner.pan.setValueAtTime(tone.pan, start + tone.at);
      panner.pan.linearRampToValueAtTime(-tone.pan * 0.35, start + tone.at + tone.duration);
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, start + tone.at);
      envelope.gain.exponentialRampToValueAtTime(tone.gain, start + tone.at + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + tone.duration);
      oscillator.connect(filter);
      filter.connect(panner);
      panner.connect(envelope);
      envelope.connect(master);
      envelope.connect(reverb);
      oscillator.start(start + tone.at);
      oscillator.stop(start + tone.at + tone.duration + 0.04);
    }
    window.setTimeout(() => {
      master.disconnect();
      compressor.disconnect();
      reverb.disconnect();
    }, 3000);
    return true;
  }, [ensureAudio]);

  const announce = useCallback((signal: QuantSignal) => {
    setNotice(signal);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 12_000);
    toast.success(`New ${signalLabel(signal)} signal released`, {
      description: `Entry ${signal.entry_price} · TP ${signal.tp_price} · SL ${signal.sl_price}`,
      duration: 12_000,
      icon: '⚡',
    });
    if (soundEnabled) void playSpatialChime();
  }, [playSpatialChime, soundEnabled]);

  const consumeSnapshot = useCallback((incoming: QuantSignal[]) => {
    const released = unseenReleasedSignals(incoming, knownIds.current);
    for (const signal of incoming) knownIds.current.add(signal.id);
    setSignals(current => mergeSignalSnapshots(current, incoming));
    if (released.length) announce(released[0]);
  }, [announce]);

  const poll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await authFetch('/api/quant/history?limit=100', {cache: 'no-store'});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Signal refresh failed');
      if (!alive.current) return;
      consumeSnapshot(Array.isArray(result.data) ? result.data : []);
      setConnected(true);
      setLastSync(new Date());
    } catch {
      if (alive.current) setConnected(false);
    } finally {
      inFlight.current = false;
    }
  }, [consumeSnapshot]);

  useEffect(() => {
    alive.current = true;
    const preferred = window.localStorage.getItem(SOUND_PREFERENCE_KEY) === 'on';
    setSoundEnabled(preferred);
    const armAfterGesture = () => {
      if (window.localStorage.getItem(SOUND_PREFERENCE_KEY) === 'on') void ensureAudio();
    };
    window.addEventListener('pointerdown', armAfterGesture, {once: true});

    void poll();
    const timer = window.setInterval(() => void poll(), 1_000);
    const channel = supabase
      .channel('member-live-signal-workspace')
      .on('postgres_changes', {event: '*', schema: 'public', table: 'quant_signals'}, payload => {
        const signal = payload.new as QuantSignal;
        if (signal?.id) consumeSnapshot([signal]);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setConnected(true);
      });

    return () => {
      alive.current = false;
      window.clearInterval(timer);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      window.removeEventListener('pointerdown', armAfterGesture);
      void supabase.removeChannel(channel);
    };
  }, [consumeSnapshot, ensureAudio, poll]);

  useEffect(() => () => {
    if (audioContext.current) void audioContext.current.close();
  }, []);

  async function toggleSound() {
    if (soundEnabled) {
      window.localStorage.setItem(SOUND_PREFERENCE_KEY, 'off');
      setSoundEnabled(false);
      setAudioReady(false);
      if (audioContext.current) {
        await audioContext.current.close();
        audioContext.current = null;
      }
      toast.info('Live signal sound disabled');
      return;
    }
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, 'on');
    setSoundEnabled(true);
    const played = await playSpatialChime();
    if (played) toast.success('Spatial signal chime enabled');
    else toast.warning('Audio is blocked. Tap the sound control again to enable it.');
  }

  const activeSignal =
    signals.find(signal => signal.status === 'active') ?? null;

  return (
    <>
      <section style={card}>
        <style>{`
          @keyframes signalNoticeIn{from{opacity:0;transform:translateY(-8px) scale(.99)}to{opacity:1;transform:none}}
          @keyframes signalHalo{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0)}50%{box-shadow:0 0 35px 2px rgba(212,175,55,.16)}}
          @media(max-width:640px){.live-signal-levels{grid-template-columns:1fr!important}.live-signal-controls{width:100%;justify-content:flex-start!important}}
        `}</style>
        {notice && (
          <div style={noticeBar}>
            <BellRing size={15} />
            <strong>NEW SIGNAL RELEASED</strong>
            <span>{signalLabel(notice)} · Entry {String(notice.entry_price)}</span>
          </div>
        )}
        <header style={cardHeader}>
          <div style={{display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap'}}>
            <span style={{width: 8, height: 8, borderRadius: '50%', background: activeSignal ? '#00D084' : '#555', animation: activeSignal ? 'pulse 1.5s infinite' : 'none'}} />
            <p style={title}>{activeSignal ? 'Live Signal Active' : 'Live Signal Scanner'}</p>
            {activeSignal && <strong style={{fontFamily: 'Cinzel,serif', fontSize: '.92rem'}}>{activeSignal.instrument}</strong>}
            {activeSignal && <span style={{...sideBadge, color: activeSignal.signal_type === 'long' ? '#00D084' : '#FF4757'}}>{activeSignal.signal_type.toUpperCase()}</span>}
          </div>
          <div className="live-signal-controls" style={controls}>
            <span style={{...syncBadge, color: connected ? '#34D399' : '#F59E0B'}}>
              {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {connected ? '1S LIVE' : 'RECONNECTING'}
            </span>
            <button onClick={() => void toggleSound()} style={{...soundButton, color: soundEnabled && audioReady ? '#D4AF37' : '#777'}}>
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {soundEnabled ? (audioReady ? 'SOUND ARMED' : 'TAP TO ARM') : 'ENABLE CHIME'}
            </button>
          </div>
        </header>

        {activeSignal ? (
          <div style={{padding: '16px 18px 18px'}}>
            <div className="live-signal-levels" style={levels}>
              {[
                {label: 'TP', value: activeSignal.tp_price, color: '#00D084', background: 'rgba(0,208,132,.06)'},
                {label: 'ENTRY', value: activeSignal.entry_price, color: '#FFD700', background: 'rgba(212,175,55,.08)'},
                {label: 'SL', value: activeSignal.sl_price, color: '#FF4757', background: 'rgba(255,71,87,.06)'},
              ].map(level => (
                <div key={level.label} style={{...levelCard, background: level.background, borderLeftColor: level.color}}>
                  <span style={{color: level.color}}>{level.label}</span>
                  <strong style={{color: level.color}}>{String(level.value)}</strong>
                </div>
              ))}
            </div>
            <div style={meta}>
              <span>Released {new Date(activeSignal.broadcasted_at).toLocaleString('en-GB', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'})}</span>
              <span>{activeSignal.rr_ratio == null ? 'R:R —' : `R:R ${Number(activeSignal.rr_ratio).toFixed(2)}`}</span>
              <span>{activeSignal.risk_pct == null ? 'Risk —' : `Risk ${Number(activeSignal.risk_pct).toFixed(2)}%`}</span>
            </div>
          </div>
        ) : (
          <div style={empty}>
            <span style={{fontSize: '1.55rem'}}>📡</span>
            <strong>No active signal right now</strong>
            <span>The scanner checks for a new release every second.</span>
          </div>
        )}
        <footer style={footer}>
          Last synchronized: {lastSync ? lastSync.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'}) : 'starting…'}
          <span>·</span>
          Realtime + 1-second authenticated fallback
        </footer>
      </section>
      <SignalHistoryPanel signals={signals} />
    </>
  );
}

const card: React.CSSProperties = {background: 'linear-gradient(135deg,rgba(212,175,55,.065),rgba(17,17,17,.98))', border: '1px solid rgba(212,175,55,.25)', marginBottom: '2rem', overflow: 'hidden', animation: 'signalHalo 4s ease-in-out infinite'};
const noticeBar: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '10px 14px', background: 'linear-gradient(90deg,rgba(184,134,11,.18),rgba(212,175,55,.28),rgba(184,134,11,.18))', color: '#FFD95A', borderBottom: '1px solid rgba(212,175,55,.3)', fontSize: '.58rem', letterSpacing: '1.2px', animation: 'signalNoticeIn .35s ease both', flexWrap: 'wrap'};
const cardHeader: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.05)', flexWrap: 'wrap'};
const title: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.6rem', letterSpacing: '2.5px', color: '#D4AF37', textTransform: 'uppercase'};
const sideBadge: React.CSSProperties = {fontSize: '.52rem', padding: '3px 7px', border: '1px solid currentColor', letterSpacing: '1px'};
const controls: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '7px', flexWrap: 'wrap'};
const syncBadge: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '.48rem', letterSpacing: '1.2px'};
const soundButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#090909', border: '1px solid rgba(212,175,55,.18)', padding: '7px 9px', fontFamily: 'inherit', fontSize: '.47rem', letterSpacing: '.8px', cursor: 'pointer'};
const levels: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '7px'};
const levelCard: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '9px', padding: '11px 13px', borderLeft: '3px solid', fontFamily: 'JetBrains Mono,monospace', fontSize: '.66rem'};
const meta: React.CSSProperties = {display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#5D5D5D', fontSize: '.52rem', marginTop: '11px'};
const empty: React.CSSProperties = {minHeight: 125, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '7px', color: '#666', fontSize: '.62rem', textAlign: 'center'};
const footer: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', padding: '8px 18px', borderTop: '1px solid rgba(255,255,255,.04)', color: '#4E4E4E', fontSize: '.47rem'};

