import { useState } from 'react';
import { useGameStore, getUpgradedCarStats } from './store';
import { CARS } from './data';
import { useGamepadMenu } from './useGamepadMenu';

export function Garage() {
  const setPhase = useGameStore(state => state.setPhase);
  useGamepadMenu({ onBack: () => setPhase('menu') });
  
  const credits = useGameStore(state => state.credits);
  const ownedCars = useGameStore(state => state.ownedCars);
  const selectedCarId = useGameStore(state => state.selectedCarId);
  const setSelectedCar = useGameStore(state => state.setSelectedCar);
  const buyCar = useGameStore(state => state.buyCar);
  const upgradeCar = useGameStore(state => state.upgradeCar);

  const [tab, setTab] = useState<'garage' | 'dealership'>('garage');

  const renderCarStats = (carId: string, isOwned: boolean) => {
    const baseCar = CARS[carId];
    const displayCar = isOwned ? getUpgradedCarStats(carId, ownedCars) || baseCar : baseCar;

    return (
      <div className="space-y-3 mb-6">
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>TOP SPEED</span>
            <span>{Math.round(displayCar.maxSpeed * 3.6)} KM/H</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400" style={{ width: `${(displayCar.maxSpeed / 140) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>ACCELERATION</span>
            <span>{(displayCar.accelRate * 10).toFixed(0)}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-fuchsia-400" style={{ width: `${(displayCar.accelRate / 20) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>HANDLING (GRIP)</span>
            <span>{(displayCar.grip * 100).toFixed(0)}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-400" style={{ width: `${(displayCar.grip / 1.5) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>WEIGHT</span>
            <span>{displayCar.mass.toFixed(0)} KG</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400" style={{ width: `${(1 - (displayCar.mass - 800) / 1000) * 100}%` }} />
          </div>
        </div>
      </div>
    );
  };

  const renderUpgrades = (carId: string) => {
    const owned = ownedCars.find(c => c.id === carId);
    if (!owned) return null;
    const baseCar = CARS[carId];

    const getUpgradeCost = (level: number) => 500 * baseCar.tier * (level + 1);

    const renderUpgradeButton = (part: 'engine' | 'weight' | 'tires', label: string, level: number) => {
      const isMax = level >= 5;
      const cost = getUpgradeCost(level);
      const canAfford = credits >= cost;

      return (
        <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5">
          <div>
            <div className="text-xs font-bold text-gray-300">{label}</div>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-3 h-1.5 rounded-sm ${i <= level ? 'bg-cyan-400' : 'bg-gray-700'}`} />
              ))}
            </div>
          </div>
          <button
            onClick={() => upgradeCar(carId, part, cost)}
            disabled={isMax || !canAfford}
            className={`gamepad-focusable px-3 py-1 text-xs font-bold rounded transition-colors ${
              isMax ? 'bg-cyan-900/50 text-cyan-500 border border-cyan-900' :
              canAfford ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/40' :
              'bg-gray-800 text-gray-500 border border-gray-700'
            }`}
          >
            {isMax ? 'MAX' : `CR ${cost.toLocaleString()}`}
          </button>
        </div>
      );
    };

    return (
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <div className="text-xs tracking-widest text-gray-400 mb-2">UPGRADES</div>
        {renderUpgradeButton('engine', 'ENGINE (PWR/SPD)', owned.engine)}
        {renderUpgradeButton('weight', 'CHASSIS (WGT)', owned.weight)}
        {renderUpgradeButton('tires', 'TIRES (GRIP)', owned.tires)}
      </div>
    );
  };

  const displayCars = Object.values(CARS).filter(car => 
    tab === 'garage' ? ownedCars.some(c => c.id === car.id) : !ownedCars.some(c => c.id === car.id)
  );

  return (
    <div className="absolute inset-0 bg-black text-white font-sans flex flex-col p-8 z-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-5xl font-black italic text-fuchsia-400 drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">
            GARAGE & DEALERSHIP
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

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setTab('garage')}
          className={`gamepad-focusable px-6 py-2 rounded-full font-bold tracking-widest text-sm transition-colors ${
            tab === 'garage' ? 'bg-cyan-500 text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          MY GARAGE
        </button>
        <button
          onClick={() => setTab('dealership')}
          className={`gamepad-focusable px-6 py-2 rounded-full font-bold tracking-widest text-sm transition-colors ${
            tab === 'dealership' ? 'bg-fuchsia-500 text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          DEALERSHIP
        </button>
      </div>

      {displayCars.length === 0 && (
        <div className="text-center text-gray-500 mt-20 italic">
          {tab === 'dealership' ? 'YOU OWN ALL AVAILABLE CARS.' : 'YOUR GARAGE IS EMPTY.'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {displayCars.map(car => {
          const isOwned = ownedCars.some(c => c.id === car.id);
          const isSelected = selectedCarId === car.id;
          const canAfford = credits >= car.price;

          return (
            <div 
              key={car.id} 
              className={`relative bg-white/5 border rounded-xl p-6 backdrop-blur-md transition-all flex flex-col ${
                isSelected ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.2)]' : 'border-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs text-gray-400 tracking-widest">TIER {car.tier}</div>
                  <h2 className="text-2xl font-bold">{car.name}</h2>
                </div>
                {!isOwned && (
                  <div className="text-fuchsia-400 font-bold">CR {car.price.toLocaleString()}</div>
                )}
                {isOwned && isSelected && (
                  <div className="text-cyan-400 text-sm tracking-widest font-bold">ACTIVE</div>
                )}
              </div>

              {renderCarStats(car.id, isOwned)}
              
              {isOwned && renderUpgrades(car.id)}

              <div className="mt-6 pt-4 border-t border-white/10 flex-grow flex items-end">
                {isSelected ? (
                  <button disabled className="w-full py-3 rounded bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/50">
                    CURRENTLY SELECTED
                  </button>
                ) : isOwned ? (
                  <button 
                    onClick={() => setSelectedCar(car.id)}
                    className="gamepad-focusable w-full py-3 rounded bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                  >
                    SELECT CAR
                  </button>
                ) : (
                  <button 
                    onClick={() => buyCar(car.id, car.price)}
                    disabled={!canAfford}
                    className={`gamepad-focusable w-full py-3 rounded font-bold transition-colors ${
                      canAfford 
                        ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'PURCHASE' : 'INSUFFICIENT CREDITS'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
