import { useGameStore, getUpgradedCarStats } from './store';
import { CARS, TRACKS } from './data';
import { useGamepadMenu } from './useGamepadMenu';

export function MainMenu() {
  useGamepadMenu();
  const credits = useGameStore(state => state.credits);
  const setPhase = useGameStore(state => state.setPhase);
  const selectedCarId = useGameStore(state => state.selectedCarId);
  const selectedTrackId = useGameStore(state => state.selectedTrackId);
  const setSelectedTrack = useGameStore(state => state.setSelectedTrack);
  const ownedCars = useGameStore(state => state.ownedCars);
  const careerTier = useGameStore(state => state.careerTier);
  
  const activeCar = getUpgradedCarStats(selectedCarId, ownedCars) || CARS['retro-hatch'];

  // Unlocked tracks are any tracks in the current or previous tiers
  const unlockedTracks = Object.values(TRACKS).filter(t => t.tier <= careerTier);

  return (
    <div className="absolute inset-0 bg-black text-white font-sans flex flex-col items-center justify-center p-8 z-50">
      <div className="absolute top-8 right-8 text-right">
        <div className="text-cyan-400 text-sm tracking-widest">CREDITS</div>
        <div className="text-3xl font-bold text-fuchsia-400 drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]">
          CR {credits.toLocaleString()}
        </div>
      </div>

      <div className="text-center mb-16">
        <h1 className="text-7xl font-black italic text-cyan-400 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]">
          CYBERDRIVE
        </h1>
        <p className="text-cyan-400 text-xl tracking-[0.5em] mt-2">THE NEON DRIVING SIMULATOR</p>
      </div>

      <div className="flex gap-12 w-full max-w-5xl">
        {/* Left Column: Actions */}
        <div className="flex flex-col gap-4 flex-1">
          <button 
            onClick={() => setPhase('career')}
            className="gamepad-focusable group relative bg-gradient-to-r from-cyan-500 to-blue-600 p-6 rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 group-focus:translate-y-0 transition-transform" />
            <div className="relative text-3xl font-black italic text-left">CAREER</div>
            <div className="relative text-sm text-cyan-100 text-left opacity-80">PROGRESS THROUGH TIERS</div>
          </button>

          <button 
            onClick={() => setPhase('garage')}
            className="gamepad-focusable group relative bg-gradient-to-r from-fuchsia-600 to-purple-700 p-6 rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,0,255,0.5)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 group-focus:translate-y-0 transition-transform" />
            <div className="relative text-3xl font-black italic text-left">GARAGE</div>
            <div className="relative text-sm text-fuchsia-100 text-left opacity-80">BUY & TUNE CARS</div>
          </button>
        </div>

        {/* Right Column: Info */}
        <div className="flex flex-col gap-6 flex-1 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
          <div>
            <div className="text-gray-400 text-xs tracking-widest mb-1">CURRENT CAR</div>
            <div className="text-2xl font-bold text-white">{activeCar.name}</div>
            <div className="flex gap-4 mt-2 text-sm">
              <div><span className="text-cyan-400">PWR</span> {(activeCar.accelRate * 10).toFixed(0)}</div>
              <div><span className="text-fuchsia-400">WGT</span> {activeCar.mass.toFixed(0)}kg</div>
            </div>
          </div>

          <div className="h-px bg-white/10 w-full" />

          <div className="flex-1 flex flex-col min-h-[200px]">
            <div className="flex justify-between items-end mb-2">
              <div className="text-gray-400 text-xs tracking-widest">FREE PRACTICE</div>
              <button
                onClick={() => setPhase('racing')}
                className="gamepad-focusable text-xs font-bold bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded hover:bg-cyan-500/40 transition-colors"
              >
                START RACE
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[200px]">
              {unlockedTracks.map(track => (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrack(track.id)}
                  className={`gamepad-focusable p-3 rounded border text-left transition-colors ${
                    selectedTrackId === track.id 
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                      : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10 focus:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-bold">{track.name}</div>
                    <div className="text-xs opacity-80">TIER {track.tier}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
