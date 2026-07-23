'use client';

import {AlertTriangle, Loader2} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

const SCRIPT_ID = 'tradingview-forex-table-script';
const SCRIPT_URL = 'https://widgets.tradingview-widget.com/w/en/tv-forex-table.js';

export default function ForexHeatmap() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();

    const table = document.createElement('tv-forex-table');
    table.setAttribute('displayed-value', 'dailyChange');
    table.setAttribute('heatmap', '');
    table.style.display = 'block';
    table.style.width = '100%';
    table.style.height = '100%';
    host.appendChild(table);

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'module';
      script.src = SCRIPT_URL;
      script.onerror = () => setFailed(true);
      document.head.appendChild(script);
    }

    const timeout = window.setTimeout(() => {
      if (!customElements.get('tv-forex-table')) setFailed(true);
    }, 15_000);

    return () => {
      window.clearTimeout(timeout);
      host.replaceChildren();
    };
  }, []);

  return (
    <div style={{height: 620, minHeight: 440, position: 'relative', background: '#0D0D0D'}}>
      <div ref={hostRef} style={{height: '100%', width: '100%'}} />
      {!failed ? (
        <div style={loading}><Loader2 size={22} style={{animation: 'marketToolSpin .8s linear infinite'}} /> Loading forex strength…</div>
      ) : (
        <div style={{...loading, zIndex: 2, background: '#0D0D0D'}}>
          <AlertTriangle size={24} color="#F59E0B" />
          Forex heatmap was blocked by the browser or network.
          <a href="https://www.tradingview.com/markets/currencies/cross-rates-overview-heat-map/" target="_blank" rel="noopener nofollow" style={{color: '#D4AF37'}}>Open on TradingView</a>
        </div>
      )}
    </div>
  );
}

const loading: React.CSSProperties = {
  position: 'absolute',
  zIndex: -1,
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '10px',
  color: '#777',
  fontSize: '.68rem',
};
