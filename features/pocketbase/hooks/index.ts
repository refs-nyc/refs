import { createClient } from '@supabase/supabase-js'
import type { ItemsRecord, UsersRecord } from '../pocketbase-types'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPA_URL!,
  process.env.SUPA_KEY!
)

// Hook for when an item is created or updated
export async function onItemChange(record: ItemsRecord, isNew: boolean, pb: any) {
  try {
    console.log(`🔄 Processing item ${isNew ? 'creation' : 'update'}:`, record.id)
    
    // Get the ref title from PocketBase
    const refRecord = await pb.collection('refs').getOne(record.ref!)
    const refTitle = refRecord.title || ''
    
    // Call Edge Function to process the item (generate 7-string and embedding)
    const { data: processData, error: rpcError } = await supabase.functions.invoke('openai', {
      body: {
        action: 'process_item',
        item_id: record.id,
        ref_id: record.ref!,
        creator: record.creator!,
        item_text: record.text || '',
        ref_title: refTitle
      }
    })
    
    if (rpcError) {
      console.error('❌ Error processing item in Supabase RPC:', rpcError)
      
      // Fallback: directly upsert to items table
      const { error: upsertError } = await supabase
        .from('items')
        .upsert({
          id: record.id,
          ref_id: record.ref!,
          creator: record.creator!,
          text: record.text || '',
          created_at: record.created,
          updated_at: record.updated
        })
      
      if (upsertError) {
        console.error('❌ Error upserting item to Supabase:', upsertError)
      } else {
        console.log('✅ Item upserted successfully in Supabase (fallback)')
      }
    } else {
      console.log('✅ Item processed successfully in Supabase')
    }
  } catch (error) {
    console.error('❌ Error in onItemChange hook:', error)
  }
}

// Hook for when a user's items change (affects spirit vector)
export async function onUserItemsChange(userId: string) {
  try {
    console.log(`🔄 Regenerating spirit vector for user:`, userId)
    
    // Call Edge Function to regenerate spirit vector
    const { data: spiritData, error } = await supabase.functions.invoke('openai', {
      body: {
        action: 'regenerate_spirit_vector',
        user_id: userId
      }
    })
    
    if (error) {
      console.error('❌ Error regenerating spirit vector:', error)
    } else {
      console.log('✅ Spirit vector regenerated successfully')
    }
  } catch (error) {
    console.error('❌ Error in onUserItemsChange hook:', error)
  }
}

// Hook for when an item is deleted
export async function onItemDelete(itemId: string, userId: string) {
  try {
    console.log(`🗑️ Processing item deletion:`, itemId)
    
    // Delete from Supabase
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId)
    
    if (error) {
      console.error('❌ Error deleting item from Supabase:', error)
    } else {
      console.log('✅ Item deleted from Supabase')
      
      // Regenerate spirit vector for the user
      await onUserItemsChange(userId)
    }
  } catch (error) {
    console.error('❌ Error in onItemDelete hook:', error)
  }
}

// Hook for when a user is created or updated
export async function onUserChange(record: UsersRecord, isNew: boolean) {
  try {
    console.log(`🔄 Processing user ${isNew ? 'creation' : 'update'}:`, record.id)
    
    // Insert or update user in Supabase
    const { error } = await supabase
      .from('users')
      .upsert({
        id: record.id,
        name: record.name || record.userName,
        avatar_url: record.avatar_url || record.image,
        created_at: record.created,
        updated_at: record.updated
      })
    
    if (error) {
      console.error('❌ Error syncing user to Supabase:', error)
    } else {
      console.log('✅ User synced to Supabase')
      
      // If user has items, regenerate spirit vector
      if (record.items && record.items.length > 0) {
        await onUserItemsChange(record.id)
      }
    }
  } catch (error) {
    console.error('❌ Error in onUserChange hook:', error)
  }
} 