import { getContinueReadingWorks } from '@/features/works/server/loader'
import { ContinueReadingSection } from '../sections/ContinueReadingSection'

interface ContinueReadingSuspenseProps {
  userId: string
}

export async function ContinueReadingSuspense({ userId }: ContinueReadingSuspenseProps) {
  const continueReadingWorks = await getContinueReadingWorks(userId)
  
  console.log('ContinueReadingSuspense - userId:', userId) // デバッグ用
  console.log('ContinueReadingSuspense - continueReadingWorks:', continueReadingWorks) // デバッグ用
  
  if (continueReadingWorks.length === 0) {
    return null
  }
  
  return <ContinueReadingSection works={continueReadingWorks} />
}