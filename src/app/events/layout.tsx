import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'Elite Trading Events | MAHustler Trades',
  description:'Explore MAHustler live trading rooms, market reviews, masterclasses, workshops, and Elite member events.',
};

export default function EventsLayout({children}:{children:React.ReactNode}){
  return children;
}
