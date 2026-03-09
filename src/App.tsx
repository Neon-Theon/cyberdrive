/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useEffect, useState } from 'react';
import { Car } from './Car';
import { Track } from './Track';
import { PostProcessing } from './PostProcessing';
import { useGameStore } from './store';
import { TRACKS } from './data';
import { MainMenu } from './MainMenu';
import { Garage } from './Garage';
import { CareerMenu } from './CareerMenu';
import { useGamepadMenu } from './useGamepadMenu';

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(ms % 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function LapTimeDisplay() {
  const lapTime = useGameStore(state => state.lapTime);
  return (
    <div className="text-3xl font-bold drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]">
      {formatTime(lapTime)}
    </div>
  );
}

function SpeedDisplay() {
  const speed = useGameStore(state => state.speed);
  const rpm = useGameStore(state => state.rpm);
  const gear = useGameStore(state => state.gear);

  return (
    <div className="flex gap-4">
      <div className="bg-black/50 border border-cyan-500/50 p-4 rounded-xl backdrop-blur-sm">
        <div className="text-cyan-400 text-xs mb-1 font-sans">GEAR</div>
        <div className="text-4xl font-bold text-white drop-shadow-[0_0_8px_rgba(0,255,255,0.8)] text-center">
          {gear}
        </div>
      </div>
      <div className="bg-black/50 border border-fuchsia-500/50 p-4 rounded-xl backdrop-blur-sm w-48">
        <div className="text-fuchsia-400 text-xs mb-1 font-sans">SPEED</div>
        <div className="flex items-baseline gap-2">
          <div className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">{speed}</div>
          <div className="text-fuchsia-400 font-bold">KM/H</div>
        </div>
        {/* RPM Bar */}
        <div className="h-2 bg-gray-800 rounded-full mt-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-red-500" 
            style={{ width: `${Math.min(100, (rpm / 8000) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function RewardNotification() {
  const lastReward = useGameStore(state => state.lastReward);
  const lastRewardTime = useGameStore(state => state.lastRewardTime);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Date.now() - lastRewardTime < 3000) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000 - (Date.now() - lastRewardTime));
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [lastRewardTime]);

  return (
    <div 
      className={`absolute top-24 left-1/2 -translate-x-1/2 bg-fuchsia-500/20 border border-fuchsia-400 text-fuchsia-300 px-6 py-3 rounded-full font-bold text-xl backdrop-blur-md transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      + CR {lastReward.toLocaleString()}
    </div>
  );
}

function UI() {
  const bestLap = useGameStore(state => state.bestLap);
  const pastLaps = useGameStore(state => state.pastLaps);
  const credits = useGameStore(state => state.credits);
  const setPhase = useGameStore(state => state.setPhase);
  const isPaused = useGameStore(state => state.isPaused);
  const setIsPaused = useGameStore(state => state.setIsPaused);
  const currentLap = useGameStore(state => state.currentLap);
  const totalLaps = useGameStore(state => state.totalLaps);
  const raceFinished = useGameStore(state => state.raceFinished);
  const resetRace = useGameStore(state => state.resetRace);
  const selectedTrackId = useGameStore(state => state.selectedTrackId);
  const trackData = TRACKS[selectedTrackId] || TRACKS['neon-loop'];
  const countdown = useGameStore(state => state.countdown);
  const recordBonus = useGameStore(state => state.recordBonus);
  const wrongWay = useGameStore(state => state.wrongWay);

  useGamepadMenu({
    onPause: () => {
      if (!raceFinished && countdown === null) setIsPaused(!isPaused);
    },
    onBack: () => {
      if (raceFinished) {
        setPhase('menu');
        resetRace();
      } else if (isPaused) {
        setIsPaused(false);
      } else if (countdown === null) {
        setIsPaused(true);
      }
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !raceFinished && countdown === null) {
        setIsPaused(!isPaused);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, setIsPaused, raceFinished, countdown]);
  
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 font-sans text-white select-none z-10">
      <RewardNotification />

      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="text-9xl font-black italic text-white drop-shadow-[0_0_30px_rgba(0,255,255,1)] animate-pulse">
            {countdown > 0 ? Math.ceil(countdown) : 'GO!'}
          </div>
        </div>
      )}

      {wrongWay && countdown === null && !raceFinished && !isPaused && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-40">
          <div className="bg-red-900/80 border-4 border-red-500 px-8 py-4 rounded-xl backdrop-blur-md animate-pulse">
            <div className="text-5xl font-black italic text-white drop-shadow-[0_0_20px_rgba(255,0,0,1)] text-center">
              WRONG WAY
            </div>
          </div>
        </div>
      )}

      {raceFinished && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-white/10 border border-white/20 p-8 rounded-xl flex flex-col items-center gap-6 min-w-[400px]">
            <h2 className="text-5xl font-black italic text-fuchsia-400 drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">
              RACE FINISHED!
            </h2>
            <div className="text-2xl text-cyan-400 font-bold flex flex-col items-center gap-2">
              <div>REWARD: CR {trackData.reward.toLocaleString()}</div>
              {recordBonus > 0 && (
                <div className="text-xl text-yellow-400 drop-shadow-[0_0_8px_rgba(255,255,0,0.8)]">
                  RECORD BONUS: +CR {recordBonus.toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full mt-4">
              <div className="flex justify-between text-gray-300">
                <span>BEST LAP:</span>
                <span className="font-mono">{bestLap ? formatTime(bestLap) : '--:--.---'}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>TOTAL TIME:</span>
                <span className="font-mono">{formatTime(pastLaps.reduce((a, b) => a + b, 0))}</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full mt-4">
              <button 
                onClick={() => {
                  resetRace();
                  setPhase('racing');
                }}
                className="gamepad-focusable w-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400 text-cyan-300 py-3 rounded font-bold transition-colors"
              >
                RESTART RACE
              </button>
              <button 
                onClick={() => {
                  resetRace();
                  setPhase('career');
                }}
                className="gamepad-focusable w-full bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-400 text-fuchsia-300 py-3 rounded font-bold transition-colors"
              >
                CONTINUE CAREER
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaused && !raceFinished && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-white/10 border border-white/20 p-8 rounded-xl flex flex-col items-center gap-6 min-w-[300px]">
            <h2 className="text-4xl font-black italic text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
              PAUSED
            </h2>
            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={() => setIsPaused(false)}
                className="gamepad-focusable w-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400 text-cyan-300 py-3 rounded font-bold transition-colors"
              >
                RESUME
              </button>
              <button 
                onClick={() => {
                  setIsPaused(false);
                  resetRace();
                  setPhase('menu');
                }}
                className="gamepad-focusable w-full bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-400 text-fuchsia-300 py-3 rounded font-bold transition-colors"
              >
                EXIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          {!isPaused && !raceFinished && (
            <button 
              onClick={() => setIsPaused(true)}
              className="gamepad-focusable pointer-events-auto bg-black/50 border border-white/20 px-4 py-2 rounded hover:bg-white/10 transition-colors w-fit text-sm font-bold"
            >
              || PAUSE
            </button>
          )}
          <div>
            <h1 className="text-4xl font-black italic text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
              CYBERDRIVE
            </h1>
            <div className="text-cyan-400 font-bold mt-1 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
              CR {credits.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col gap-2 font-mono">
          <div className="bg-black/50 border border-fuchsia-500/50 p-3 rounded-xl backdrop-blur-sm mb-2">
            <div className="text-fuchsia-400 text-xs tracking-widest font-sans">LAP</div>
            <div className="text-3xl font-bold text-white drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]">
              {currentLap} / {totalLaps}
            </div>
          </div>
          <div>
            <div className="text-fuchsia-400 text-sm tracking-widest font-sans">LAP TIME</div>
            <LapTimeDisplay />
          </div>
          {bestLap && (
            <div>
              <div className="text-cyan-400 text-sm tracking-widest font-sans">BEST LAP</div>
              <div className="text-xl font-bold drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]">
                {formatTime(bestLap)}
              </div>
            </div>
          )}
          {pastLaps.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              <div className="text-gray-400 text-xs tracking-widest font-sans">PAST LAPS</div>
              {pastLaps.map((lap, i) => (
                <div key={i} className="text-sm text-gray-300">
                  {formatTime(lap)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-end font-mono">
        <SpeedDisplay />
        
        <div className="text-right bg-black/50 border border-cyan-500/50 p-4 rounded-xl backdrop-blur-sm font-sans">
          <div className="text-cyan-400 text-xs mb-2">CONTROLS</div>
          <div className="grid grid-cols-3 gap-1 text-center text-xs font-bold">
            <div />
            <div className="bg-white/10 p-2 rounded border border-white/20">W</div>
            <div />
            <div className="bg-white/10 p-2 rounded border border-white/20">A</div>
            <div className="bg-white/10 p-2 rounded border border-white/20">S</div>
            <div className="bg-white/10 p-2 rounded border border-white/20">D</div>
          </div>
          <div className="mt-2 text-center bg-white/10 p-2 rounded border border-white/20 text-xs font-bold">SPACE (BRAKE)</div>
          <div className="mt-2 text-center text-xs text-gray-400">GAMEPAD SUPPORTED</div>
        </div>
      </div>
    </div>
  );
}

function RacingGame() {
  const isPaused = useGameStore(state => state.isPaused);
  
  return (
    <>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 5, 10], fov: 60 }}>
        <color attach="background" args={['#020005']} />
        <fog attach="fog" args={['#020005', 20, 150]} />
        
        <ambientLight intensity={0.2} />
        <directionalLight
          position={[50, 50, -50]}
          intensity={1}
        />
        
        <Suspense fallback={null}>
          <Physics timeStep="vary" paused={isPaused}>
            <Track />
            <Car />
          </Physics>
          <PostProcessing />
        </Suspense>
      </Canvas>
      <UI />
    </>
  );
}

export default function App() {
  const phase = useGameStore(state => state.phase);
  
  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {phase === 'menu' && <MainMenu />}
      {phase === 'career' && <CareerMenu />}
      {phase === 'garage' && <Garage />}
      {phase === 'racing' && <RacingGame />}
    </div>
  );
}
