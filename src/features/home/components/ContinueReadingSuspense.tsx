import { getContinueReadingWorks } from '@/features/works/server/loader'
import { ContinueReadingSection } from '../sections/ContinueReadingSection'

interface ContinueReadingSuspenseProps {
  userId: string
}

export async function ContinueReadingSuspense({ userId }: ContinueReadingSuspenseProps) {
  const continueReadingWorks = await getContinueReadingWorks(userId)
  
  if (continueReadingWorks.length === 0) {
    return null
  }
  
  return <ContinueReadingSection works={continueReadingWorks} />
}