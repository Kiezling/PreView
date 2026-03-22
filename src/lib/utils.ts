import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cryptoRandom() {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}

export function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
}

export function generateTargetId() {
  const chars = cryptoRandom().toString(36).substring(2, 5).padEnd(3, '0').toUpperCase();
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${chars} ${month}.${day}`;
}

export function playAuditoryTarget(category: string, polarity: string) {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();

  const duration = 2; // 2 seconds playback
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.value = 0.5; // Prevent clipping

  if (category === 'Frequency') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = polarity === 'High Pitch' ? 1200 : 100;
    
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
    env.gain.setValueAtTime(1, ctx.currentTime + duration - 0.1);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    
    osc.connect(env);
    env.connect(masterGain);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } else if (category === 'Environment') {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    if (polarity === 'White Noise') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = cryptoRandom() * 2 - 1;
      }
    } else { // Brown Noise
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = cryptoRandom() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // compensate for gain
      }
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
    env.gain.setValueAtTime(1, ctx.currentTime + duration - 0.1);
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    
    noiseSource.connect(env);
    env.connect(masterGain);
    
    noiseSource.start();
  } else if (category === 'Rhythm') {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 220;
    
    const env = ctx.createGain();
    env.gain.value = 0;
    
    osc.connect(env);
    env.connect(masterGain);
    
    if (polarity === 'Slow/Pulsing') {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 2; // 2 Hz
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.5;
      
      lfo.connect(lfoGain);
      lfoGain.connect(env.gain);
      
      env.gain.setValueAtTime(0.5, ctx.currentTime);
      
      lfo.start();
      osc.start();
      
      osc.stop(ctx.currentTime + duration);
      lfo.stop(ctx.currentTime + duration);
    } else { // Fast/Erratic
      osc.start();
      let time = ctx.currentTime;
      while (time < ctx.currentTime + duration) {
        const burstDuration = 0.05 + cryptoRandom() * 0.1;
        const silenceDuration = 0.05 + cryptoRandom() * 0.2;
        
        if (time + burstDuration <= ctx.currentTime + duration) {
          env.gain.setValueAtTime(0, time);
          env.gain.linearRampToValueAtTime(1, time + 0.01);
          env.gain.setValueAtTime(1, time + burstDuration - 0.01);
          env.gain.linearRampToValueAtTime(0, time + burstDuration);
        }
        
        time += burstDuration + silenceDuration;
      }
      osc.stop(ctx.currentTime + duration);
    }
  }
}
