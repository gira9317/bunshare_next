'use client'

import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  icon?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
  helpText?: string
}

export function FormField({
  label,
  icon,
  error,
  required = false,
  children,
  helpText,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

interface TextInputProps {
  id: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  error?: string
}

export function TextInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
}: TextInputProps) {
  return (
    <input
      type={type}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
        error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
      }`}
    />
  )
}

interface SelectInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
  children: ReactNode
}

export function SelectInput({
  id,
  value,
  onChange,
  required = false,
  error,
  children,
}: SelectInputProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
        error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
      }`}
    >
      {children}
    </select>
  )
}