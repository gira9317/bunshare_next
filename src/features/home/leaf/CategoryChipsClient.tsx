'use client'

import { useState } from 'react'
import { CategoryChips } from '@/features/home/leaf/CategoryChips'

export function CategoryChipsClient() {
  const [activeCategory, setActiveCategory] = useState('all')
  
  return (
    <CategoryChips 
      activeCategory={activeCategory}
      onCategoryChange={setActiveCategory}
    />
  )
}