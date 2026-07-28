import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'Quant AI Signal Intelligence | MAHustler Trades',
  description:'Understand the MAHustler XAUUSD signal lifecycle, entry zones, TP1–TP3 outcomes, risk levels, and multi-channel member updates.',
};

export default function QuantLayout({children}:{children:React.ReactNode}){
  return children;
}
