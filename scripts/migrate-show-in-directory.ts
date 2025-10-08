#!/usr/bin/env tsx
/**
 * Migration script to populate show_in_directory flag for existing users
 * 
 * This script checks all users and sets show_in_directory = true for users who have:
 * 1. A profile avatar (image or avatar_url)
 * 2. At least 3 grid items (not in backlog, not in a list)
 * 
 * Run with: npx tsx scripts/migrate-show-in-directory.ts
 */

import PocketBase from 'pocketbase'

const POCKETBASE_URL = process.env.EXPO_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

async function migrate() {
  console.log('🚀 Starting show_in_directory migration...')
  console.log(`📍 PocketBase URL: ${POCKETBASE_URL}`)
  
  const pb = new PocketBase(POCKETBASE_URL)
  
  // Authenticate as admin (you'll need to set these env vars or hardcode for one-time run)
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL
  const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD
  
  if (!adminEmail || !adminPassword) {
    console.error('❌ Error: POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD must be set')
    console.log('\nUsage:')
    console.log('  POCKETBASE_ADMIN_EMAIL=admin@example.com POCKETBASE_ADMIN_PASSWORD=password npx tsx scripts/migrate-show-in-directory.ts')
    process.exit(1)
  }
  
  try {
    // Try regular user auth (works for both regular users and admins)
    await pb.collection('users').authWithPassword(adminEmail, adminPassword)
    console.log('✅ Authenticated successfully')
  } catch (userError) {
    // If that fails, try superuser auth
    console.log('⚠️  User auth failed, trying superuser auth...')
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword)
      console.log('✅ Superuser authenticated')
    } catch (error) {
      console.error('❌ Failed to authenticate:', userError)
      console.log('\n⚠️  Make sure you\'re using the correct PocketBase credentials.')
      console.log('You can check your login at: http://127.0.0.1:8090/_/')
      process.exit(1)
    }
  }
  
  // Get all users
  let page = 1
  const perPage = 100
  let hasMore = true
  let totalUsers = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  
  while (hasMore) {
    console.log(`\n📄 Processing page ${page}...`)
    
    try {
      const usersRes = await pb.collection('users').getList(page, perPage, {
        fields: 'id,userName,image,avatar_url,show_in_directory',
      })
      
      if (usersRes.items.length === 0) {
        hasMore = false
        break
      }
      
      totalUsers += usersRes.items.length
      
      // Process each user
      for (const user of usersRes.items) {
        try {
          // Check if user has an avatar
          const hasAvatar = Boolean((user.image || '').trim() || (user.avatar_url || '').trim())
          
          // Count items created by user (non-backlog, non-list grid items)
          const createdItemsRes = await pb.collection('items').getList(1, 1, {
            filter: `creator = "${user.id}" && backlog = false && list = false && parent = null`,
          })
          
          // Count saved items on user's profile
          const savedItemsRes = await pb.collection('saves').getList(1, 1, {
            filter: `user = "${user.id}"`,
          })
          
          const totalProfileItems = createdItemsRes.totalItems + savedItemsRes.totalItems
          const hasEnoughItems = totalProfileItems >= 3
          
          // Determine if user should be shown in directory
          const shouldShow = hasAvatar && hasEnoughItems
          
          console.log(`  👤 ${user.userName}: avatar=${hasAvatar}, created=${createdItemsRes.totalItems}, saved=${savedItemsRes.totalItems}, total=${totalProfileItems}, shouldShow=${shouldShow}`)
          
          // Only update if the flag is different from current value
          if (user.show_in_directory !== shouldShow) {
            await pb.collection('users').update(user.id, {
              show_in_directory: shouldShow,
            })
            console.log(`    ✅ Updated to ${shouldShow}`)
            updated++
          } else {
            console.log(`    ⏭️  Already correct (${shouldShow})`)
            skipped++
          }
        } catch (error) {
          console.error(`    ❌ Error processing user ${user.userName}:`, error)
          errors++
        }
      }
      
      // Check if there are more pages
      if (usersRes.items.length < perPage) {
        hasMore = false
      } else {
        page++
      }
    } catch (error) {
      console.error(`❌ Error fetching users page ${page}:`, error)
      errors++
      break
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('🎉 Migration complete!')
  console.log('='.repeat(60))
  console.log(`📊 Total users processed: ${totalUsers}`)
  console.log(`✅ Users updated: ${updated}`)
  console.log(`⏭️  Users skipped (already correct): ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(60))
}

migrate()
  .then(() => {
    console.log('\n✅ Migration script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })

