class SoundManager {
    private sounds: Record<string, HTMLAudioElement> = {};
    private isMuted: boolean = false;

    constructor() {
        this.preloadSounds();
    }

    private preloadSounds() {
        const soundUrls = {
            start: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
            tick: 'https://assets.mixkit.co/active_storage/sfx/1430/1430-preview.mp3',
            win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
        };

        Object.entries(soundUrls).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            audio.volume = 0.5;
            this.sounds[key] = audio;
        });
    }

    playStart() {
        this.playSound('start', 0.4);
    }

    playTick() {
        this.playSound('tick', 0.3);
    }

    playWin() {
        this.playSound('win', 0.5);
    }

    playTension() {
        // Optional
    }

    private playSound(key: string, volume: number = 0.5) {
        if (this.isMuted || !this.sounds[key]) return;

        const sound = this.sounds[key];

        if (key === 'tick') {
            const clone = sound.cloneNode() as HTMLAudioElement;
            clone.volume = volume;
            clone.play().catch(() => { });
        } else {
            sound.currentTime = 0;
            sound.volume = volume;
            sound.play().catch((e) => console.error("Sound play failed", e));
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
    }
}

export const soundManager = new SoundManager();
export default soundManager;