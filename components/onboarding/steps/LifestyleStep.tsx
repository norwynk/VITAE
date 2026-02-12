'use client';

import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useState } from 'react';

interface LifestyleStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function LifestyleStep({ onNext, onBack }: LifestyleStepProps) {
  const {
    exerciseDaysPerWeek,
    sleepHoursPerNight,
    energyLevel,
    dietQuality,
    painLevel,
    setAnswer,
  } = useOnboardingStore();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (energyLevel === null) {
      newErrors.energyLevel = 'Please rate your energy level';
    }

    if (dietQuality === null) {
      newErrors.dietQuality = 'Please rate your diet quality';
    }

    if (painLevel === null) {
      newErrors.painLevel = 'Please rate your pain level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const DotScale = ({
    value,
    onChange,
    label,
    lowLabel = 'Low',
    highLabel = 'High',
    error,
  }: {
    value: number | null;
    onChange: (value: number) => void;
    label: string;
    lowLabel?: string;
    highLabel?: string;
    error?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label}
      </label>
      <div className="flex items-center justify-between gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <motion.button
            key={num}
            onClick={() => onChange(num)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className={`w-10 h-10 rounded-full border-2 transition-all ${
              value === num
                ? 'bg-[#acc700] border-[#acc700] scale-110'
                : 'bg-white border-gray-300 hover:border-[#acc700]'
            }`}
          >
            <span
              className={`text-sm font-medium ${
                value === num ? 'text-white' : 'text-gray-600'
              }`}
            >
              {num}
            </span>
          </motion.button>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-sm text-gray-500">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen pt-24 pb-8 bg-[#f7f7f7] px-4"
    >
      <div className="max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold text-[#1a1a1a] mb-3">
          Your lifestyle habits
        </h2>
        <p className="text-lg text-gray-600 mb-12">
          These daily patterns tell us a lot about your wellbeing.
        </p>

        <div className="space-y-8">
          {/* Exercise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How many days per week do you exercise?
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="7"
                value={exerciseDaysPerWeek}
                onChange={(e) =>
                  setAnswer('exerciseDaysPerWeek', parseInt(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#acc700]"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>0 days</span>
                <span className="font-semibold text-[#1a1a1a]">
                  {exerciseDaysPerWeek} days
                </span>
                <span>7 days</span>
              </div>
            </div>
          </div>

          {/* Sleep */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Average hours of sleep per night
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="4"
                max="10"
                step="0.5"
                value={sleepHoursPerNight}
                onChange={(e) =>
                  setAnswer('sleepHoursPerNight', parseFloat(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#acc700]"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>4 hours</span>
                <span className="font-semibold text-[#1a1a1a]">
                  {sleepHoursPerNight} hours
                </span>
                <span>10 hours</span>
              </div>
            </div>
          </div>

          {/* Energy Level */}
          <DotScale
            value={energyLevel}
            onChange={(val) => setAnswer('energyLevel', val)}
            label="Rate your typical energy levels"
            lowLabel="Always tired"
            highLabel="Energetic"
            error={errors.energyLevel}
          />

          {/* Diet Quality */}
          <DotScale
            value={dietQuality}
            onChange={(val) => setAnswer('dietQuality', val)}
            label="How would you rate your diet quality?"
            lowLabel="Poor"
            highLabel="Excellent"
            error={errors.dietQuality}
          />

          {/* Pain Level */}
          <DotScale
            value={painLevel}
            onChange={(val) => setAnswer('painLevel', val)}
            label="Any current pain or physical discomfort?"
            lowLabel="No pain"
            highLabel="Severe pain"
            error={errors.painLevel}
          />
        </div>

        <div className="flex gap-4 mt-12">
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:border-gray-400 transition-colors"
          >
            Back
          </motion.button>
          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 px-8 py-3 bg-[#acc700] text-white font-semibold rounded-full hover:bg-[#9ab600] transition-colors"
          >
            Continue
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
