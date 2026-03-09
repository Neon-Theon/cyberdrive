import * as THREE from 'three';

export interface CarData {
  id: string;
  name: string;
  price: number;
  tier: number;
  mass: number;
  accelRate: number;
  maxSpeed: number;
  brakeRate: number;
  grip: number;
  oversteer: number; // 0 to 1, higher means more tail-happy
  understeer: number; // 0 to 1, higher means front pushes out
  color: string;
  neonColor: [number, number, number];
  modelType: 'sports' | 'muscle' | 'hyper' | 'rally' | 'f1';
}

export const CARS: Record<string, CarData> = {
  // TIER 1
  'retro-hatch': {
    id: 'retro-hatch',
    name: 'Retro Hatch',
    price: 0,
    tier: 1,
    mass: 1200,
    accelRate: 7.5,
    maxSpeed: 70,
    brakeRate: 25,
    grip: 0.85,
    oversteer: 0.2,
    understeer: 0.4,
    color: '#808080',
    neonColor: [0, 1, 2],
    modelType: 'sports'
  },
  'neon-gt': {
    id: 'neon-gt',
    name: 'Neon GT',
    price: 4500,
    tier: 1,
    mass: 1400,
    accelRate: 9.25,
    maxSpeed: 85,
    brakeRate: 30,
    grip: 0.95,
    oversteer: 0.4,
    understeer: 0.3,
    color: '#a0a0a0',
    neonColor: [0, 2, 2],
    modelType: 'sports'
  },
  // TIER 2
  'neon-rally': {
    id: 'neon-rally',
    name: 'Neon Rally',
    price: 15000,
    tier: 2,
    mass: 1300,
    accelRate: 11.5,
    maxSpeed: 90,
    brakeRate: 35,
    grip: 0.88,
    oversteer: 0.6,
    understeer: 0.1,
    color: '#909090',
    neonColor: [0, 2, 0],
    modelType: 'rally'
  },
  'cyber-muscle': {
    id: 'cyber-muscle',
    name: 'Cyber Muscle',
    price: 22500,
    tier: 2,
    mass: 1700,
    accelRate: 12.5,
    maxSpeed: 105,
    brakeRate: 25,
    grip: 0.82,
    oversteer: 0.8,
    understeer: 0.2,
    color: '#b0b0b0',
    neonColor: [2, 0, 0],
    modelType: 'muscle'
  },
  // TIER 3
  'apex-hyper': {
    id: 'apex-hyper',
    name: 'Apex Hypercar',
    price: 45000,
    tier: 3,
    mass: 1200,
    accelRate: 15.0,
    maxSpeed: 125,
    brakeRate: 40,
    grip: 1.0,
    oversteer: 0.2,
    understeer: 0.5,
    color: '#c0c0c0',
    neonColor: [2, 0, 2],
    modelType: 'hyper'
  },
  'photon-f1': {
    id: 'photon-f1',
    name: 'Photon F1',
    price: 90000,
    tier: 3,
    mass: 800,
    accelRate: 18.0,
    maxSpeed: 140,
    brakeRate: 50,
    grip: 1.2,
    oversteer: 0.1,
    understeer: 0.1,
    color: '#d0d0d0',
    neonColor: [2, 2, 0],
    modelType: 'f1'
  }
};

export interface TrackData {
  id: string;
  name: string;
  tier: number;
  reward: number;
  gridColor: string;
  sectionColor: string;
  wallColor: [number, number, number];
  points: THREE.Vector3[];
  width: number;
}

export const TRACKS: Record<string, TrackData> = {
  // TIER 1
  'neon-loop': {
    id: 'neon-loop',
    name: 'Neon Oval',
    tier: 1,
    reward: 1500,
    gridColor: '#ff00ff',
    sectionColor: '#00ffff',
    wallColor: [2, 0, 2],
    width: 20,
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(50, 0, 250),
      new THREE.Vector3(100, 0, 250),
      new THREE.Vector3(150, 0, 200),
      new THREE.Vector3(150, 0, 100),
      new THREE.Vector3(150, 0, 0),
      new THREE.Vector3(100, 0, -50),
      new THREE.Vector3(50, 0, -50),
      new THREE.Vector3(0, 0, -50),
    ]
  },
  'neon-sprint': {
    id: 'neon-sprint',
    name: 'Neon Sprint',
    tier: 1,
    reward: 1800,
    gridColor: '#ffff00',
    sectionColor: '#ff00aa',
    wallColor: [2, 2, 0],
    width: 20,
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 150),
      new THREE.Vector3(100, 0, 200),
      new THREE.Vector3(200, 0, 150),
      new THREE.Vector3(200, 0, 50),
      new THREE.Vector3(100, 0, 0),
      new THREE.Vector3(50, 0, -50),
      new THREE.Vector3(0, 0, -50),
    ]
  },
  'synth-sprint': {
    id: 'synth-sprint',
    name: 'Synth Sprint',
    tier: 1,
    reward: 2250,
    gridColor: '#00ffff',
    sectionColor: '#ff00ff',
    wallColor: [0, 2, 2],
    width: 18,
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(-50, 0, 150),
      new THREE.Vector3(-100, 0, 150),
      new THREE.Vector3(-150, 0, 100),
      new THREE.Vector3(-150, 0, -50),
      new THREE.Vector3(-100, 0, -100),
      new THREE.Vector3(-50, 0, -150),
      new THREE.Vector3(50, 0, -150),
      new THREE.Vector3(100, 0, -100),
      new THREE.Vector3(100, 0, -50),
      new THREE.Vector3(50, 0, -50),
      new THREE.Vector3(0, 0, -50),
    ]
  },
  // TIER 2
  'midnight-city': {
    id: 'midnight-city',
    name: 'Midnight Circuit',
    tier: 2,
    reward: 4500,
    gridColor: '#ffaa00',
    sectionColor: '#ff0000',
    wallColor: [2, 1, 0],
    width: 25,
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(0, 0, 150),
      new THREE.Vector3(-100, 0, 250),
      new THREE.Vector3(-100, 0, 350),
      new THREE.Vector3(0, 0, 450),
      new THREE.Vector3(200, 0, 450),
      new THREE.Vector3(300, 0, 350),
      new THREE.Vector3(300, 0, 150),
      new THREE.Vector3(200, 0, 0),
      new THREE.Vector3(100, 0, -100),
      new THREE.Vector3(50, 0, -100),
      new THREE.Vector3(0, 0, -50),
    ]
  },
  'cyber-cross': {
    id: 'cyber-cross',
    name: 'Cyber Cross',
    tier: 2,
    reward: 5250,
    gridColor: '#00ff00',
    sectionColor: '#0000ff',
    wallColor: [0, 2, 0],
    width: 22,
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 150),
      new THREE.Vector3(100, 0, 250),
      new THREE.Vector3(200, 0, 250),
      new THREE.Vector3(300, 0, 150),
      new THREE.Vector3(300, 0, 50),
      new THREE.Vector3(200, 0, -50),
      new THREE.Vector3(100, 0, -50),
      new THREE.Vector3(0, 0, -50),
    ]
  },
  'neon-canyon': {
    id: 'neon-canyon',
    name: 'Neon Canyon',
    tier: 2,
    reward: 6000,
    gridColor: '#ff0000',
    sectionColor: '#ffaa00',
    wallColor: [2, 0, 0],
    width: 16,
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(50, 0, 150),
      new THREE.Vector3(150, 0, 150),
      new THREE.Vector3(200, 0, 200),
      new THREE.Vector3(200, 0, 300),
      new THREE.Vector3(150, 0, 350),
      new THREE.Vector3(50, 0, 350),
      new THREE.Vector3(0, 0, 300),
      new THREE.Vector3(-50, 0, 250),
      new THREE.Vector3(-100, 0, 250),
      new THREE.Vector3(-150, 0, 200),
      new THREE.Vector3(-150, 0, 100),
      new THREE.Vector3(-150, 0, 0),
      new THREE.Vector3(-100, 0, -100),
      new THREE.Vector3(-50, 0, -100),
      new THREE.Vector3(0, 0, -50),
    ]
  },
  // TIER 3
  'suzuka-neon': {
    id: 'suzuka-neon',
    name: 'Suzuka Neon',
    tier: 3,
    reward: 10500,
    gridColor: '#00ffaa',
    sectionColor: '#0000ff',
    wallColor: [0, 2, 1],
    width: 20,
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(50, 0, 300),
      new THREE.Vector3(150, 0, 300),
      new THREE.Vector3(250, 0, 200),
      new THREE.Vector3(250, 0, 100),
      new THREE.Vector3(150, 0, 0),
      new THREE.Vector3(150, 0, -100),
      new THREE.Vector3(250, 0, -200),
      new THREE.Vector3(250, 0, -300),
      new THREE.Vector3(150, 0, -400),
      new THREE.Vector3(50, 0, -400),
      new THREE.Vector3(-50, 0, -300),
      new THREE.Vector3(-50, 0, -200),
      new THREE.Vector3(50, 0, -100),
      new THREE.Vector3(0, 0, -50),
    ]
  },
  'cyber-ring': {
    id: 'cyber-ring',
    name: 'Cyber Ring',
    tier: 3,
    reward: 15000,
    gridColor: '#ffffff',
    sectionColor: '#aaaaaa',
    wallColor: [2, 2, 2],
    width: 22,
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(100, 0, 300),
      new THREE.Vector3(200, 0, 300),
      new THREE.Vector3(300, 0, 200),
      new THREE.Vector3(300, 0, 0),
      new THREE.Vector3(200, 0, -100),
      new THREE.Vector3(300, 0, -200),
      new THREE.Vector3(300, 0, -400),
      new THREE.Vector3(200, 0, -500),
      new THREE.Vector3(100, 0, -500),
      new THREE.Vector3(0, 0, -400),
      new THREE.Vector3(0, 0, -200),
      new THREE.Vector3(-100, 0, -100),
      new THREE.Vector3(0, 0, -50),
    ]
  },
  'hyper-loop': {
    id: 'hyper-loop',
    name: 'Hyper Loop',
    tier: 3,
    reward: 12500,
    gridColor: '#ff00ff',
    sectionColor: '#ffff00',
    wallColor: [2, 0, 2],
    width: 24,
    points: [
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(0, 0, 300),
      new THREE.Vector3(100, 0, 400),
      new THREE.Vector3(300, 0, 400),
      new THREE.Vector3(400, 0, 300),
      new THREE.Vector3(400, 0, 100),
      new THREE.Vector3(300, 0, 0),
      new THREE.Vector3(100, 0, 0),
      new THREE.Vector3(0, 0, 100),
    ]
  },
  'omega-circuit': {
    id: 'omega-circuit',
    name: 'Omega Circuit',
    tier: 3,
    reward: 20000,
    gridColor: '#00ffff',
    sectionColor: '#ff0000',
    wallColor: [0, 2, 2],
    width: 26,
    points: [
      new THREE.Vector3(0, 0, -300),
      new THREE.Vector3(200, 0, -300),
      new THREE.Vector3(300, 0, -200),
      new THREE.Vector3(200, 0, -100),
      new THREE.Vector3(100, 0, 0),
      new THREE.Vector3(100, 0, 100),
      new THREE.Vector3(200, 0, 200),
      new THREE.Vector3(200, 0, 300),
      new THREE.Vector3(100, 0, 400),
      new THREE.Vector3(-100, 0, 400),
      new THREE.Vector3(-200, 0, 300),
      new THREE.Vector3(-200, 0, 200),
      new THREE.Vector3(-100, 0, 100),
      new THREE.Vector3(-100, 0, 0),
      new THREE.Vector3(-200, 0, -100),
      new THREE.Vector3(-300, 0, -200),
      new THREE.Vector3(-200, 0, -300),
    ]
  }
};
