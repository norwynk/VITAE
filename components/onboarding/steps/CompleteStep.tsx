'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboardingStore';
import { CheckCircle2 } from 'lucide-react';

interface CompleteStepProps {
  vitaeScore?: number;
}

export default function CompleteStep({ vitaeScore }: CompleteStepProps) {
  const router = useRouter();
  const { fullName } = useOnboardingStore();

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-[#f7f7f7] px-4"
    >
      <div className="max-w-2xl w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-[#acc700] rounded-full mb-8"
        >
          <CheckCircle2 className="w-14 h-14 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-5xl font-bold text-[#1a1a1a] mb-4">
            You&apos;re all set{fullName ? `, ${fullName.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Your wellness journey starts now
          </p>

          {/* VITAE Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl p-8 shadow-lg mb-12 max-w-md mx-auto"
          >
            <p className="text-sm font-medium text-gray-600 mb-4">
              Your VITAE Score
            </p>
            <div className="relative w-40 h-40 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#f0f0f0"
                  strokeWidth="12"
                  fill="none"
                />
                <motion.circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#acc700"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '440', strokeDashoffset: '440' }}
                  animate={{
                    strokeDashoffset: vitaeScore
                      ? 440 - (vitaeScore / 100) * 440
                      : 440,
                  }}
                  transition={{ delay: 0.8, duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="text-4xl font-bold text-[#1a1a1a]"
                >
                  {vitaeScore || '--'}
                </motion.span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {vitaeScore
                ? "We're calculating your personalized wellness score"
                : 'Calculating your baseline score...'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="space-y-4"
          >
            <p className="text-gray-600 mb-8">
              Your doctor will review your assessment and create a personalized
              wellness plan tailored to your needs.
            </p>

            <motion.button
              onClick={handleGoToDashboard}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-4 bg-[#acc700] text-white text-lg font-semibold rounded-full hover:bg-[#9ab600] transition-colors shadow-lg"
            >
              Go to my Dashboard
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
