const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  console.log('--- Network Interfaces Logic ---');
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`[Interface] ${name}: ${iface.address}`);
        candidates.push(iface.address);
      }
    }
  }
  // Prioritize 192.168.x.x (common home Wi-Fi) 
  // then 10.x.x.x (common institutional Wi-Fi)
  // then others
  const best = candidates.find(ip => ip.startsWith('192.168.')) || 
               candidates.find(ip => ip.startsWith('10.')) || 
               candidates[0] || 
               'localhost';
  
  console.log(`[Summary] Using IP: ${best}`);
  console.log('-------------------------------');
  return best;
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const MOCK_QUIZZES = {
  'general': {
    title: '일반 상식 퀴즈',
    questions: [
      { text: '프랑스의 수도는 어디일까요?', options: ['런던', '베를린', '파리', '마드리드'], correctIndex: 2 },
      { text: '태양계에서 "붉은 행성"이라고 불리는 별은?', options: ['지구', '화성', '목성', '금성'], correctIndex: 1 },
      { text: '5 더하기 7은 얼마일까요?', options: ['10', '11', '12', '13'], correctIndex: 2 }
    ]
  },
  'science': {
    title: '재미있는 과학 탐구',
    questions: [
      { text: '물의 화학 기호는 무엇일까요?', options: ['H2O', 'CO2', 'O2', 'NaCl'], correctIndex: 0 },
      { text: '물은 섭씨 몇 도에서 끓을까요?', options: ['50°C', '100°C', '150°C', '200°C'], correctIndex: 1 },
      { text: '다음 중 포유류가 아닌 것은?', options: ['고래', '상어', '박쥐', '인간'], correctIndex: 1 }
    ]
  },
  'kpop': {
    title: '재미있는 K-Pop 퀴즈',
    questions: [
      { text: '방탄소년단(BTS)의 데뷔 연도는 언제일까요?', options: ['2011년', '2012년', '2013년', '2014년'], correctIndex: 2 },
      { text: '블랙핑크의 멤버가 아닌 사람은?', options: ['지수', '제니', '나연', '리사'], correctIndex: 2 },
      { text: '뉴진스(NewJeans)의 데뷔곡이 아닌 것은?', options: ['Attention', 'Hype Boy', 'Ditto', 'Cookie'], correctIndex: 2 }
    ]
  },
  'history': {
    title: '도전! 한국사 능력 고사',
    questions: [
      { text: '조선 시대 세종대왕이 한글을 창제한 연도는?', options: ['1443년', '1446년', '1592년', '1945년'], correctIndex: 0 },
      { text: '임진왜란에서 거북선을 이끌고 승리한 장군은?', options: ['강감찬', '이순신', '을지문덕', '계백'], correctIndex: 1 },
      { text: '우리나라의 첫 번째 국가인 고조선을 세운 인물은?', options: ['주몽', '박혁거세', '단군왕검', '온조'], correctIndex: 2 }
    ]
  }
};

const QUIZ_DATA_PATH = path.join(__dirname, 'data', 'quizzes.json');
const APP_CONFIG_PATH = path.join(__dirname, 'data', 'app_config.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(QUIZ_DATA_PATH))) {
  fs.mkdirSync(path.dirname(QUIZ_DATA_PATH), { recursive: true });
}

const DEFAULT_APP_CONFIG = {
  quizzes: [
    { id: 'humor', title: '유머', count: 15, bg: '#fef3c7' },
    { id: 'econ', title: '경제', count: 12, bg: '#d1fae5' },
    { id: 'current', title: '시사', count: 8, bg: '#dbeafe' },
    { id: 'science', title: '과학', count: 10, bg: '#e0e7ff' },
    { id: 'sports', title: '스포츠', count: 9, bg: '#ffedd5' },
    { id: 'lit', title: '문학', count: 11, bg: '#f5f3ff' },
    { id: 'math', title: '수학', count: 7, bg: '#ecfeff' },
    { id: 'tech', title: '기술', count: 14, bg: '#f1f5f9' },
    { id: 'movie', title: '영화', count: 13, bg: '#fce7f3' },
    { id: 'music', title: '음악', count: 10, bg: '#fff7ed' },
    { id: 'food', title: '음식', count: 12, bg: '#fff7ed' },
    { id: 'travel', title: '여행', count: 8, bg: '#f0fdfa' },
    { id: 'art', title: '예술', count: 9, bg: '#faf5ff' },
    { id: 'arch', title: '건축', count: 11, bg: '#f3f4f6' },
    { id: 'nature', title: '자연', count: 15, bg: '#f0fdf4' },
    { id: 'space', title: '우주', count: 7, bg: '#e0e7ff' },
    { id: 'phil', title: '철학', count: 10, bg: '#fffbeb' },
    { id: 'psych', title: '심리', count: 12, bg: '#fff1f2' },
    { id: 'law', title: '법', count: 8, bg: '#f9fafb' },
    { id: 'lang', title: '언어', count: 11, bg: '#eef2ff' },
    { id: 'geo', title: '지리', count: 9, bg: '#ecfeff' },
    { id: 'trivia', title: '상식 퀴즈', count: 20, bg: '#fffbeb' },
  ]
};

function loadPersistedData(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      // If it's the config file and it's empty or missing quizzes, return default
      if (filePath.includes('app_config') && (!parsed.quizzes || parsed.quizzes.length === 0)) {
        return defaultValue;
      }
      return parsed;
    }
  } catch (err) {
    console.error(`Error loading persisted data from ${filePath}:`, err);
  }
  return defaultValue;
}

function savePersistedData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error saving persisted data to ${filePath}:`, err);
  }
}

let PERSISTED_QUIZZES = loadPersistedData(QUIZ_DATA_PATH);
let APP_CONFIG = loadPersistedData(APP_CONFIG_PATH, DEFAULT_APP_CONFIG);

// Ensure APP_CONFIG is saved back if it was initialized from default
if (!fs.existsSync(APP_CONFIG_PATH)) {
    savePersistedData(APP_CONFIG_PATH, APP_CONFIG);
}

const rooms = {};

function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- COMMON EVENTS ---
  socket.on('room:clientError', ({ pin, error, info }) => {
    console.error(`[CLIENT ERROR] Room: ${pin || 'N/A'}, User: ${socket.id}`);
    console.error(`Error: ${error}`);
    console.error(`Info: ${JSON.stringify(info)}`);
  });

  // --- HOST EVENTS ---
  socket.on('host:createRoom', (data, callback) => {
    let pin;
    do {
      pin = generatePIN();
    } while (rooms[pin]);

    let quiz = null;
    let isBuzzerMode = false;

    // Robust parsing of data
    if (typeof data === 'object') {
      if (data.mode === 'buzzer' || data.isBuzzerMode) isBuzzerMode = true;

      // Check if it's a direct quiz object or contained quiz data
      if (data.title && data.questions) {
        quiz = data;
        // If it looks like a topic-based quiz, persist it
        if (data.topicId && data.subId) {
          const key = `quizrun_data_${data.topicId}_${data.subId}`;
          PERSISTED_QUIZZES[key] = data;
          savePersistedData(QUIZ_DATA_PATH, PERSISTED_QUIZZES);
        }
      } else if (data.quiz && data.quiz.title) {
        quiz = data.quiz;
        if (data.topicId && data.subId) {
            const key = `quizrun_data_${data.topicId}_${data.subId}`;
            PERSISTED_QUIZZES[key] = data.quiz;
            savePersistedData(QUIZ_DATA_PATH, PERSISTED_QUIZZES);
        }
      } else if (data.quizId) {
        // Try persisted first, then fallback to MOCK
        if (data.subId) {
            const key = `quizrun_data_${data.quizId}_${data.subId}`;
            quiz = PERSISTED_QUIZZES[key] || MOCK_QUIZZES[data.quizId] || MOCK_QUIZZES['general'];
        } else {
            quiz = MOCK_QUIZZES[data.quizId] || MOCK_QUIZZES['general'];
        }
      }
    } else if (typeof data === 'string') {
      quiz = MOCK_QUIZZES[data] || MOCK_QUIZZES['general'];
    }

    // Final fallback
    if (!quiz) {
      quiz = MOCK_QUIZZES['general'];
    }

    // Clone the quiz and filter questions if needed
    let finalQuiz = JSON.parse(JSON.stringify(quiz));
    let quizType = (finalQuiz.questions[0]?.options && finalQuiz.questions[0]?.options.length > 0) ? 'mcq' : 'short';

    if (data.mode === 'mcq_only') {
        finalQuiz.questions = finalQuiz.questions.filter(q => q.options && q.options.some(opt => opt.trim() !== ''));
        isBuzzerMode = false;
        quizType = 'mcq';
    } else if (data.mode === 'short_only') {
        finalQuiz.questions = finalQuiz.questions.filter(q => q.answer && (!q.options || q.options.every(opt => opt.trim() === '')));
        isBuzzerMode = true; // Set to true so participants get group selection screen
        quizType = 'short';
    } else if (data.mode === 'buzzer') {
        isBuzzerMode = true;
    }

    finalQuiz.quizType = quizType;

    console.log(`Creating room: Pin=${pin}, Mode=${data.mode}, Filtered Questions=${finalQuiz.questions.length}, quizType=${quizType}`);

    rooms[pin] = {
      hostId: socket.id,
      quiz: finalQuiz,
      participants: [],
      state: 'lobby',
      currentQuestionIndex: 0,
      totalPoints: finalQuiz.questions.reduce((sum, q) => sum + (q.points || 10), 0),
      isBuzzerMode: isBuzzerMode,
      buzzedGroupId: null,
      buzzedParticipantId: null,
      groupScores: {},
      firstCorrect: null
    };

    socket.join(pin);
    console.log(`Room ${pin} details:`, rooms[pin]);

    if (callback) callback({
      success: true,
      pin,
      title: quiz.title,
      ip: getLocalIP(),
      isBuzzerMode: isBuzzerMode,
      quizType: quizType, // Explicitly tell participant the quiz type
      totalPoints: rooms[pin].totalPoints
    });
  });

  socket.on('host:updateQuestionPoints', ({ pin, points }) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
        const currentQ = room.quiz.questions[room.currentQuestionIndex];
        const oldPoints = currentQ.points || 10;
        currentQ.points = points;
        
        // Recalculate total points
        room.totalPoints = room.quiz.questions.reduce((sum, q) => sum + (q.points || 10), 0);
        
        // Broadcast update to all
        io.to(pin).emit('room:stateUpdate', {
            state: room.state,
            question: currentQ.text,
            options: currentQ.options,
            correctIndex: currentQ.correctIndex,
            correctAnswer: currentQ.answer,
            points: points,
            totalPoints: room.totalPoints,
            isBuzzerMode: room.isBuzzerMode
        });
    }
  });

  socket.on('host:startGame', (pin) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
      room.state = 'question';
      room.currentQuestionIndex = 0;
      room.buzzedGroupId = null;
      room.buzzedParticipantId = null;
      room.participants.forEach(p => { p.hasAnswered = false; p.currentAnswer = null; p.isCorrect = false; });

      const currentQ = room.quiz.questions[0];
      io.to(pin).emit('room:stateUpdate', {
        state: 'question',
        question: currentQ.text,
        options: currentQ.options,
        correctIndex: currentQ.correctIndex,
        correctAnswer: currentQ.answer,
        points: currentQ.points || 10,
        totalPoints: room.totalPoints,
        isBuzzerMode: room.isBuzzerMode,
        quizType: (currentQ.options && currentQ.options.length > 0 && currentQ.options.some(o => o.trim() !== '')) ? 'mcq' : 'short',
        buzzedGroupId: null
      });
    }
  });

  socket.on('host:nextQuestion', (pin) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
      room.currentQuestionIndex++;
      room.buzzedGroupId = null;
      room.buzzedParticipantId = null;
      room.firstCorrect = null;

      if (room.currentQuestionIndex >= room.quiz.questions.length) {
        room.state = 'leaderboard';
        const leaderboard = [...room.participants].sort((a, b) => b.score - a.score);
        io.to(pin).emit('room:stateUpdate', { state: 'final_leaderboard', leaderboard });
        return;
      }

      room.state = 'question';
      room.participants.forEach(p => { p.hasAnswered = false; p.currentAnswer = null; p.isCorrect = false; });

      const currentQ = room.quiz.questions[room.currentQuestionIndex];
      io.to(pin).emit('room:stateUpdate', {
        state: 'question',
        question: currentQ.text,
        options: currentQ.options,
        correctIndex: currentQ.correctIndex, // Host will use this, participants should ignore until reveal
        correctAnswer: currentQ.answer,
        points: currentQ.points || 10,
        totalPoints: room.totalPoints,
        isBuzzerMode: room.isBuzzerMode,
        quizType: (currentQ.options && currentQ.options.length > 0 && currentQ.options.some(o => o.trim() !== '')) ? 'mcq' : 'short',
        buzzedGroupId: null
      });
      console.log(`Room ${pin} next question`);
    }
  });

  socket.on('host:showResults', (pin) => {
    const room = rooms[pin];
    if (room && room.hostId === socket.id) {
      room.state = 'leaderboard';
      const leaderboard = [...room.participants].sort((a, b) => b.score - a.score);
      const currentQ = room.quiz.questions[room.currentQuestionIndex];

      io.to(pin).emit('room:stateUpdate', {
        state: 'leaderboard',
        leaderboard,
        correctIndex: currentQ.correctIndex,
        correctAnswer: currentQ.answer,
        isBuzzerMode: room.isBuzzerMode,
        quizType: (currentQ.options && currentQ.options.length > 0 && currentQ.options.some(o => o.trim() !== '')) ? 'mcq' : 'short'
      });
    }
  });


  // Buzzer Mode: Host judges if the answer is correct or incorrect
  socket.on('host:buzzerJudge', ({ pin, isCorrect }, callback) => {
    const room = rooms[pin];
    if (!room || room.hostId !== socket.id) return;

    const buzzedGroupId = room.buzzedGroupId;
    const buzzedParticipantId = room.buzzedParticipantId;
    const participant = room.participants.find(p => p.id === buzzedParticipantId);

    const currentQ = room.quiz.questions[room.currentQuestionIndex];
    const awardPoints = currentQ.points || 10;
    const penaltyPoints = 10;

    if (isCorrect) {
      if (participant) participant.score += awardPoints;
      if (buzzedGroupId) {
        if (!room.groupScores[buzzedGroupId]) room.groupScores[buzzedGroupId] = 0;
        room.groupScores[buzzedGroupId] += awardPoints;
      }
    } else {
      if (participant) participant.score -= penaltyPoints;
      if (buzzedGroupId) {
        if (!room.groupScores[buzzedGroupId]) room.groupScores[buzzedGroupId] = 0;
        room.groupScores[buzzedGroupId] -= penaltyPoints;
      }
    }

    // Reset buzzed state
    room.buzzedGroupId = null;
    room.buzzedParticipantId = null;

    // Broadcast updated participants to host
    io.to(room.hostId).emit('host:participantsUpdated', room.participants);

    // Broadcast judge result to all in the room
    io.to(pin).emit('room:buzzerJudge', {
      isCorrect,
      groupId: buzzedGroupId,
      participantId: buzzedParticipantId,
      groupScores: { ...room.groupScores }
    });

    if (callback) callback({ success: true });
    console.log(`Room ${pin} buzzer judge: Group ${buzzedGroupId} -> ${isCorrect ? 'CORRECT' : 'INCORRECT'}. Scores:`, room.groupScores);
  });

  socket.on('participant:joinRoom', ({ pin, nickname }, callback) => {
    const room = rooms[pin];
    if (!room) {
      if (callback) callback({ success: false, message: 'Room not found' });
      return;
    }
    if (room.state !== 'lobby') {
      if (callback) callback({ success: false, message: 'Game already started' });
      return;
    }
    if (room.participants.some(p => p.nickname === nickname)) {
      if (callback) callback({ success: false, message: 'Nickname already taken' });
      return;
    }

    const newParticipant = {
      id: socket.id,
      nickname,
      score: 0,
      hasAnswered: false,
      currentAnswer: null,
      isCorrect: false,
      groupId: null
    };

    room.participants.push(newParticipant);
    socket.join(pin);

    io.to(room.hostId).emit('host:participantsUpdated', room.participants);
    if (callback) callback({ 
      success: true, 
      roomState: room.state, 
      isBuzzerMode: room.isBuzzerMode,
      quizType: room.quiz.quizType || 'mcq'
    });
  });

  socket.on('quiz:getQuestions', ({ topicId, subId }, callback) => {
    const key = `quizrun_data_${topicId}_${subId}`;
    const quiz = PERSISTED_QUIZZES[key];
    if (callback) callback({ success: !!quiz, data: quiz });
  });

  socket.on('quiz:saveQuestions', ({ topicId, subId, data }, callback) => {
    const key = `quizrun_data_${topicId}_${subId}`;
    PERSISTED_QUIZZES[key] = data;
    savePersistedData(QUIZ_DATA_PATH, PERSISTED_QUIZZES);
    console.log(`Saved quiz data for ${key}`);
    if (callback) callback({ success: true });
  });

  // --- APP CONFIG EVENTS ---
  socket.on('config:load', (callback) => {
    if (callback) callback({ success: true, config: APP_CONFIG });
  });

  socket.on('config:save', (newConfig, callback) => {
    APP_CONFIG = { ...APP_CONFIG, ...newConfig };
    savePersistedData(APP_CONFIG_PATH, APP_CONFIG);
    console.log('Saved app configuration');
    // Broadcast to others so they can sync in real-time if open
    socket.broadcast.emit('config:updated', APP_CONFIG);
    if (callback) callback({ success: true });
  });

  socket.on('quiz:getAllCounts', (callback) => {
    const counts = {};
    for (const [key, quiz] of Object.entries(PERSISTED_QUIZZES)) {
      counts[key] = (quiz.mcq || []).length + (quiz.short || []).length;
    }
    if (callback) callback({ success: true, counts });
  });

  socket.on('participant:selectGroup', ({ pin, groupId }) => {
    const room = rooms[pin];
    if (room) {
      const p = room.participants.find(p => p.id === socket.id);
      if (p) {
        p.groupId = groupId;
        io.to(room.hostId).emit('host:participantsUpdated', room.participants);
      }
    }
  });

  socket.on('participant:pressBuzzer', ({ pin }) => {
    const rPin = String(pin);
    const room = rooms[rPin];
    if (room && room.state === 'question' && !room.buzzedGroupId) {
      const p = room.participants.find(p => p.id === socket.id);
      if (p) {
        room.buzzedGroupId = p.groupId;
        room.buzzedParticipantId = socket.id;
        io.to(pin).emit('room:buzzed', { groupId: p.groupId, nickname: p.nickname, participantId: socket.id });
        console.log(`User ${p.nickname} (Group ${p.groupId || 'Individual'}) buzzed in room ${pin}`);
      }
    }
  });

  socket.on('participant:submitAnswer', ({ pin, answerIndex, textAnswer }, callback) => {
    const rPin = String(pin);
    const room = rooms[rPin];
    if (room && room.state === 'question') {
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant && !participant.hasAnswered) {
        participant.hasAnswered = true;
        const currentQ = room.quiz.questions[room.currentQuestionIndex];
        const quizType = (currentQ.options && currentQ.options.length > 0 && currentQ.options.some(o => o.trim() !== '')) ? 'mcq' : 'short';
        
        let isCorrect = false;
        if (quizType === 'short') {
            participant.currentAnswer = textAnswer;
            isCorrect = (String(textAnswer).trim().toLowerCase() === String(currentQ.answer).trim().toLowerCase());
        } else {
            participant.currentAnswer = answerIndex;
            isCorrect = (answerIndex === currentQ.correctIndex);
        }

        const awardPoints = currentQ.points || 10;
        participant.isCorrect = isCorrect;
        
        if (isCorrect) {
            participant.score += awardPoints;
            const gid = participant.groupId;
            if (gid) {
              if (!room.groupScores[gid]) room.groupScores[gid] = 0;
              room.groupScores[gid] += awardPoints;
            }

            // Track first correct answer for Short Answer competition
            if (!room.firstCorrect) {
              room.firstCorrect = {
                id: socket.id,
                nickname: participant.nickname,
                groupId: participant.groupId
              };
              io.to(room.hostId).emit('room:firstCorrect', room.firstCorrect);
              console.log(`[FIRST] Room ${pin}: ${participant.nickname} got the first correct answer!`);

              // AUTO-REVEAL for Short Answer mode
              if (quizType === 'short') {
                  console.log(`[AUTO-REVEAL] Room ${pin}: First correct answer by ${participant.nickname}`);
                  room.state = 'leaderboard';
                  const leaderboard = [...room.participants].sort((a, b) => b.score - a.score);
                  
                  // Use a small delay to ensure other events (like score update) are processed
                  setTimeout(() => {
                      io.to(pin).emit('room:stateUpdate', {
                        state: 'leaderboard',
                        leaderboard,
                        correctIndex: currentQ.correctIndex,
                        correctAnswer: currentQ.answer,
                        isBuzzerMode: room.isBuzzerMode,
                        quizType: 'short',
                        autoRevealed: true,
                        winner: room.firstCorrect
                      });
                  }, 100);
              }
            }
        }

        io.to(room.hostId).emit('host:participantAnswered', {
          totalParticipants: room.participants.length,
          answeredCount: room.participants.filter(p => p.hasAnswered).length,
          groupScores: { ...room.groupScores }
        });
        io.to(room.hostId).emit('host:participantsUpdated', room.participants);

        // Immediate feedback for participant
        if (callback) callback({ 
          success: true, 
          isCorrect, 
          correctIndex: currentQ.correctIndex,
          correctAnswer: currentQ.answer 
        });
      }
    }
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    for (const [pin, room] of Object.entries(rooms)) {
      if (room.hostId === socket.id) {
        io.to(pin).emit('room:closed');
        delete rooms[pin];
        console.log(`Room ${pin} destroyed because Host left`);
      } else {
        const index = room.participants.findIndex(p => p.id === socket.id);
        if (index !== -1) {
          const removed = room.participants.splice(index, 1)[0];
          io.to(room.hostId).emit('host:participantsUpdated', room.participants);
          console.log(`Participant ${removed.nickname} left room ${pin}`);
        }
      }
    }
  });

});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\x1b[31m[ERROR] Port ${PORT} is already in use!\x1b[0m`);
    console.error(`\x1b[33mPlease close any existing Quizrun instances or processes using port ${PORT} and try again.\x1b[0m`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
