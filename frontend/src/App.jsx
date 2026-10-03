import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Host from './pages/Host';
import Participant from './pages/Participant';
import Create from './pages/Create';
import TopicDetail from './pages/TopicDetail';
import QuizDetail from './pages/QuizDetail';
import Ladder from './pages/Ladder';
import TimeAttack from './pages/TimeAttack';
import SpotDifference from './pages/SpotDifference';
import Fortune from './pages/Fortune';
import CardGame from './pages/CardGame';
import ScreenView from './pages/ScreenView';
import { io } from 'socket.io-client';
import { GlobalSessionProvider } from './context/GlobalSessionContext';
import RightSidebar from './components/RightSidebar';
import ScrollToTop from './utils/ScrollToTop';

const socket = io({
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
  timeout: 10000
});

// Auto-reconnect when mobile screen turns back on or browser tab gains focus
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (!socket.connected || socket.disconnected)) {
      console.log('[Mobile Wakeup] Screen active, reconnecting socket...');
      socket.connect();
    }
  });
  window.addEventListener('focus', () => {
    if (!socket.connected || socket.disconnected) {
      console.log('[Window Focus] Reconnecting socket...');
      socket.connect();
    }
  });
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    socket.emit('room:clientError', {
      error: error.toString(),
      info: errorInfo
    });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: 'white', height: '100vh' }}>
          <h1>오류가 발생했습니다 (Error)</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()}>다시 시도</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppLayout({ socket, isMobileMode, setIsMobileMode }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Detect if this window is the Sub-Monitor screen
  const isSubScreen = Boolean(
    window.location.pathname.startsWith('/screen') ||
    window.location.search.includes('subscreen=true') ||
    window.location.search.includes('mirror=true') ||
    window.name === 'QuizrunSubScreenWindow' ||
    window.name === 'QuizrunScreenWindow' ||
    sessionStorage.getItem('is_subscreen') === 'true'
  );

  useEffect(() => {
    if (isSubScreen) {
      sessionStorage.setItem('is_subscreen', 'true');
    }
  }, [isSubScreen]);

  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Request sync ONCE on mount for subscreen
  useEffect(() => {
    if (isSubScreen) {
      try {
        const navBc = new BroadcastChannel('quizrun_nav_sync');
        navBc.postMessage({ type: 'REQUEST_SYNC' });
        setTimeout(() => navBc.close(), 300);
      } catch (e) {}
    }
  }, [isSubScreen]);

  // Real-time synchronization between Main Window (Leader) and Sub-Monitor (Follower)
  useEffect(() => {
    let navBc;
    try {
      navBc = new BroadcastChannel('quizrun_nav_sync');

      const handleMsg = (e) => {
        const { type, path, state } = e.data || {};
        if (!isSubScreen) {
          // --- LEADER: Main Window ---
          if (type === 'REQUEST_SYNC') {
            navBc.postMessage({
              type: 'NAV_CHANGE',
              path: locationRef.current.pathname + locationRef.current.search
            });
          } else if (type === 'REQUEST_MAIN_NAV' && path) {
            navigate(path, { state });
          }
        } else {
          // --- FOLLOWER: Sub-Monitor Window ---
          if (type === 'NAV_CHANGE' && path) {
            let targetPath = path;
            if (path.startsWith('/host')) {
              targetPath = '/screen?subscreen=true';
            } else if (path.startsWith('/ladder')) {
              targetPath = '/ladder?mirror=true&subscreen=true';
            } else if (path.startsWith('/spot-difference')) {
              targetPath = '/spot-difference?mirror=true&subscreen=true';
            } else if (path.startsWith('/timeattack')) {
              targetPath = '/timeattack?subscreen=true';
            } else if (path.startsWith('/fortune')) {
              targetPath = '/fortune?subscreen=true';
            } else if (path.startsWith('/card-game')) {
              targetPath = '/card-game?subscreen=true';
            } else if (path === '/' || path.startsWith('/?')) {
              targetPath = '/?subscreen=true';
            } else {
              targetPath = path.includes('?') ? `${path}&subscreen=true` : `${path}?subscreen=true`;
            }

            const currentFullPath = locationRef.current.pathname + locationRef.current.search;
            if (currentFullPath !== targetPath) {
              navigate(targetPath, { replace: true });
            }
          }
        }
      };

      navBc.onmessage = handleMsg;
      return () => {
        navBc.close();
      };
    } catch (e) {}
  }, [isSubScreen, navigate]);

  // When Leader's route changes, broadcast to Follower
  useEffect(() => {
    if (!isSubScreen) {
      try {
        const navBc = new BroadcastChannel('quizrun_nav_sync');
        navBc.postMessage({
          type: 'NAV_CHANGE',
          path: location.pathname + location.search
        });
        setTimeout(() => navBc.close(), 300);
      } catch (e) {}
    }
  }, [isSubScreen, location.pathname, location.search]);

  const isParticipant = location.pathname.startsWith('/participant');
  const isHost = location.pathname.startsWith('/host');
  const isScreen = location.pathname.startsWith('/screen');
  const isMirror = new URLSearchParams(location.search).get('mirror') === 'true';
  const showSidebar = !isParticipant && !isHost;

  return (
    <>
      <ScrollToTop />
      <div style={{ display: 'flex', width: '100%', minHeight: '100vh', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Routes>
            <Route path="/" element={<Home socket={socket} />} />
            <Route path="/create" element={<Create socket={socket} />} />
            <Route path="/host" element={<Host socket={socket} />} />
            <Route path="/screen" element={<ScreenView socket={socket} />} />
            <Route path="/participant" element={<Participant socket={socket} />} />
            <Route path="/topic/:id" element={<TopicDetail socket={socket} />} />
            <Route path="/quiz/:topicId/:subId" element={<QuizDetail socket={socket} />} />
            <Route path="/ladder" element={<Ladder socket={socket} />} />
            <Route path="/timeattack" element={<TimeAttack />} />
            <Route path="/spot-difference" element={<SpotDifference socket={socket} />} />
            <Route path="/fortune" element={<Fortune socket={socket} />} />
            <Route path="/card-game" element={<CardGame socket={socket} />} />
          </Routes>
        </div>
        {showSidebar && <RightSidebar socket={socket} />}
      </div>

      {/* Floating Mobile View Toggle Icon (only on PC / non-participant / non-screen / non-mirror / non-subscreen) */}
      {!isParticipant && !isScreen && !isMirror && !isSubScreen && (
        <button 
          className="view-toggle-btn"
          onClick={() => setIsMobileMode(!isMobileMode)}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            right: 'auto',
            width: 'auto',
            padding: '8px 14px',
            fontSize: '0.84rem',
            borderRadius: '20px',
            zIndex: 99999,
            background: isMobileMode ? 'var(--primary)' : 'rgba(255, 255, 255, 0.95)',
            color: isMobileMode ? 'white' : 'var(--text)',
            border: '2px solid var(--primary)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer'
          }}
          title="화면 보기 방식 전환"
        >
          📱 {isMobileMode ? 'PC 화면 뷰' : '모바일 뷰'}
        </button>
      )}
    </>
  );
}

function App() {
  const [isMobileMode, setIsMobileMode] = useState(false);

  return (
    <ErrorBoundary>
      <GlobalSessionProvider socket={socket}>
        <Router>
          <div className={isMobileMode ? "simulator-container" : "simulator-pc"}>
            <div className={isMobileMode ? "simulator-mobile" : ""}>
              <AppLayout socket={socket} isMobileMode={isMobileMode} setIsMobileMode={setIsMobileMode} />
            </div>
          </div>
        </Router>
      </GlobalSessionProvider>
    </ErrorBoundary>
  );
}

export default App;