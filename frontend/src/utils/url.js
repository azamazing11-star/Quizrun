/**
 * Resolves the optimal participant join URL for QR codes and sharing.
 * Works seamlessly across Local development, Local tunnels, and Cloud deployments (Koyeb, Render, Railway).
 */
export function getParticipantJoinUrl(pin, publicUrl, serverIp) {
    if (publicUrl && typeof publicUrl === 'string' && publicUrl.trim() !== '') {
        return `${publicUrl.replace(/\/$/, '')}/participant?pin=${pin || ''}`;
    }
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
        if (!isLocal) {
            // Running on public cloud domain (e.g., https://my-quizrun.koyeb.app)
            return `${window.location.origin}/participant?pin=${pin || ''}`;
        }
        return `http://${serverIp || hostname}:5173/participant?pin=${pin || ''}`;
    }
    return `/participant?pin=${pin || ''}`;
}
