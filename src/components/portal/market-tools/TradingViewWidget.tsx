'use client';

import {AlertTriangle, ExternalLink, Loader2} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

interface TradingViewWidgetProps {
  scriptUrl: string;
  config: Record<string, unknown>;
  height?: number;
  label: string;
  attributionUrl: string;
}

export default function TradingViewWidget({
  scriptUrl,
  config,
  height = 620,
  label,
  attributionUrl,
}: TradingViewWidgetProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const serializedConfig = JSON.stringify(config);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setStatus('loading');
    host.replaceChildren();

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.width = '100%';
    widget.style.height = '100%';
    host.appendChild(widget);

    const observer = new MutationObserver(() => {
      if (host.querySelector('iframe')) {
        setStatus('ready');
        observer.disconnect();
      }
    });
    observer.observe(host, {childList: true, subtree: true});

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptUrl;
    script.async = true;
    script.text = serializedConfig;
    script.onerror = () => setStatus('error');
    host.appendChild(script);

    const timeout = window.setTimeout(() => {
      if (!host.querySelector('iframe')) setStatus('error');
    }, 15_000);

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      host.replaceChildren();
    };
  }, [scriptUrl, serializedConfig]);

  return (
    <div style={{position: 'relative', height, minHeight: 420, background: '#0D0D0D', overflow: 'hidden'}}>
      {status === 'loading' && (
        <div style={overlay}>
          <Loader2 size={24} color="#D4AF37" style={{animation: 'marketToolSpin .8s linear infinite'}} />
          <span>Loading live market data…</span>
        </div>
      )}
      {status === 'error' && (
        <div style={overlay}>
          <AlertTriangle size={25} color="#F59E0B" />
          <strong style={{fontFamily: 'Cinzel,serif', color: '#fff'}}>Widget Could Not Load</strong>
          <span>Your browser or network may be blocking TradingView.</span>
          <a href={attributionUrl} target="_blank" rel="noopener nofollow" style={externalLink}>
            Open {label} on TradingView <ExternalLink size={12} />
          </a>
        </div>
      )}
      <div
        ref={hostRef}
        className="tradingview-widget-container"
        style={{height: 'calc(100% - 28px)', width: '100%', visibility: status === 'error' ? 'hidden' : 'visible'}}
      />
      <div style={attribution}>
        <a href={attributionUrl} target="_blank" rel="noopener nofollow" style={{color: '#8FAFE8', textDecoration: 'none'}}>
          {label}
        </a>
        <span> by TradingView</span>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  color: '#777',
  fontSize: '.7rem',
  background: '#0D0D0D',
  textAlign: 'center',
  padding: '24px',
};

const attribution: React.CSSProperties = {
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  color: '#555',
  fontSize: '10px',
  background: '#0D0D0D',
};

const externalLink: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  marginTop: '4px',
  color: '#D4AF37',
  textDecoration: 'none',
  border: '1px solid rgba(212,175,55,.25)',
  padding: '8px 12px',
};

