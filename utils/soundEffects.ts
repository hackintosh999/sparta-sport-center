/**
 * Web Audio API Sound Effects for Chat & Messaging
 * Synthesizes rich, atmospheric, long-resonance acoustic tones without external CDN/MP3 dependencies.
 */

import { safeLocalStorage } from './storage';

let audioCtx: AudioContext | null = null;
let isMuted: boolean = typeof window !== 'undefined' ? safeLocalStorage.getItem('sparta_sound_muted') === 'true' : false;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return null;
        if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    } catch {
        return null;
    }
}

// Proactively unlock AudioContext on user interaction so background tab playback is never blocked
if (typeof window !== 'undefined') {
    const unlock = () => {
        try {
            const ctx = getAudioContext();
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
        } catch {}
    };

    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
}

/**
 * Play a smooth cosmic crystal pop/swoosh with a soft reverberant ring (~0.35s)
 */
export function playSendSound(): void {
    if (isMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3600, now);
        filter.frequency.exponentialRampToValueAtTime(1000, now + 0.35);

        // Clear, confident volume
        masterGain.gain.setValueAtTime(0.001, now);
        masterGain.gain.linearRampToValueAtTime(0.40, now + 0.025);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        // Voice 1: Ascending pitch glide (400Hz -> 820Hz)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(400, now);
        osc1.frequency.exponentialRampToValueAtTime(820, now + 0.08);
        osc1.connect(filter);
        osc1.start(now);
        osc1.stop(now + 0.35);

        // Voice 2: Golden chime harmonic at 1230Hz
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1230, now + 0.02);
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.linearRampToValueAtTime(0.20, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc2.connect(gain2);
        gain2.connect(filter);
        osc2.start(now + 0.02);
        osc2.stop(now + 0.28);
    } catch (e) {
        console.warn('Could not play send sound:', e);
    }
}

/**
 * Play a magnificent, long-resonance atmospheric chime ("Sparta Golden Temple Bell" ~3.6s)
 * - Clear, rich volume with DynamicsCompressor to ensure audibility from other tabs and rooms
 * - 4-tone celestial glass arpeggio (E5 -> A5 -> C#6 -> E6)
 * - Deep, long-sustaining singing bowl resonance (A3 + A4 + E5 + C#5) with binaural chorus
 * - Gentle lowpass acoustic filter sweep descending over 3.6s
 */
export function playReceiveSound(): void {
    if (isMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const totalDuration = 3.6;

        // 1. Studio-grade Dynamics Compressor to ensure loudness without distortion
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, now);
        compressor.knee.setValueAtTime(10, now);
        compressor.ratio.setValueAtTime(6, now);
        compressor.attack.setValueAtTime(0.003, now);
        compressor.release.setValueAtTime(0.25, now);
        compressor.connect(ctx.destination);

        // 2. Master Output Gain
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0001, now);
        masterGain.gain.linearRampToValueAtTime(0.72, now + 0.05);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);
        masterGain.connect(compressor);

        // 3. Resonant Lowpass Filter modeling large hall acoustics
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(2.4, now);
        filter.frequency.setValueAtTime(5400, now);
        filter.frequency.exponentialRampToValueAtTime(700, now + totalDuration);
        filter.connect(masterGain);

        // 4. PART A: 4-tone ascending crystal chime arpeggio (The attention-grabbing chime)
        const chimeNotes = [
            { freq: 659.25, time: 0.00, dur: 1.2, gain: 0.45 },  // E5
            { freq: 880.00, time: 0.12, dur: 1.4, gain: 0.50 },  // A5
            { freq: 1108.73, time: 0.25, dur: 1.5, gain: 0.42 }, // C#6
            { freq: 1318.51, time: 0.38, dur: 1.6, gain: 0.38 }, // E6
        ];

        chimeNotes.forEach(({ freq, time, dur, gain }) => {
            // Sine component for pure crystal tone
            const oscSine = ctx.createOscillator();
            const gainSine = ctx.createGain();
            oscSine.type = 'sine';
            oscSine.frequency.setValueAtTime(freq, now + time);

            gainSine.gain.setValueAtTime(0.0001, now + time);
            gainSine.gain.linearRampToValueAtTime(gain, now + time + 0.03);
            gainSine.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

            oscSine.connect(gainSine);
            gainSine.connect(filter);
            oscSine.start(now + time);
            oscSine.stop(now + time + dur + 0.05);

            // Triangle component for audible acoustic harmonics on laptop/mobile speakers
            const oscTri = ctx.createOscillator();
            const gainTri = ctx.createGain();
            oscTri.type = 'triangle';
            oscTri.frequency.setValueAtTime(freq, now + time);

            gainTri.gain.setValueAtTime(0.0001, now + time);
            gainTri.gain.linearRampToValueAtTime(gain * 0.4, now + time + 0.02);
            gainTri.gain.exponentialRampToValueAtTime(0.0001, now + time + (dur * 0.6));

            oscTri.connect(gainTri);
            gainTri.connect(filter);
            oscTri.start(now + time);
            oscTri.stop(now + time + dur);
        });

        // 5. PART B: Deep, luxurious, 3.8-second singing bowl sustain pad
        const droneVoices = [
            { freq: 220.00, gain: 0.30, delay: 0.10, type: 'sine' as OscillatorType },     // A3 velvet body
            { freq: 329.63, gain: 0.26, delay: 0.12, type: 'sine' as OscillatorType },     // E4 acoustic anchor
            { freq: 440.00, gain: 0.36, delay: 0.14, type: 'sine' as OscillatorType },     // A4 root resonance
            { freq: 441.85, gain: 0.25, delay: 0.14, type: 'sine' as OscillatorType },     // Binaural shimmer detune (+1.85Hz)
            { freq: 554.37, gain: 0.28, delay: 0.18, type: 'sine' as OscillatorType },     // C#5 golden warmth
            { freq: 659.25, gain: 0.24, delay: 0.20, type: 'sine' as OscillatorType },     // E5 pure fifth
            { freq: 1760.0, gain: 0.12, delay: 0.25, type: 'sine' as OscillatorType },     // High crystal sparkle
        ];

        droneVoices.forEach(({ freq, gain, delay, type }) => {
            const osc = ctx.createOscillator();
            const voiceGain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now + delay);

            voiceGain.gain.setValueAtTime(0.0001, now + delay);
            voiceGain.gain.linearRampToValueAtTime(gain, now + delay + 0.15);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

            osc.connect(voiceGain);
            voiceGain.connect(filter);

            osc.start(now + delay);
            osc.stop(now + totalDuration + 0.05);
        });
    } catch (e) {
        console.warn('Could not play receive sound:', e);
    }
}

export function setSoundMuted(muted: boolean): void {
    isMuted = muted;
    if (typeof window !== 'undefined') {
        safeLocalStorage.setItem('sparta_sound_muted', muted ? 'true' : 'false');
    }
}

export function isSoundMuted(): boolean {
    return isMuted;
}

export function toggleSoundMuted(): boolean {
    isMuted = !isMuted;
    if (typeof window !== 'undefined') {
        safeLocalStorage.setItem('sparta_sound_muted', isMuted ? 'true' : 'false');
    }
    return isMuted;
}

/**
 * Request notification permission for background chat alerts
 */
export async function requestChatNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    if (Notification.permission === 'default') {
        try {
            return await Notification.requestPermission();
        } catch {
            return Notification.permission;
        }
    }
    return Notification.permission;
}

