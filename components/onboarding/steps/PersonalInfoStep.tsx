'use client';

import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useState } from 'react';

interface PersonalInfoStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function PersonalInfoStep({
  onNext,
  onBack,
}: PersonalInfoStepProps) {
  const { fullName, dateOfBirth, gender, phone, setAnswer } =
    useOnboardingStore();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Please enter your full name';
    }

    if (!dateOfBirth) {
      newErrors.dateOfBirth = 'Please enter your date of birth';
    }

    if (!gender) {
      newErrors.gender = 'Please select your gender';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Please enter your phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
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
          Let&apos;s start with the basics
        </h2>
        <p className="text-lg text-gray-600 mb-12">
          We need a few details to set up your profile.
        </p>

        <div className="space-y-6">
          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setAnswer('fullName', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-[#acc700] focus:border-transparent outline-none transition-all`}
              placeholder="Enter your full name"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label
              htmlFor="dateOfBirth"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Date of Birth
            </label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setAnswer('dateOfBirth', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-[#acc700] focus:border-transparent outline-none transition-all`}
            />
            {errors.dateOfBirth && (
              <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setAnswer('gender', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.gender ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-[#acc700] focus:border-transparent outline-none transition-all bg-white`}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
            {errors.gender && (
              <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setAnswer('phone', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-[#acc700] focus:border-transparent outline-none transition-all`}
              placeholder="Enter your phone number"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
            )}
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
