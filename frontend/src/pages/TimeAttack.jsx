import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGlobalSession } from '../context/GlobalSessionContext';
import AirplaneGame from '../components/AirplaneGame';

export default function TimeAttack({ socket }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { onlinePin } = useGlobalSession();

    // Check if this window is SubScreen
    const isSubScreen = Boolean(
        location.search.includes('subscreen=true') ||
        sessionStorage.getItem('is_subscreen') === 'true'
    );

    return (
        <div style={{
            width: '100%',
            height: '100vh',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
            overflow: 'hidden'
        }}>
            <AirplaneGame
                socket={socket}
                pin={onlinePin}
                isHost={!isSubScreen}
                nickname="호스트"
                onExit={() => navigate('/')}
            />
        </div>
    );
}
