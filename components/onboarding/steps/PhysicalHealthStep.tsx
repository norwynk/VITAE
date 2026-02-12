'use client';

import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useState } from 'react';

interface PhysicalHealthStepProps {
  onNext: () => void;
  onBack: () => void;
}

const chronicConditionOptions = [
  'Diabetes',
  'Hypertension',
  'Heart Disease',
  'Asthma',
  'Arthritis',
  'Cancer',
  'HIV/AIDS',
  'Thyroid',
  'None',
];

export default function PhysicalHealthStep({
  onNext,
  onBack,
}: PhysicalHealthStepProps) {
  const {
    heightCm,
    weightKg,
    bmi,
    chronicConditions,
    medications,
    smoker,
    alcoholUnitsPerWeek,
    setAnswer,
  } = useOnboardingStore();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!heightCm || heightCm <= 0) {
      newErrors.heightCm = 'Please enter a valid height';
    }

    if (!weightKg || weightKg <= 0) {
      newErrors.weightKg = 'Please enter a valid weight';
    }

    if (chronicConditions.length === 0) {
      newErrors.chronicConditions = 'Please select at least one option';
    }

    if (smoker === null) {
      newErrors.smoker = 'Please select an option';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const toggleCondition = (condition: string) => {
    let newConditions = [...chronicConditions];

    if (condition === 'None') {
      newConditions = newConditions.includes('None') ? [] : ['None'];
    } else {
      newConditions = newConditions.filter((c) => c !== 'None');
      if (newConditions.includes(condition)) {
        newConditions = newConditions.filter((c) => c !== condition);
      } else {
        newConditions.push(condition);
      }
    }

    setAnswer('chronicConditions', newConditions);
  };

  const getBmiCategory = (bmi: number | null) => {
    if (!bmi) return '';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

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
          Your physical health
        </h2>
        <p className="text-lg text-gray-600 mb-12">
          Help us understand your body and any health conditions.
        </p>

        <div className="space-y-8">
          {/* Height and Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="height"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Height (cm)
              </label>
              <input
                id="height"
                type="number"
                value={heightCm || ''}
                onChange={(e) =>
                  setAnswer('heightCm', parseFloat(e.target.value) || null)
                }
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.heightCm ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-[#acc700] focus:border-transparent outline-none transition-all`}
                placeholder="170"
              />
              {errors.heightCm && (
                <p className="mt-1 text-sm text-red-500">{errors.heightCm}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="weight"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Weight (kg)
              </label>
              <input
                id="weight"
                type="number"
                value={weightKg || ''}
                onChange={(e) =>
                  setAnswer('weightKg', parseFloat(e.target.value) || null)
                }
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.weightKg ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-[#acc700] focus:border-transparent outline-none transition-all`}
                placeholder="70"
              />
              {errors.weightKg && (
                <p className="mt-1 text-sm text-red-500">{errors.weightKg}</p>
              )}
            </div>
          </div>

          {/* BMI Display */}
          {bmi && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Your BMI:</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-[#1a1a1a]">
                    {bmi}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({getBmiCategory(bmi)})
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Chronic Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Do you have any chronic conditions?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {chronicConditionOptions.map((condition) => (
                <motion.button
                  key={condition}
                  onClick={() => toggleCondition(condition)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    chronicConditions.includes(condition)
                      ? 'border-[#acc700] bg-[#acc700] text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {condition}
                </motion.button>
              ))}
            </div>
            {errors.chronicConditions && (
              <p className="mt-2 text-sm text-red-500">
                {errors.chronicConditions}
              </p>
            )}
          </div>

          {/* Medications */}
          <div>
            <label
              htmlFor="medications"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Current medications (optional)
            </label>
            <textarea
              id="medications"
              value={medications}
              onChange={(e) => setAnswer('medications', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#acc700] focus:border-transparent outline-none transition-all resize-none"
              placeholder="List any medications you're currently taking..."
            />
          </div>

          {/* Smoker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Do you smoke?
            </label>
            <div className="flex gap-4">
              <motion.button
                onClick={() => setAnswer('smoker', true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                  smoker === true
                    ? 'border-[#acc700] bg-[#acc700] text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Yes
              </motion.button>
              <motion.button
                onClick={() => setAnswer('smoker', false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                  smoker === false
                    ? 'border-[#acc700] bg-[#acc700] text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                No
              </motion.button>
            </div>
            {errors.smoker && (
              <p className="mt-2 text-sm text-red-500">{errors.smoker}</p>
            )}
          </div>

          {/* Alcohol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Alcohol units per week
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="30"
                value={alcoholUnitsPerWeek}
                onChange={(e) =>
                  setAnswer('alcoholUnitsPerWeek', parseInt(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#acc700]"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>0</span>
                <span className="font-semibold text-[#1a1a1a]">
                  {alcoholUnitsPerWeek} units
                </span>
                <span>30+</span>
              </div>
            </div>
          </div>
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
