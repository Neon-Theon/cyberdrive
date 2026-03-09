import { useGameStore } from './store';
import { TRACKS } from './data';
import { useGamepadMenu } from './useGamepadMenu';

export function CareerMenu() {
  const setPhase = useGameStore(state => state.setPhase);
  useGamepadMenu({ onBack: () => setPhase('menu') });
  
  const credits = useGameStore(state => state.credits);
  const careerTier = useGameStore(state => state.careerTier);
  const completedTracks = useGameStore(state => state.completedTracks);
  const setSelectedTrack = useGameStore(state => state.setSelectedTrack);

  const tiers = [1, 2, 3];

  return (
    <div className="absolute inset-0 bg-black text-white font-sans flex flex-col p-8 z-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-5xl font-black italic text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
            CAREER MODE
          </h1>
          <button 
            onClick={() => setPhase('menu')}
            className="gamepad-focusable mt-4 text-sm text-gray-400 hover:text-white rounded transition-colors flex items-center gap-2 px-2 py-1"
          >
            ← BACK TO MENU
          </button>
        </div>
        <div className="text-right">
          <div className="text-cyan-400 text-sm tracking-widest">CREDITS</div>
          <div className="text-3xl font-bold text-fuchsia-400 drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]">
            CR {credits.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
        {tiers.map(tier => {
          const isUnlocked = careerTier >= tier;
          const tierTracks = Object.values(TRACKS).filter(t => t.tier === tier);
          const completedTierTracks = tierTracks.filter(t => completedTracks.includes(t.id));
          const progress = (completedTierTracks.length / tierTracks.length) * 100;

          return (
            <div 
              key={tier} 
              className={`relative border rounded-xl p-6 transition-all ${
                isUnlocked 
                  ? 'bg-white/5 border-white/20 backdrop-blur-md' 
                  : 'bg-black/50 border-white/5 opacity-50 grayscale'
              }`}
            >
              <div className="flex justify-between items-end mb-6">
                <div>
                  <div className="text-gray-400 text-xs tracking-widest mb-1">LEAGUE</div>
                  <h2 className="text-3xl font-black italic text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                    TIER {tier}
                  </h2>
                </div>
                {isUnlocked && (
                  <div className="text-right">
                    <div className="text-cyan-400 text-xs tracking-widest mb-1">PROGRESS</div>
                    <div className="text-xl font-bold">{completedTierTracks.length} / {tierTracks.length}</div>
                  </div>
                )}
                {!isUnlocked && (
                  <div className="text-red-400 font-bold tracking-widest">LOCKED</div>
                )}
              </div>

              {isUnlocked && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tierTracks.map(track => {
                    const isCompleted = completedTracks.includes(track.id);
                    return (
                      <button
                        key={track.id}
                        onClick={() => {
                          setSelectedTrack(track.id);
                          setPhase('racing');
                        }}
                        className={`gamepad-focusable flex flex-col p-4 rounded border text-left transition-all hover:scale-[1.02] ${
                          isCompleted 
                            ? 'bg-cyan-900/30 border-cyan-500/50 hover:bg-cyan-800/40' 
                            : 'bg-black/40 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div className="font-bold text-lg">{track.name}</div>
                          {isCompleted && (
                            <div className="text-cyan-400 text-xs font-bold border border-cyan-400 px-2 py-0.5 rounded">
                              CLEARED
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-fuchsia-400 mt-2 font-bold">
                          REWARD: CR {track.reward.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
