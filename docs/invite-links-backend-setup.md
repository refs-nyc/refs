# Group Chat Invite Links - Backend Setup

## Overview
This document describes the backend changes needed to support the group chat invite link feature.

## Database Schema Changes

### PocketBase: `conversations` Collection

Add two new fields to the `conversations` collection:

1. **inviteToken** (Text)
   - Type: `text`
   - Required: No (only for group chats)
   - Indexed: **Yes** (for efficient lookup by token)
   - Unique: No (but should be unique in practice due to nanoid collision resistance)
   - Default: Empty

2. **inviteTokenCreatedAt** (Number)
   - Type: `number`
   - Required: No
   - Default: Empty
   - Purpose: Unix timestamp (milliseconds) for future token rotation/expiry logic

### Migration Steps

1. Open PocketBase Admin UI
2. Navigate to Collections → `conversations`
3. Add new field:
   - Name: `inviteToken`
   - Type: Text
   - Click "Add index" to enable efficient querying
4. Add new field:
   - Name: `inviteTokenCreatedAt`
   - Type: Number

## API Rules & Validation

### Recommended Server-Side Rules

While the client handles most logic, consider adding these PocketBase collection rules:

#### Create Rule (conversations)
```javascript
// Allow creation with inviteToken only if is_direct = false
@request.auth.id != "" && 
(@request.data.is_direct = true || @request.data.inviteToken != "")
```

#### Update Rule (conversations)
```javascript
// Allow token regeneration only for admins/creators
@request.auth.id != "" && 
(@request.data.inviteToken:isset = false || 
 @collection.memberships.conversation = id && 
 @collection.memberships.user = @request.auth.id)
```

#### View Rule (conversations by token)
```javascript
// Allow anyone to find conversations by valid invite token
@request.query.inviteToken:isset = false || 
inviteToken = @request.query.inviteToken
```

## Security Considerations

### Token Format
- 21 characters (nanoid default)
- URL-safe alphabet: `A-Za-z0-9_-`
- Collision probability: ~1 million years to have 1% probability of collision at 1000 IDs/hour

### Rate Limiting
Consider implementing rate limiting on:
- `/api/chats/joinByInvite` endpoint (if you create one)
- Client-side join attempts (currently handled by client logic)
- Recommended: 10 join attempts per IP per hour

### Token Rotation
To invalidate old links:
1. Update `inviteToken` field with new `nanoid(21)`
2. Update `inviteTokenCreatedAt` to current timestamp
3. Old links will fail with "Invalid or expired invite link"

Example rotation function (client-side):
```typescript
await pocketbase.collection('conversations').update(chatId, {
  inviteToken: nanoid(21),
  inviteTokenCreatedAt: Date.now(),
})
```

### Expiry Logic (Future Enhancement)
To implement time-based expiry:
```typescript
// In joinChatByInvite function, add:
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
if (conversation.inviteTokenCreatedAt && 
    Date.now() - conversation.inviteTokenCreatedAt > SEVEN_DAYS_MS) {
  throw new Error('Invite link has expired')
}
```

## Testing

### Manual Testing Steps

1. **Create a group chat:**
   ```typescript
   // Should auto-generate inviteToken
   const chatId = await createConversation(false, userId, [memberId], "Test Group")
   ```

2. **Verify token was created:**
   - Open PocketBase Admin → Collections → conversations
   - Find the new conversation
   - Confirm `inviteToken` is populated (21 chars)
   - Confirm `inviteTokenCreatedAt` is populated (timestamp)

3. **Test join flow:**
   ```bash
   # On iOS simulator/device:
   npx uri-scheme open "refsnyc://invite/g/<token>" --ios
   
   # On Android:
   adb shell am start -a android.intent.action.VIEW -d "refsnyc://invite/g/<token>"
   ```

4. **Test error cases:**
   - Invalid token → "Unable to join chat. The invite link may be invalid or expired."
   - Already a member → Silent (just navigates to chat)
   - Unauthenticated → Redirects to login, then auto-joins

### Automated Testing

Consider adding tests for:
- Token generation during group chat creation
- Token lookup by `inviteToken` field
- Membership creation for new users
- Idempotent join (already a member)
- Direct conversation rejection (no tokens for DMs)

## Monitoring & Analytics

Recommended events to track:
- `invite_link_created`: When a group chat is created
- `invite_link_copied`: When user taps "Copy link"
- `invite_link_shared`: When user taps "Share"
- `invite_link_opened`: When deep link is parsed
- `invite_join_success`: When user successfully joins
- `invite_join_error`: When join fails (with error reason)

## Production Checklist

- [ ] Add `inviteToken` field to `conversations` collection (text, indexed)
- [ ] Add `inviteTokenCreatedAt` field to `conversations` collection (number)
- [ ] Test token generation on new group chat creation
- [ ] Test join flow with valid token
- [ ] Test error handling with invalid token
- [ ] Verify iOS universal links configuration (applinks:refs.nyc)
- [ ] Set up web redirect at `https://refs.nyc/invite/g/<token>` → app scheme
- [ ] Configure rate limiting (optional but recommended)
- [ ] Add monitoring/analytics for invite link events
- [ ] Document token rotation procedure for support team

## Universal Links (iOS)

The app is configured to handle `https://refs.nyc/invite/g/<token>` links.

### Requirements:
1. Host `.well-known/apple-app-site-association` at `https://refs.nyc/.well-known/apple-app-site-association`
2. File content:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.refsnyc.app",
        "paths": ["/invite/g/*"]
      }
    ]
  }
}
```
3. Web server at `https://refs.nyc/invite/g/<token>` should:
   - For iOS: Let universal link handle it (302 → `refsnyc://invite/g/<token>`)
   - For Android: Intent link
   - For web: Show "Install Refs to join this chat" page

## Support & Troubleshooting

### Common Issues

**"No email received" / Deep link doesn't open app:**
- Verify `refsnyc://` scheme is registered in `app.json`
- Test with `npx uri-scheme open` command
- Check iOS simulator vs. real device (universal links require real device)
- Verify `associatedDomains` in `app.json` matches production domain

**"Invalid token" errors:**
- Check PocketBase for conversation with matching `inviteToken`
- Verify token hasn't been rotated
- Confirm `is_direct = false` for the conversation

**Join succeeds but user doesn't see messages:**
- Verify membership was created in `memberships` collection
- Check `conversation` field matches the chat ID
- Invalidate relevant query caches

## Future Enhancements

1. **Admin Controls:**
   - Regenerate invite link button in chat settings
   - Toggle invite link on/off per chat
   - View invite link usage stats

2. **Expiry Options:**
   - 1 hour / 1 day / 7 days / never expire
   - Max uses (e.g., "This link can be used 10 times")

3. **Permissions:**
   - Require admin approval for joins
   - Restrict link generation to chat admins only

4. **Analytics:**
   - Track which users joined via link
   - Show invite link creator
   - Display join source in member list

