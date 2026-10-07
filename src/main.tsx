import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { recordError } from './storage';
import './style.css';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){recordError('react_render_error');}
  render(){return this.state.failed?<main className="fallback"><h1>GradeDock</h1><p>Не удалось открыть экран. Данные остаются на устройстве.<br/>The screen could not open. Your saved data stays on the device.</p><button onClick={()=>location.reload()}>Перезапустить / Reload</button></main>:this.props.children;}
}
window.addEventListener('error',()=>recordError('window_error'));
window.addEventListener('unhandledrejection',()=>recordError('unhandled_rejection'));
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
