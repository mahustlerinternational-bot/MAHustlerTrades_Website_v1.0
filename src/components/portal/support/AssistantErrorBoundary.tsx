'use client';

import {Component,type ErrorInfo,type ReactNode} from 'react';

type Props={children:ReactNode};
type State={failed:boolean};

export default class AssistantErrorBoundary extends Component<Props,State>{
  state:State={failed:false};

  static getDerivedStateFromError():State{return {failed:true};}

  componentDidCatch(error:Error,info:ErrorInfo){
    console.error('[AssistantWidget] isolated runtime error',error,info);
  }

  render(){
    if(this.state.failed){
      return <button onClick={()=>this.setState({failed:false})} aria-label="Retry MAHustler Assistant" style={{position:'fixed',right:'22px',bottom:'22px',zIndex:90,border:'1px solid rgba(212,175,55,.45)',background:'#171000',color:'#D4AF37',padding:'11px 14px',fontSize:'.65rem',cursor:'pointer'}}>Retry Support Chat</button>;
    }
    return this.props.children;
  }
}
