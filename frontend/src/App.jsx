import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Host from './pages/Host';
import Participant from './pages/Participant';
import Create from './pages/Create';
import TopicDetail from './pages/TopicDetail';
import QuizDetail from './pages/QuizDetail';
import { io } from 'socket.io-client';

const socket = io(`http://${window.location.hostname}:3001`);

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

import ScrollToTop from './utils/ScrollToTop';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home socket={socket} />} />
          <Route path="/create" element={<Create socket={socket} />} />
          <Route path="/host" element={<Host socket={socket} />} />
          <Route path="/participant" element={<Participant socket={socket} />} />
          <Route path="/topic/:id" element={<TopicDetail socket={socket} />} />
          <Route path="/quiz/:topicId/:subId" element={<QuizDetail socket={socket} />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
