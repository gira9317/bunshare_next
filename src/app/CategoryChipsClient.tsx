'use client'

import { useState } from 'react'
import { CategoryChips } from '@/features/works/leaf/CategoryChips'

export default function CategoryChipsClient() {
  const [activeCategory, setActiveCategory] = useState('all')
  
  return (
    <CategoryChips 
      activeCategory={activeCategory}
      onCategoryChange={setActiveCategory}
    />
  )
}