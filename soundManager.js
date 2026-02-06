// Simple sound effect generator using Web Audio API
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.musicEnabled = this.loadMusicPreference();
        this.musicOscillators = [];
        this.musicGainNode = null;
        this.isMusicPlaying = false;
        this.musicStartTime = 0;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            // Create audio context (will be resumed on first user interaction)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    // Resume audio context (required for browser autoplay policies)
    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Generate a tone
    playTone(frequency, duration, type = 'sine', volume = 0.3, startTime = 0) {
        if (!this.enabled || !this.audioContext) return;

        this.resumeContext();

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + startTime);
            gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + startTime + duration);

            oscillator.start(this.audioContext.currentTime + startTime);
            oscillator.stop(this.audioContext.currentTime + startTime + duration);
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }

    // Predefined sound effects
    playSuccess() {
        this.playTone(523.25, 0.1, 'sine', 0.2); // C5
        this.playTone(659.25, 0.15, 'sine', 0.2, 0.05); // E5
        this.playTone(783.99, 0.2, 'sine', 0.2, 0.1); // G5
    }

    playFail() {
        this.playTone(200, 0.3, 'sawtooth', 0.3);
        this.playTone(150, 0.3, 'sawtooth', 0.3, 0.05);
    }

    playClick() {
        this.playTone(800, 0.05, 'square', 0.15);
    }

    playPop() {
        this.playTone(400, 0.1, 'sine', 0.2);
        this.playTone(600, 0.1, 'sine', 0.15, 0.05);
    }

    playWhoosh() {
        this.playTone(200, 0.2, 'sine', 0.15);
        this.playTone(400, 0.2, 'sine', 0.15, 0.05);
        this.playTone(600, 0.2, 'sine', 0.15, 0.1);
    }

    playPowerUp() {
        this.playTone(261.63, 0.1, 'sine', 0.2); // C4
        this.playTone(329.63, 0.1, 'sine', 0.2, 0.08); // E4
        this.playTone(392.00, 0.1, 'sine', 0.2, 0.16); // G4
        this.playTone(523.25, 0.15, 'sine', 0.25, 0.24); // C5
    }

    playGameOver() {
        this.playTone(220, 0.3, 'sawtooth', 0.3);
        this.playTone(196, 0.3, 'sawtooth', 0.3, 0.1);
        this.playTone(174.61, 0.4, 'sawtooth', 0.3, 0.2);
    }

    playVictory() {
        // Victory fanfare
        this.playTone(523.25, 0.15, 'sine', 0.25); // C5
        this.playTone(659.25, 0.15, 'sine', 0.25, 0.1); // E5
        this.playTone(783.99, 0.15, 'sine', 0.25, 0.2); // G5
        this.playTone(1046.50, 0.3, 'sine', 0.3, 0.3); // C6
    }

    playRecord() {
        // Special sound for beating a record
        this.playTone(523.25, 0.1, 'sine', 0.25); // C5
        this.playTone(659.25, 0.1, 'sine', 0.25, 0.05); // E5
        this.playTone(783.99, 0.1, 'sine', 0.25, 0.1); // G5
        this.playTone(1046.50, 0.2, 'sine', 0.3, 0.15); // C6
        this.playTone(1318.51, 0.25, 'sine', 0.3, 0.25); // E6
    }

    playMatch() {
        this.playTone(600, 0.1, 'sine', 0.2);
        this.playTone(800, 0.1, 'sine', 0.2, 0.05);
    }

    playMiss() {
        this.playTone(300, 0.2, 'sawtooth', 0.25);
    }

    playTick() {
        this.playTone(1000, 0.03, 'square', 0.1);
    }

    playWoodSlide() {
        // Soft wood sliding sound - "shhhh-rrt"
        if (!this.enabled || !this.audioContext) return;

        this.resumeContext();

        try {
            const now = this.audioContext.currentTime;

            // Sliding friction sound - white noise filtered
            const bufferSize = this.audioContext.sampleRate * 0.2;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // Fade out
            }

            const noise = this.audioContext.createBufferSource();
            noise.buffer = buffer;

            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 800; // Muffled wood sound

            const slideGain = this.audioContext.createGain();
            slideGain.gain.setValueAtTime(0.3, now);
            slideGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            noise.connect(filter);
            filter.connect(slideGain);
            slideGain.connect(this.audioContext.destination);

            noise.start(now);
            noise.stop(now + 0.2);

        } catch (e) {
            console.warn('Error playing wood slide sound:', e);
        }
    }

    playVictoryJingle() {
        // Short cheerful victory jingle - xylophone style
        if (!this.enabled || !this.audioContext) return;

        this.resumeContext();

        const notes = [
            { freq: 523.25, time: 0, duration: 0.15 },    // C5
            { freq: 659.25, time: 0.1, duration: 0.15 },  // E5
            { freq: 783.99, time: 0.2, duration: 0.15 },  // G5
            { freq: 1046.50, time: 0.3, duration: 0.3 }   // C6
        ];

        notes.forEach(note => {
            this.playTone(note.freq, note.duration, 'sine', 0.25, note.time);
        });
    }

    playSoftBump() {
        // Soft bump for invalid moves - "thunk"
        if (!this.enabled || !this.audioContext) return;

        this.resumeContext();

        try {
            const now = this.audioContext.currentTime;

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.frequency.value = 80; // Low thunk
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {
            console.warn('Error playing bump sound:', e);
        }
    }

    playCuteSqueak() {
        // Cute squeak for pet animation
        if (!this.enabled || !this.audioContext) return;

        this.resumeContext();

        try {
            const now = this.audioContext.currentTime;

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {
            console.warn('Error playing squeak sound:', e);
        }
    }

    // Music preference management
    loadMusicPreference() {
        const saved = localStorage.getItem('joyPlayMusicEnabled');
        return saved !== null ? saved === 'true' : true; // Default to enabled
    }

    saveMusicPreference(enabled) {
        localStorage.setItem('joyPlayMusicEnabled', enabled.toString());
    }

    // Background music
    startBackgroundMusic() {
        if (!this.enabled || !this.audioContext || this.isMusicPlaying || !this.musicEnabled) return;

        // Ensure audio context is resumed
        this.resumeContext();

        // Wait a bit for context to be ready
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.startMusicLoop();
            }).catch(e => {
                console.warn('Could not resume audio context:', e);
            });
        } else {
            this.startMusicLoop();
        }
    }

    startMusicLoop() {
        if (!this.audioContext || this.isMusicPlaying) {
            console.log('Cannot start music loop:', { hasContext: !!this.audioContext, isPlaying: this.isMusicPlaying });
            return;
        }

        console.log('Starting background music');
        this.isMusicPlaying = true;
        this.musicStartTime = this.audioContext.currentTime;

        // Create gain node for music volume control
        this.musicGainNode = this.audioContext.createGain();
        this.musicGainNode.gain.value = 0.2; // Balanced volume
        this.musicGainNode.connect(this.audioContext.destination);

        // Calm, ambient melody - Softer and more relaxing!
        const melody = [
            // Dreamy progression: Cmaj7 - Fmaj7 - Am7 - G
            { freq: 523.25, duration: 2.0, type: 'sine' },  // C5 (long and steady)
            { freq: 659.25, duration: 1.0, type: 'sine' },  // E5
            { freq: 783.99, duration: 1.0, type: 'sine' },  // G5

            { freq: 698.46, duration: 2.0, type: 'sine' },  // F5
            { freq: 523.25, duration: 1.0, type: 'sine' },  // C5
            { freq: 440.00, duration: 1.0, type: 'sine' },  // A4

            { freq: 440.00, duration: 2.0, type: 'sine' },  // A4
            { freq: 523.25, duration: 1.0, type: 'sine' },  // C5
            { freq: 659.25, duration: 1.0, type: 'sine' },  // E5

            { freq: 392.00, duration: 2.0, type: 'sine' },  // G4
            { freq: 493.88, duration: 1.0, type: 'sine' },  // B4
            { freq: 587.33, duration: 1.0, type: 'sine' }   // D5
        ];

        // Deep, warm bass line
        const bassLine = [
            { freq: 130.81, duration: 4.0 },  // C3
            { freq: 87.31, duration: 4.0 },   // F2
            { freq: 110.00, duration: 4.0 },  // A2
            { freq: 98.00, duration: 4.0 }    // G2
        ];

        // Pad-like harmony layer
        const harmony = [
            { freq: 261.63, duration: 8.0, type: 'sine' },   // C4 (long drone)
            { freq: 329.63, duration: 8.0, type: 'sine' }    // E4 (long drone)
        ];

        const loopDuration = melody.reduce((sum, note) => sum + note.duration, 0);

        // Schedule all layers
        this.scheduleMelodyLoop(melody, loopDuration, 0);
        this.scheduleBassLoop(bassLine, loopDuration, 0);
        this.scheduleHarmonyLoop(harmony, loopDuration, 0);
    }

    scheduleMelodyLoop(melody, loopDuration, startOffset) {
        if (!this.isMusicPlaying || !this.audioContext) return;

        const currentTime = this.audioContext.currentTime;
        const loopStart = currentTime + startOffset;

        let noteStartTime = loopStart;

        melody.forEach((note, index) => {
            try {
                const oscillator = this.audioContext.createOscillator();
                const noteGain = this.audioContext.createGain();

                oscillator.connect(noteGain);
                noteGain.connect(this.musicGainNode);

                oscillator.frequency.value = note.freq;
                oscillator.type = note.type;

                // Soft, ambient envelope for a dreamy feel
                noteGain.gain.setValueAtTime(0, noteStartTime);
                noteGain.gain.linearRampToValueAtTime(0.2, noteStartTime + 0.5); // Slow attack
                noteGain.gain.setValueAtTime(0.2, noteStartTime + note.duration - 0.5);
                noteGain.gain.linearRampToValueAtTime(0, noteStartTime + note.duration); // Slow release

                oscillator.start(noteStartTime);
                oscillator.stop(noteStartTime + note.duration);

                this.musicOscillators.push(oscillator);

                noteStartTime += note.duration;
            } catch (e) {
                console.warn('Error creating melody oscillator:', e);
            }
        });

        // Schedule the next loop
        if (this.isMusicPlaying && this.audioContext) {
            const nextLoopTime = loopDuration * 1000;
            setTimeout(() => {
                if (this.isMusicPlaying && this.audioContext) {
                    this.scheduleMelodyLoop(melody, loopDuration, 0);
                }
            }, nextLoopTime);
        }
    }

    scheduleBassLoop(bassLine, loopDuration, startOffset) {
        if (!this.isMusicPlaying || !this.audioContext) return;

        const currentTime = this.audioContext.currentTime;
        const loopStart = currentTime + startOffset;

        let noteStartTime = loopStart;

        bassLine.forEach((note) => {
            try {
                const oscillator = this.audioContext.createOscillator();
                const noteGain = this.audioContext.createGain();

                oscillator.connect(noteGain);
                noteGain.connect(this.musicGainNode);

                oscillator.frequency.value = note.freq;
                oscillator.type = 'sine'; // Sine wave for smooth bass

                // Smooth bass envelope
                noteGain.gain.setValueAtTime(0, noteStartTime);
                noteGain.gain.linearRampToValueAtTime(0.3, noteStartTime + 0.05);
                noteGain.gain.setValueAtTime(0.3, noteStartTime + note.duration - 0.1);
                noteGain.gain.linearRampToValueAtTime(0, noteStartTime + note.duration);

                oscillator.start(noteStartTime);
                oscillator.stop(noteStartTime + note.duration);

                this.musicOscillators.push(oscillator);

                noteStartTime += note.duration;
            } catch (e) {
                console.warn('Error creating bass oscillator:', e);
            }
        });

        // Schedule the next loop
        if (this.isMusicPlaying && this.audioContext) {
            const nextLoopTime = loopDuration * 1000;
            setTimeout(() => {
                if (this.isMusicPlaying && this.audioContext) {
                    this.scheduleBassLoop(bassLine, loopDuration, 0);
                }
            }, nextLoopTime);
        }
    }

    scheduleHarmonyLoop(harmony, loopDuration, startOffset) {
        if (!this.isMusicPlaying || !this.audioContext) return;

        const currentTime = this.audioContext.currentTime;
        const loopStart = currentTime + startOffset;

        let noteStartTime = loopStart;

        harmony.forEach((note) => {
            try {
                const oscillator = this.audioContext.createOscillator();
                const noteGain = this.audioContext.createGain();

                oscillator.connect(noteGain);
                noteGain.connect(this.musicGainNode);

                oscillator.frequency.value = note.freq;
                oscillator.type = note.type;

                // Subtle harmony envelope - quieter than melody
                noteGain.gain.setValueAtTime(0, noteStartTime);
                noteGain.gain.linearRampToValueAtTime(0.15, noteStartTime + 0.05);
                noteGain.gain.setValueAtTime(0.15, noteStartTime + note.duration - 0.1);
                noteGain.gain.linearRampToValueAtTime(0, noteStartTime + note.duration);

                oscillator.start(noteStartTime);
                oscillator.stop(noteStartTime + note.duration);

                this.musicOscillators.push(oscillator);

                noteStartTime += note.duration;
            } catch (e) {
                console.warn('Error creating harmony oscillator:', e);
            }
        });

        // Schedule the next loop
        if (this.isMusicPlaying && this.audioContext) {
            const nextLoopTime = loopDuration * 1000;
            setTimeout(() => {
                if (this.isMusicPlaying && this.audioContext) {
                    this.scheduleHarmonyLoop(harmony, loopDuration, 0);
                }
            }, nextLoopTime);
        }
    }

    stopBackgroundMusic() {
        if (!this.isMusicPlaying) return;

        this.isMusicPlaying = false;

        // Stop all oscillators
        this.musicOscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {
                // Oscillator already stopped, ignore
            }
        });
        this.musicOscillators = [];

        // Fade out the gain node
        if (this.musicGainNode) {
            const currentTime = this.audioContext.currentTime;
            this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, currentTime);
            this.musicGainNode.gain.linearRampToValueAtTime(0, currentTime + 0.3);
        }
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        this.saveMusicPreference(this.musicEnabled);

        if (this.musicEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }

        return this.musicEnabled;
    }
}

// Create global sound manager instance
window.soundManager = new SoundManager();
console.log('SoundManager initialized, music enabled:', window.soundManager.musicEnabled);

// Resume audio context on first user interaction
document.addEventListener('click', () => {
    if (window.soundManager) {
        window.soundManager.resumeContext();
        console.log('Audio context resumed on click');
    }
}, { once: true });

document.addEventListener('keydown', () => {
    if (window.soundManager) {
        window.soundManager.resumeContext();
        console.log('Audio context resumed on keydown');
    }
}, { once: true });
