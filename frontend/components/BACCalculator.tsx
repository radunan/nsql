'use client';

import { useState } from 'react';
import { Beer, X, Send } from 'lucide-react';

interface BACCalculatorProps {
  onClose: () => void;
  onSend: (bac: number, drinks: DrinkInput[]) => void;
}

interface DrinkInput {
  type: string;
  amount: number; // ml
  percentage: number; // %
}

const DRINK_PRESETS = [
  { name: 'Beer (0.5L)', amount: 500, percentage: 5 },
  { name: 'Wine (0.2L)', amount: 200, percentage: 12 },
  { name: 'Shot (0.04L)', amount: 40, percentage: 40 },
  { name: 'Cocktail (0.3L)', amount: 300, percentage: 15 },
];

export default function BACCalculator({ onClose, onSend }: BACCalculatorProps) {
  const [weight, setWeight] = useState<number>(70);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [drinks, setDrinks] = useState<DrinkInput[]>([]);
  const [hours, setHours] = useState<number>(1);
  const [drinkCounts, setDrinkCounts] = useState<{ [key: string]: number }>({
    'Beer (0.5L)': 0,
    'Wine (0.2L)': 0,
    'Shot (0.04L)': 0,
    'Cocktail (0.3L)': 0,
  });

  const updateDrinkCount = (presetName: string, count: number) => {
    setDrinkCounts({ ...drinkCounts, [presetName]: Math.max(0, count) });
  };

  const applyDrinks = () => {
    const newDrinks: DrinkInput[] = [];
    DRINK_PRESETS.forEach(preset => {
      const count = drinkCounts[preset.name] || 0;
      for (let i = 0; i < count; i++) {
        newDrinks.push({ type: preset.name, amount: preset.amount, percentage: preset.percentage });
      }
    });
    setDrinks(newDrinks);
  };

  const removeDrink = (index: number) => {
    setDrinks(drinks.filter((_, i) => i !== index));
  };

  const calculateBAC = (): number => {
    if (drinks.length === 0 || weight === 0) return 0;

    // Calculate total alcohol in grams
    let totalAlcoholGrams = 0;
    drinks.forEach(drink => {
      const alcoholML = (drink.amount * drink.percentage) / 100;
      const alcoholGrams = alcoholML * 0.789; // density of ethanol
      totalAlcoholGrams += alcoholGrams;
    });

    // Widmark formula
    const r = gender === 'male' ? 0.68 : 0.55; // body water constant
    const metabolismRate = 0.15; // grams per liter per hour (typical breakdown rate)
    
    // BAC in g/L = (alcohol in grams / (body weight in kg × r))
    const peakBAC = totalAlcoholGrams / (weight * r);
    
    // Subtract metabolism over time (0.15 g/L per hour)
    let bac = peakBAC - (metabolismRate * hours);
    
    // BAC can't be negative
    bac = Math.max(0, bac);
    
    return Math.round(bac * 1000) / 1000; // round to 3 decimal places
  };

  const bac = calculateBAC();

  const handleSend = () => {
    onSend(bac, drinks);
    onClose();
  };

  const getBACStatus = (bac: number): { color: string; status: string } => {
    if (bac === 0) return { color: 'text-green-400', status: 'Sober' };
    if (bac < 0.5) return { color: 'text-green-400', status: 'Slightly buzzed' };
    if (bac < 1.0) return { color: 'text-yellow-400', status: 'Buzzed' };
    if (bac < 1.5) return { color: 'text-orange-400', status: 'Tipsy' };
    if (bac < 2.0) return { color: 'text-red-400', status: 'Drunk' };
    return { color: 'text-red-600', status: 'Very drunk' };
  };

  const status = getBACStatus(bac);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-stone-900/95 to-stone-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-900/30 p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-900/30 border border-amber-700/30 rounded-full flex items-center justify-center">
              <Beer className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-amber-100">BAC Calculator</h3>
          </div>
          <button
            onClick={onClose}
            className="text-amber-300/70 hover:text-amber-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-amber-200/80 mb-2">
              Gender
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  gender === 'male'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-stone-700/50 text-amber-200/70 hover:bg-stone-600/50'
                }`}
              >
                Male
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  gender === 'female'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-stone-700/50 text-amber-200/70 hover:bg-stone-600/50'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-200/80 mb-2">
              Weight (kg): {weight}
            </label>
            <input
              type="range"
              min="40"
              max="150"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-200/80 mb-2">
              Hours since first drink: {hours}
            </label>
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        {/* Add Drinks */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-amber-200/80 mb-3">
            Number of drinks
          </label>
          <div className="space-y-3">
            {DRINK_PRESETS.map((preset) => (
              <div key={preset.name} className="flex items-center justify-between bg-stone-700/30 rounded-lg p-3 border border-amber-900/20">
                <span className="text-sm text-amber-200/90 font-medium">{preset.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateDrinkCount(preset.name, (drinkCounts[preset.name] || 0) - 1)}
                    className="w-8 h-8 bg-stone-600 hover:bg-stone-500 text-amber-200 rounded-lg transition-colors font-bold"
                    disabled={!drinkCounts[preset.name]}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={drinkCounts[preset.name] || 0}
                    onChange={(e) => updateDrinkCount(preset.name, Number(e.target.value))}
                    className="w-14 h-8 bg-stone-800 text-amber-100 text-center rounded-lg border border-amber-900/30 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => updateDrinkCount(preset.name, (drinkCounts[preset.name] || 0) + 1)}
                    className="w-8 h-8 bg-stone-600 hover:bg-stone-500 text-amber-200 rounded-lg transition-colors font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={applyDrinks}
            className="mt-3 w-full px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors font-medium"
          >
            Calculate BAC
          </button>
        </div>

        {/* Drinks List */}
        {drinks.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-amber-200/80 mb-2">
              Your drinks ({drinks.length})
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {drinks.map((drink, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-stone-800/50 rounded-lg p-2 border border-amber-900/20"
                >
                  <span className="text-sm text-amber-200/80">{drink.type}</span>
                  <button
                    onClick={() => removeDrink(index)}
                    className="text-red-400 hover:text-red-300 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BAC Result */}
        <div className="bg-gradient-to-r from-stone-800/50 to-stone-700/50 rounded-xl p-4 border border-amber-900/30 mb-6">
          <div className="text-center">
            <div className="text-sm text-amber-200/60 mb-1">Blood Alcohol Content</div>
            <div className={`text-4xl font-bold ${status.color} mb-2`}>
              {bac.toFixed(3)}‰
            </div>
            <div className={`text-lg font-semibold ${status.color}`}>
              {status.status}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-stone-700/50 border border-amber-900/30 text-amber-100 rounded-xl font-semibold hover:bg-stone-600/50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={drinks.length === 0}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-900/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            Send BAC
          </button>
        </div>

        <div className="mt-4 text-xs text-amber-300/50 text-center">
          This is an estimate only. Do not drive under the influence.
        </div>
      </div>
    </div>
  );
}
