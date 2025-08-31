'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { PasswordValidation } from '../types'

interface PasswordInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  showValidation?: boolean
  validation?: PasswordValidation
  error?: string
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required = false,
  showValidation = false,
  validation,
  error,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  const getStrengthColor = () => {
    if (!validation) return 'bg-gray-200'
    
    const validCount = [
      validation.hasMinLength,
      validation.hasNumber,
      validation.hasLetter,
    ].filter(Boolean).length

    if (validCount === 0) return 'bg-gray-200'
    if (validCount === 1) return 'bg-red-400'
    if (validCount === 2) return 'bg-yellow-400'
    return 'bg-green-400'
  }

  const getStrengthWidth = () => {
    if (!validation) return 0
    
    const validCount = [
      validation.hasMinLength,
      validation.hasNumber,
      validation.hasLetter,
    ].filter(Boolean).length

    return (validCount / 3) * 100
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full px-4 py-3 pr-12 bg-white border rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
            error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {showValidation && validation && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${getStrengthColor()}`}
              style={{ width: `${getStrengthWidth()}%` }}
            />
          </div>
          
          <div className="space-y-1 text-xs">
            <div className={`flex items-center gap-2 ${validation.hasMinLength ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-1 h-1 rounded-full ${validation.hasMinLength ? 'bg-green-600' : 'bg-gray-400'}`} />
              8文字以上
            </div>
            <div className={`flex items-center gap-2 ${validation.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-1 h-1 rounded-full ${validation.hasNumber ? 'bg-green-600' : 'bg-gray-400'}`} />
              数字を含む
            </div>
            <div className={`flex items-center gap-2 ${validation.hasLetter ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-1 h-1 rounded-full ${validation.hasLetter ? 'bg-green-600' : 'bg-gray-400'}`} />
              英字を含む
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}