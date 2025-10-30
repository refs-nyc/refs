#!/usr/bin/env tsx
/**
 * Migration script to normalize the show_in_directory flag.
 *
 * The current approach:
 *   • show_in_directory = false for the profiles listed in HIDDEN_DIRECTORY_PROFILES
 *   • show_in_directory = true for everyone else
 *
 * Run with: npx tsx scripts/migrate-show-in-directory.ts
 */
import PocketBase from 'pocketbase'
import { isHiddenDirectoryProfile } from '../features/users/directoryVisibility'

const POCKETBASE_URL = process.env.POCKETBASE_URL || process.env.EXPO_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

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
        fields: 'id,userName,firstName,lastName,name,image,avatar_url,show_in_directory',
      })
      
      if (usersRes.items.length === 0) {
        hasMore = false
        break
      }
      
      totalUsers += usersRes.items.length
      
      // Process each user
      for (const user of usersRes.items) {
        try {
          const hiddenProfile = isHiddenDirectoryProfile(user)
          const desiredVisibility = hiddenProfile ? false : true

          console.log(
            `  👤 ${user.userName || '(no username)'}: hiddenProfile=${hiddenProfile}, desiredVisibility=${desiredVisibility}`
          )

          if (user.show_in_directory !== desiredVisibility) {
            await pb.collection('users').update(user.id, {
              show_in_directory: desiredVisibility,
            })
            console.log(`    ✅ Updated to ${desiredVisibility}`)
            updated++
          } else {
            console.log(`    ⏭️  Already correct (${desiredVisibility})`)
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
