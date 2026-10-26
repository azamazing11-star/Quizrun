const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Ladder.jsx', 'utf8');

// The original lines at start of Ladder
const targetStart = `export default function Ladder({ socket, isMirrorProp }) {
    const navigate = useNavigate();
    const { participantCount, setParticipantCount, onlinePin, onlineParticipants, gameMode } = useGlobalSession();
    const [showWinnerModal, setShowWinnerModal] = useState(false);`;

const newStart = `export default function Ladder({ socket, isMirrorProp }) {
    const navigate = useNavigate();

    // --- DUAL SCREEN MIRRORING STATES --- (Placed first so hooks can access without TDZ)
    const isMirrorView = Boolean(isMirrorProp) || 
        new URLSearchParams(window.location.search).get('mirror') === 'true' ||
        new URLSearchParams(window.location.search).get('subscreen') === 'true' ||
        window.name === 'QuizrunSubScreenWindow' ||
        window.name === 'QuizrunScreenWindow' ||
        sessionStorage.getItem('is_subscreen') === 'true';
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMirrorConnected, setIsMirrorConnected] = useState(false);
    const ladderChannelRef = useRef(null);

    const { participantCount, setParticipantCount, onlinePin, onlineParticipants, gameMode } = useGlobalSession();
    const [showWinnerModal, setShowWinnerModal] = useState(false);`;

// The duplicate declaration down below
const targetOldMirrorBlock = `    // --- DUAL SCREEN MIRRORING STATES ---
    const isMirrorView = Boolean(isMirrorProp) || 
        new URLSearchParams(window.location.search).get('mirror') === 'true' ||
        new URLSearchParams(window.location.search).get('subscreen') === 'true' ||
        window.name === 'QuizrunSubScreenWindow' ||
        window.name === 'QuizrunScreenWindow' ||
        sessionStorage.getItem('is_subscreen') === 'true';
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMirrorConnected, setIsMirrorConnected] = useState(false);
    const ladderChannelRef = useRef(null);`;

code = code.replace(targetStart.replace(/\n/g, '\r\n'), newStart.replace(/\n/g, '\r\n'));
code = code.replace(targetOldMirrorBlock.replace(/\n/g, '\r\n'), '');

fs.writeFileSync('frontend/src/pages/Ladder.jsx', code, 'utf8');
console.log('Ladder.jsx isMirrorView moved to top!');
