'use client';

import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useState } from 'react';
import {
  TrendingDown,
  Dumbbell,
  Brain,
  Moon,
  Heart,
  Activity,
  Zap,
  Apple,
  Scale,
} from 'lucide-react';

interface GoalsStepProps {
  onNext: () => void;
  onBack: () => void;
}

const goalOptions = [
  { id: 'lose-weight', label: 'Lose weight', icon: TrendingDown },
  { id: 'build-fitness', label: 'Build fitness', icon: Dumbbell },
  { id: 'reduce-stress', label: 'Reduce stress', icon: Brain },
  { id: 'better-sleep', label: 'Better sleep', icon: Moon },
  { id: 'mental-wellness', label: 'Mental wellness', icon: Heart },
  { id: 'manage-condition', label: 'Manage a condition', icon: Activity },
  { id: 'more-energy', label: 'More energy', icon: Zap },
  { id: 'healthier-eating', label: 'Healthier eating', icon: Apple },
  { id: 'work-life-balance', label: 'Work-life balance', icon: Scale },
];

export default function GoalsStep({ onNext, onBack }: GoalsStepProps) {
  const {
    primaryHealthGoal,
    secondaryGoals,
    motivationLevel,
    additionalNotes,
    setAnswer,
  } = useOnboardingStore();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!primaryHealthGoal && secondaryGoals.length === 0) {
      newErrors.goals = 'Please select at least one goal';
    }

    if (motivationLevel === null) {
      newErrors.motivationLevel = 'Please rate your motivation level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const toggleGoal = (goalId: string) => {
    if (!primaryHealthGoal) {
      // Set as primary goal
      setAnswer('primaryHealthGoal', goalId);
    } else if (primaryHealthGoal === goalId) {
      // Remove primary, promote first secondary if exists
      if (secondaryGoals.length > 0) {
        setAnswer('primaryHealthGoal', secondaryGoals[0]);
        setAnswer(
          'secondaryGoals',
          secondaryGoals.filter((g) => g !== secondaryGoals[0])
        );
      } else {
        setAnswer('primaryHealthGoal', '');
      }
    } else if (secondaryGoals.includes(goalId)) {
      // Remove from secondary
      setAnswer(
        'secondaryGoals',
        secondaryGoals.filter((g) => g !== goalId)
      );
    } else if (secondaryGoals.length < 2) {
      // Add to secondary (max 3 total: 1 primary + 2 secondary)
      setAnswer('secondaryGoals', [...secondaryGoals, goalId]);
    }
  };

  const isGoalSelected = (goalId: string) => {
    return primaryHealthGoal === goalId || secondaryGoals.includes(goalId);
  };

  const canSelectMore = !primaryHealthGoal || secondaryGoals.length < 2;

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
          What matters most to you?
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Pick up to 3 goals that resonate with you right now.
        </p>

        {/* Goals Selection */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goalOptions.map((goal) => {
              const Icon = goal.icon;
              const isSelected = isGoalSelected(goal.id);
              const isPrimary = primaryHealthGoal === goal.id;

              return (
                <motion.button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  disabled={!isSelected && !canSelectMore}
                  whileHover={{ scale: isSelected || canSelectMore ? 1.03 : 1 }}
                  whileTap={{ scale: isSelected || canSelectMore ? 0.97 : 1 }}
                  className={`relative px-6 py-4 rounded-xl border-2 font-medium text-left transition-all flex items-center gap-4 ${
                    isSelected
                      ? 'border-[#acc700] bg-[#acc700] text-white'
                      : canSelectMore
                      ? 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span>{goal.label}</span>
                  {isPrimary && (
                    <span className="ml-auto text-xs bg-white text-[#acc700] px-2 py-1 rounded-full">
                      Primary
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
          {errors.goals && (
            <p className="mt-2 text-sm text-red-500">{errors.goals}</p>
          )}
        </div>

        {/* Motivation Level */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What&apos;s your motivation level for making changes?
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={motivationLevel || 5}
              onChange={(e) =>
                setAnswer('motivationLevel', parseInt(e.target.value))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#acc700]"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Not motivated</span>
              <span className="font-semibold text-[#1a1a1a]">
                {motivationLevel || 5}/10
              </span>
              <span>Very motivated</span>
            </div>
          </div>
          {errors.motivationLevel && (
            <p className="mt-2 text-sm text-red-500">
              {errors.motivationLevel}
            </p>
          )}
        </div>

        {/* Additional Notes */}
        <div>
          <label
            htmlFor="additionalNotes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Anything else you&apos;d like your doctor to know? (optional)
          </label>
          <textarea
            id="additionalNotes"
            value={additionalNotes}
            onChange={(e) => setAnswer('additionalNotes', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#acc700] focus:border-transparent outline-none transition-all resize-none"
            placeholder="Share any concerns, questions, or additional context about your health..."
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
            Complete Assessment
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
