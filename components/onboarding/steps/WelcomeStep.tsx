'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-[#f7f7f7] px-4"
    >
      <div className="max-w-2xl w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-[#acc700] rounded-full mb-8"
        >
          <Heart className="w-10 h-10 text-white" fill="white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-5xl font-bold text-[#1a1a1a] mb-4">
            Workforce Healthcare
          </h1>
          <h2 className="text-3xl font-bold text-[#1a1a1a] mb-6">
            Let&apos;s get to know your health
          </h2>
          <p className="text-xl text-gray-600 mb-12 leading-relaxed">
            This will take about 8 minutes. Your answers are private and help
            us create a wellness plan built around you.
          </p>

          <motion.button
            onClick={onNext}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-12 py-4 bg-[#acc700] text-white text-lg font-semibold rounded-full hover:bg-[#9ab600] transition-colors shadow-lg"
          >
            Get Started
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
