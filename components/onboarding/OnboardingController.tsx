'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { createClient } from '@/lib/supabase/client';
import { upsertProfile, upsertHealthBaseline } from '@/lib/supabase/queries';
import ProgressBar from './ProgressBar';
import WelcomeStep from './steps/WelcomeStep';
import PersonalInfoStep from './steps/PersonalInfoStep';
import PhysicalHealthStep from './steps/PhysicalHealthStep';
import LifestyleStep from './steps/LifestyleStep';
import MentalHealthStep from './steps/MentalHealthStep';
import GoalsStep from './steps/GoalsStep';
import CompleteStep from './steps/CompleteStep';
import { Loader2 } from 'lucide-react';

export default function OnboardingController() {
  const { currentStep, nextStep, prevStep } = useOnboardingStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get the current user
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  const saveToSupabase = async () => {
    if (!userId) {
      setSaveError('User not authenticated');
      return false;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const state = useOnboardingStore.getState();

      // Save profile data
      await upsertProfile({
        id: userId,
        email: '', // This should come from auth
        full_name: state.fullName,
        date_of_birth: state.dateOfBirth,
        gender: state.gender,
        phone: state.phone,
        onboarding_completed: true,
        onboarding_step: 7,
        updated_at: new Date().toISOString(),
      });

      // Calculate scores and save health baseline
      const phq9Score = state.phq9Score || 0;
      const gad7Score = state.gad7Score || 0;

      // Simple VITAE score calculation (can be enhanced later)
      const physicalScore = calculatePhysicalScore(state);
      const mentalScore = calculateMentalScore(phq9Score, gad7Score);
      const lifestyleScore = calculateLifestyleScore(state);
      const vitaeScore = Math.round(
        (physicalScore + mentalScore + lifestyleScore) / 3
      );

      await upsertHealthBaseline({
        user_id: userId,
        height_cm: state.heightCm,
        weight_kg: state.weightKg,
        bmi: state.bmi,
        chronic_conditions: state.chronicConditions,
        medications: state.medications ? [state.medications] : null,
        smoker: state.smoker,
        alcohol_units_per_week: state.alcoholUnitsPerWeek,
        exercise_days_per_week: state.exerciseDaysPerWeek,
        sleep_hours_per_night: state.sleepHoursPerNight,
        energy_level: state.energyLevel,
        pain_level: state.painLevel,
        phq9_score: phq9Score,
        gad7_score: gad7Score,
        diet_quality: state.dietQuality,
        primary_health_goal: state.primaryHealthGoal,
        secondary_goals: state.secondaryGoals,
        motivation_level: state.motivationLevel,
        vitae_score: vitaeScore,
        physical_score: physicalScore,
        mental_score: mentalScore,
        lifestyle_score: lifestyleScore,
        updated_at: new Date().toISOString(),
      });

      setIsSaving(false);
      return true;
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      setSaveError('Failed to save your data. Please try again.');
      setIsSaving(false);
      return false;
    }
  };

  const handleGoalsNext = async () => {
    const success = await saveToSupabase();
    if (success) {
      nextStep();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={nextStep} />;
      case 1:
        return <PersonalInfoStep onNext={nextStep} onBack={prevStep} />;
      case 2:
        return <PhysicalHealthStep onNext={nextStep} onBack={prevStep} />;
      case 3:
        return <LifestyleStep onNext={nextStep} onBack={prevStep} />;
      case 4:
        return <MentalHealthStep onNext={nextStep} onBack={prevStep} />;
      case 5:
        return <GoalsStep onNext={handleGoalsNext} onBack={prevStep} />;
      case 6:
        return <CompleteStep />;
      default:
        return <WelcomeStep onNext={nextStep} />;
    }
  };

  return (
    <div className="relative">
      {currentStep > 0 && currentStep < 6 && (
        <ProgressBar currentStep={currentStep} totalSteps={6} />
      )}

      <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>

      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-8 right-8 bg-white shadow-lg rounded-full px-6 py-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#acc700] animate-spin" />
          <span className="text-sm font-medium text-gray-700">
            Saving your data...
          </span>
        </div>
      )}

      {/* Error message */}
      {saveError && (
        <div className="fixed bottom-8 right-8 bg-red-500 text-white shadow-lg rounded-lg px-6 py-3 max-w-sm">
          <p className="text-sm font-medium">{saveError}</p>
        </div>
      )}
    </div>
  );
}

// Helper functions for score calculation
function calculatePhysicalScore(state: any): number {
  let score = 70; // Base score

  // BMI impact
  if (state.bmi) {
    if (state.bmi >= 18.5 && state.bmi < 25) score += 10;
    else if (state.bmi >= 25 && state.bmi < 30) score += 5;
    else score -= 5;
  }

  // Chronic conditions impact
  if (state.chronicConditions.includes('None')) score += 10;
  else score -= state.chronicConditions.length * 3;

  // Smoker impact
  if (state.smoker === false) score += 5;
  else if (state.smoker === true) score -= 10;

  // Pain level impact
  if (state.painLevel) {
    score -= state.painLevel * 2;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateMentalScore(phq9: number, gad7: number): number {
  // PHQ-9: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 mod severe, 20-27 severe
  // GAD-7: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-21 severe

  let score = 100;

  // PHQ-9 impact
  if (phq9 <= 4) score -= 5;
  else if (phq9 <= 9) score -= 15;
  else if (phq9 <= 14) score -= 30;
  else if (phq9 <= 19) score -= 45;
  else score -= 60;

  // GAD-7 impact
  if (gad7 <= 4) score -= 5;
  else if (gad7 <= 9) score -= 15;
  else if (gad7 <= 14) score -= 30;
  else score -= 45;

  return Math.max(0, Math.min(100, score));
}

function calculateLifestyleScore(state: any): number {
  let score = 50; // Base score

  // Exercise impact
  if (state.exerciseDaysPerWeek >= 5) score += 20;
  else if (state.exerciseDaysPerWeek >= 3) score += 15;
  else if (state.exerciseDaysPerWeek >= 1) score += 10;

  // Sleep impact
  if (state.sleepHoursPerNight >= 7 && state.sleepHoursPerNight <= 9)
    score += 15;
  else if (state.sleepHoursPerNight >= 6 && state.sleepHoursPerNight <= 10)
    score += 10;
  else score += 5;

  // Energy level impact
  if (state.energyLevel) {
    score += state.energyLevel * 1.5;
  }

  // Diet quality impact
  if (state.dietQuality) {
    score += state.dietQuality * 1.5;
  }

  // Alcohol impact
  if (state.alcoholUnitsPerWeek <= 7) score += 5;
  else if (state.alcoholUnitsPerWeek <= 14) score += 2;
  else score -= 5;

  return Math.max(0, Math.min(100, score));
}
