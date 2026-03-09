import { create } from 'zustand';
import { CARS, TRACKS } from './data';

type GamePhase = 'menu' | 'career' | 'garage' | 'racing' | 'dealership' | 'result';

export interface OwnedCar {
  id: string;
  engine: number; // 0 to 5
  weight: number; // 0 to 5
  tires: number;  // 0 to 5
}

interface GameState {
  phase: GamePhase;
  credits: number;
  careerTier: number;
  completedTracks: string[];
  ownedCars: OwnedCar[];
  selectedCarId: string;
  selectedTrackId: string;
  lastReward: number;
  
  speed: number;
  rpm: number;
  gear: number;
  currentLap: number;
  totalLaps: number;
  lapTime: number;
  bestLap: number | null;
  bestRaceTimes: Record<string, number>;
  lapStarted: boolean;
  pastLaps: number[];
  checkpointPassed: boolean;
  isPaused: boolean;
  raceFinished: boolean;
  lastRewardTime: number;
  countdown: number | null;
  recordBonus: number;
  wrongWay: boolean;
  
  setPhase: (phase: GamePhase) => void;
  addCredits: (amount: number) => void;
  setLastReward: (amount: number) => void;
  buyCar: (carId: string, price: number) => void;
  upgradeCar: (carId: string, part: 'engine' | 'weight' | 'tires', cost: number) => void;
  setSelectedCar: (carId: string) => void;
  setSelectedTrack: (trackId: string) => void;
  completeTrack: (trackId: string, totalTime: number) => void;
  
  setSpeed: (speed: number) => void;
  setRpm: (rpm: number) => void;
  setGear: (gear: number) => void;
  setCurrentLap: (lap: number) => void;
  setLapTime: (time: number) => void;
  addLapTime: (deltaMs: number) => void;
  setBestLap: (time: number) => void;
  addPastLap: (time: number) => void;
  setLapStarted: (started: boolean) => void;
  setCheckpointPassed: (passed: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  setRaceFinished: (finished: boolean) => void;
  setCountdown: (countdown: number | null) => void;
  setRecordBonus: (bonus: number) => void;
  setWrongWay: (wrongWay: boolean) => void;
  resetRace: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'menu',
  credits: 0,
  careerTier: 1,
  completedTracks: [],
  ownedCars: [{ id: 'retro-hatch', engine: 0, weight: 0, tires: 0 }],
  selectedCarId: 'retro-hatch',
  selectedTrackId: 'neon-loop',
  lastReward: 0,
  
  speed: 0,
  rpm: 0,
  gear: 1,
  currentLap: 1,
  totalLaps: 3,
  lapTime: 0,
  bestLap: null,
  bestRaceTimes: {},
  lapStarted: false,
  pastLaps: [],
  checkpointPassed: false,
  isPaused: false,
  raceFinished: false,
  lastRewardTime: 0,
  countdown: null,
  recordBonus: 0,
  wrongWay: false,
  
  setPhase: (phase) => set((state) => {
    if (phase === 'racing' && state.phase !== 'racing') {
      return { 
        phase, 
        isPaused: false, 
        currentLap: 1, 
        lapTime: 0, 
        lapStarted: false, 
        checkpointPassed: false, 
        pastLaps: [], 
        bestLap: null,
        raceFinished: false,
        speed: 0,
        rpm: 0,
        gear: 1,
        countdown: 3,
        recordBonus: 0,
        wrongWay: false
      };
    }
    return { phase, isPaused: false };
  }),
  addCredits: (amount) => set((state) => ({ 
    credits: state.credits + amount,
    lastReward: amount,
    lastRewardTime: Date.now()
  })),
  setLastReward: (amount) => set({ lastReward: amount }),
  buyCar: (carId, price) => set((state) => ({ 
    credits: state.credits - price,
    ownedCars: [...state.ownedCars, { id: carId, engine: 0, weight: 0, tires: 0 }],
    selectedCarId: carId
  })),
  upgradeCar: (carId, part, cost) => set((state) => ({
    credits: state.credits - cost,
    ownedCars: state.ownedCars.map(c => c.id === carId ? { ...c, [part]: Math.min(5, c[part] + 1) } : c)
  })),
  setSelectedCar: (selectedCarId) => set({ selectedCarId }),
  setSelectedTrack: (selectedTrackId) => set({ selectedTrackId }),
  completeTrack: (trackId, totalTime) => set((state) => {
    const newCompleted = state.completedTracks.includes(trackId) 
      ? state.completedTracks 
      : [...state.completedTracks, trackId];
    
    // Check if we should unlock next tier
    let newTier = state.careerTier;
    const currentTierTracks = Object.values(TRACKS).filter(t => t.tier === state.careerTier);
    const completedCurrentTier = currentTierTracks.every(t => newCompleted.includes(t.id));
    
    if (completedCurrentTier && state.careerTier < 3) {
      newTier = state.careerTier + 1;
    }

    // Handle best race time and record bonus
    const currentBest = state.bestRaceTimes[trackId];
    let newBestRaceTimes = { ...state.bestRaceTimes };
    let recordBonus = 0;

    if (!currentBest || totalTime < currentBest) {
      newBestRaceTimes[trackId] = totalTime;
      // If it's not the first time completing it, award a bonus for breaking the record
      if (currentBest) {
        const trackData = TRACKS[trackId];
        recordBonus = Math.floor(trackData.reward * 0.5); // 50% bonus for breaking record
      }
    }
    
    return { 
      completedTracks: newCompleted, 
      careerTier: newTier,
      bestRaceTimes: newBestRaceTimes,
      recordBonus,
      credits: state.credits + recordBonus
    };
  }),
  
  setSpeed: (speed) => set({ speed }),
  setRpm: (rpm) => set({ rpm }),
  setGear: (gear) => set({ gear }),
  setCurrentLap: (currentLap) => set({ currentLap }),
  setLapTime: (lapTime) => set({ lapTime }),
  addLapTime: (deltaMs) => set((state) => ({ lapTime: state.lapTime + deltaMs })),
  setBestLap: (bestLap) => set({ bestLap }),
  addPastLap: (time) => set((state) => ({ pastLaps: [time, ...state.pastLaps].slice(0, 5) })),
  setLapStarted: (lapStarted) => set({ lapStarted }),
  setCheckpointPassed: (checkpointPassed) => set({ checkpointPassed }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setRaceFinished: (raceFinished) => set({ raceFinished }),
  setCountdown: (countdown) => set({ countdown }),
  setRecordBonus: (recordBonus) => set({ recordBonus }),
  setWrongWay: (wrongWay) => set({ wrongWay }),
  resetRace: () => set({ 
    currentLap: 1, 
    lapTime: 0, 
    lapStarted: false, 
    checkpointPassed: false, 
    pastLaps: [], 
    bestLap: null,
    raceFinished: false,
    speed: 0,
    rpm: 0,
    gear: 1,
    countdown: 3,
    recordBonus: 0,
    wrongWay: false,
    isPaused: false
  }),
}));

export function getUpgradedCarStats(carId: string, ownedCars: OwnedCar[]) {
  const baseCar = CARS[carId];
  if (!baseCar) return null;
  
  const owned = ownedCars.find(c => c.id === carId);
  if (!owned) return baseCar;
  
  // Engine: +5% accel and maxSpeed per level
  const engineMult = 1 + (owned.engine * 0.05);
  // Weight: -4% mass per level
  const weightMult = 1 - (owned.weight * 0.04);
  // Tires: +5% grip, -5% oversteer/understeer per level
  const tireMult = 1 + (owned.tires * 0.05);
  const slipMult = 1 - (owned.tires * 0.05);

  return {
    ...baseCar,
    accelRate: baseCar.accelRate * engineMult * (1 / weightMult), // lighter = faster accel
    maxSpeed: baseCar.maxSpeed * engineMult,
    mass: baseCar.mass * weightMult,
    grip: baseCar.grip * tireMult,
    oversteer: baseCar.oversteer * slipMult,
    understeer: baseCar.understeer * slipMult,
  };
}
