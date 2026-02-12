'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useState } from 'react';

interface MentalHealthStepProps {
  onNext: () => void;
  onBack: () => void;
}

const phq9Questions = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself in some way',
];

const gad7Questions = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
];

const responseOptions = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
];

export default function MentalHealthStep({
  onNext,
  onBack,
}: MentalHealthStepProps) {
  const {
    phq9Answers,
    gad7Answers,
    setAnswer,
    calculatePhq9Score,
    calculateGad7Score,
  } = useOnboardingStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [assessmentType, setAssessmentType] = useState<'phq9' | 'gad7'>(
    'phq9'
  );

  const allQuestions =
    assessmentType === 'phq9' ? phq9Questions : gad7Questions;
  const currentAnswers =
    assessmentType === 'phq9' ? phq9Answers : gad7Answers;
  const totalQuestions = allQuestions.length;

  const handleAnswer = (value: number) => {
    const newAnswers = [...currentAnswers];
    newAnswers[currentQuestionIndex] = value;

    if (assessmentType === 'phq9') {
      setAnswer('phq9Answers', newAnswers);
      if (currentQuestionIndex === phq9Questions.length - 1) {
        calculatePhq9Score();
        // Move to GAD-7
        setAssessmentType('gad7');
        setCurrentQuestionIndex(0);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } else {
      setAnswer('gad7Answers', newAnswers);
      if (currentQuestionIndex === gad7Questions.length - 1) {
        calculateGad7Score();
        onNext();
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (assessmentType === 'gad7') {
      setAssessmentType('phq9');
      setCurrentQuestionIndex(phq9Questions.length - 1);
    } else {
      onBack();
    }
  };

  const overallProgress =
    assessmentType === 'phq9'
      ? currentQuestionIndex
      : phq9Questions.length + currentQuestionIndex;
  const totalAssessmentQuestions = phq9Questions.length + gad7Questions.length;

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
          Your mental wellbeing
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          These questions help us understand your mental wellbeing. There are no
          right or wrong answers.
        </p>

        {/* Sub-progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              {assessmentType === 'phq9' ? 'Depression screening' : 'Anxiety screening'}
            </span>
            <span className="text-sm text-gray-600">
              {overallProgress + 1} of {totalAssessmentQuestions}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#acc700]"
              initial={false}
              animate={{
                width: `${((overallProgress + 1) / totalAssessmentQuestions) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${assessmentType}-${currentQuestionIndex}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <p className="text-xl font-medium text-[#1a1a1a] mb-8">
              Over the last 2 weeks, how often have you been bothered by:
            </p>
            <p className="text-2xl font-semibold text-[#1a1a1a] mb-10">
              {allQuestions[currentQuestionIndex]}
            </p>

            <div className="space-y-3">
              {responseOptions.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full px-6 py-4 rounded-xl border-2 font-medium text-left transition-all ${
                    currentAnswers[currentQuestionIndex] === option.value
                      ? 'border-[#acc700] bg-[#acc700] text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-4 mt-8">
          <motion.button
            onClick={handleBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:border-gray-400 transition-colors"
          >
            Back
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
