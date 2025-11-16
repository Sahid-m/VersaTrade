'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type SoundType = 'click' | 'woosh' | 'ding' | 'heartbeat' | 'price-up' | 'price-down';
type SoundOptions = {
  volume?: number;
  pitch?: 'high' | 'low' | 'normal';
};

const useSound = () => {
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on the client after the first user interaction
    const initAudioContext = () => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser.");
            }
        }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('keydown', initAudioContext, { once: true });

    return () => {
      document.removeEventListener('click', initAudioContext);
      document.removeEventListener('keydown', initAudioContext);
    };
  }, []);

  const playSound = useCallback((soundType: SoundType, options: SoundOptions = {}) => {
    if (isMuted || !audioContextRef.current) return;

    const context = audioContextRef.current;
    const { volume = 1.0, pitch = 'normal' } = options;

    let osc: OscillatorNode | null = null;
    const gainNode = context.createGain();
    gainNode.connect(context.destination);
    gainNode.gain.setValueAtTime(0, context.currentTime);

    switch (soundType) {
      case 'price-up':
        osc = context.createOscillator();
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(0.1 * volume, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
        osc.frequency.setValueAtTime(600, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.1);
        osc.connect(gainNode);
        osc.start(context.currentTime);
        osc.stop(context.currentTime + 0.1);
        break;

      case 'price-down':
        osc = context.createOscillator();
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(0.1 * volume, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
        osc.frequency.setValueAtTime(500, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, context.currentTime + 0.1);
        osc.connect(gainNode);
        osc.start(context.currentTime);
        osc.stop(context.currentTime + 0.1);
        break;
      
      case 'click':
        osc = context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, context.currentTime);
        gainNode.gain.setValueAtTime(0.2 * volume, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
        osc.connect(gainNode);
        osc.start(context.currentTime);
        osc.stop(context.currentTime + 0.1);
        break;

      case 'woosh':
        const wooshOsc = context.createOscillator();
        wooshOsc.type = 'sawtooth';
        const basePitch = pitch === 'high' ? 800 : pitch === 'low' ? 400 : 600;
        wooshOsc.frequency.setValueAtTime(basePitch, context.currentTime);
        wooshOsc.frequency.exponentialRampToValueAtTime(basePitch / 4, context.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3 * volume, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
        
        wooshOsc.connect(gainNode);
        wooshOsc.start(context.currentTime);
        wooshOsc.stop(context.currentTime + 0.3);
        break;

      case 'ding':
        osc = context.createOscillator();
        osc.type = 'triangle';
        const dingPitch = pitch === 'high' ? 1200 : 300;
        osc.frequency.setValueAtTime(dingPitch, context.currentTime);
        gainNode.gain.setValueAtTime(0.4 * volume, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
        osc.connect(gainNode);
        osc.start(context.currentTime);
        osc.stop(context.currentTime + 0.5);
        break;
    
      case 'heartbeat':
         const beat1Osc = context.createOscillator();
         const beat2Osc = context.createOscillator();
         beat1Osc.type = 'sine';
         beat2Osc.type = 'sine';

         beat1Osc.frequency.setValueAtTime(100, context.currentTime);
         beat2Osc.frequency.setValueAtTime(100, context.currentTime + 0.15);

         gainNode.gain.setValueAtTime(0.3 * volume, context.currentTime);
         gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
         gainNode.gain.setValueAtTime(0.2 * volume, context.currentTime + 0.15);
         gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
         
         beat1Osc.connect(gainNode);
         beat2Osc.connect(gainNode);

         beat1Osc.start(context.currentTime);
         beat1Osc.stop(context.currentTime + 0.1);
         beat2Osc.start(context.currentTime + 0.15);
         beat2Osc.stop(context.currentTime + 0.25);
         break;
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { isMuted, toggleMute, playSound };
};

export { useSound };
