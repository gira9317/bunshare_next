import { createClient } from '@/lib/supabase/server'

export interface LandingWork {
  id: string
  header_image_url: string
}

export async function getLandingWorks(): Promise<LandingWork[]> {
  try {
    const supabase = await createClient()
    
    // Storage/work-assets/headers から直接ファイルリストを取得
    const { data: files, error } = await supabase.storage
      .from('work-assets')
      .list('headers', {
        limit: 30,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('Error fetching storage files:', error)
      return []
    }

    if (!files || files.length === 0) {
      console.log('No files found in storage')
      return []
    }

    // 各ファイルのpublic URLを生成
    const worksWithUrls = files
      .filter(file => file.name && !file.name.includes('.emptyFolderPlaceholder'))
      .map((file, index) => {
        const { data } = supabase.storage
          .from('work-assets')
          .getPublicUrl(`headers/${file.name}`)
        
        return {
          id: `storage-${index}`,
          header_image_url: data.publicUrl
        }
      })

    return worksWithUrls
  } catch (error) {
    console.error('Error in getLandingWorks:', error)
    return []
  }
}