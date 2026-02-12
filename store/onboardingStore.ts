import { create } from 'zustand';

export interface OnboardingState {
  // Current step
  currentStep: number;
  totalSteps: number;

  // Personal Info
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;

  // Physical Health
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  chronicConditions: string[];
  medications: string;
  smoker: boolean | null;
  alcoholUnitsPerWeek: number;

  // Lifestyle
  exerciseDaysPerWeek: number;
  sleepHoursPerNight: number;
  energyLevel: number | null;
  dietQuality: number | null;
  painLevel: number | null;

  // Mental Health (PHQ-9 and GAD-7)
  phq9Answers: number[];
  gad7Answers: number[];
  phq9Score: number | null;
  gad7Score: number | null;

  // Goals
  primaryHealthGoal: string;
  secondaryGoals: string[];
  motivationLevel: number | null;
  additionalNotes: string;

  // Actions
  setAnswer: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  resetOnboarding: () => void;
  calculateBmi: () => void;
  calculatePhq9Score: () => void;
  calculateGad7Score: () => void;
}

const initialState = {
  currentStep: 0,
  totalSteps: 7,
  fullName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  heightCm: null,
  weightKg: null,
  bmi: null,
  chronicConditions: [],
  medications: '',
  smoker: null,
  alcoholUnitsPerWeek: 0,
  exerciseDaysPerWeek: 0,
  sleepHoursPerNight: 7,
  energyLevel: null,
  dietQuality: null,
  painLevel: null,
  phq9Answers: [],
  gad7Answers: [],
  phq9Score: null,
  gad7Score: null,
  primaryHealthGoal: '',
  secondaryGoals: [],
  motivationLevel: null,
  additionalNotes: '',
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...initialState,

  setAnswer: (field: string, value: any) => {
    set({ [field]: value });

    // Auto-calculate BMI when height or weight changes
    if (field === 'heightCm' || field === 'weightKg') {
      setTimeout(() => get().calculateBmi(), 0);
    }
  },

  nextStep: () => {
    const { currentStep, totalSteps } = get();
    if (currentStep < totalSteps) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  goToStep: (step: number) => {
    const { totalSteps } = get();
    if (step >= 0 && step <= totalSteps) {
      set({ currentStep: step });
    }
  },

  resetOnboarding: () => {
    set(initialState);
  },

  calculateBmi: () => {
    const { heightCm, weightKg } = get();
    if (heightCm && weightKg && heightCm > 0) {
      const heightM = heightCm / 100;
      const bmi = weightKg / (heightM * heightM);
      set({ bmi: Math.round(bmi * 10) / 10 });
    }
  },

  calculatePhq9Score: () => {
    const { phq9Answers } = get();
    if (phq9Answers.length === 9) {
      const score = phq9Answers.reduce((sum, val) => sum + val, 0);
      set({ phq9Score: score });
    }
  },

  calculateGad7Score: () => {
    const { gad7Answers } = get();
    if (gad7Answers.length === 7) {
      const score = gad7Answers.reduce((sum, val) => sum + val, 0);
      set({ gad7Score: score });
    }
  },
}));
