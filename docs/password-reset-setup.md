# Password Reset Setup Guide

## What's Been Implemented

✅ **Deep link configuration** (`app.json`) - added `refsnyc://reset-password`  
✅ **Forgot password screen** (`/app/user/forgot-password.tsx`) - users request a reset link  
✅ **Reset password screen** (`/app/user/reset-password.tsx`) - users set new password via token  
✅ **Login screen** - added "Forgot password?" link  
✅ **Registration screen** - "Reset Password" button when email exists (with email prefilled)

---

## PocketBase Configuration Required

### 1. Configure SMTP Settings

In **PocketBase Admin → Settings → Mail settings**:

- Configure your SMTP provider (AWS SES, Mailgun, Gmail, etc.)
- Test the connection to ensure emails can be sent

### 2. Update Password Reset Email Template

In **PocketBase Admin → Settings → Mail settings → Templates → Password reset**:

Replace the default template with:

```
Subject: Reset your Refs password

Hi {{ .record.firstName }},

Tap the link below to reset your password:

refsnyc://reset-password?token={{ .token }}

If you're on a web browser, copy the link and open it on your device with the Refs app installed.

If you didn't request this, you can safely ignore this email.

The Refs team
```

**Important**: The link must use your app scheme (`refsnyc://`) followed by the route name and token parameter.

---

## How It Works

### User Flow

1. **User taps "Forgot password?"** on login screen
2. **User enters email** → PocketBase sends reset email (always shows success to prevent account enumeration)
3. **User taps link in email** → Opens app to reset-password screen with token
4. **User sets new password** → PocketBase validates token and updates password
5. **Auto-redirects to login** → User signs in with new password

### Security Features

- **No account enumeration**: Always shows "link sent" message whether account exists or not
- **Token expiration**: PocketBase handles token expiration automatically
- **Silent error handling**: Email sending errors don't reveal account existence
- **Password validation**: 8+ character minimum, must match confirmation

### Entry Points

- Login screen: "Forgot password?" link
- Registration: "Reset Password" button when email already exists (email prefilled)
- Deep link: Email opens app directly to reset screen

---

## Testing

### Test on Real Device

Simulators may not handle deep links reliably. Test on a physical device:

1. Enter your email on forgot-password screen
2. Check your inbox (and spam folder)
3. Tap the link in the email
4. App should open to reset-password screen with token
5. Set new password
6. Sign in with new password

### Manual Deep Link Test

To test the deep link manually:

```bash
# iOS
npx uri-scheme open "refsnyc://reset-password?token=test123" --ios

# Android  
npx uri-scheme open "refsnyc://reset-password?token=test123" --android
```

### Troubleshooting

**Email not received?**
- Check PocketBase SMTP settings
- Verify email template is saved
- Check spam folder
- Look at PocketBase logs for sending errors

**Deep link doesn't open app?**
- Verify you're testing on a real device (not simulator)
- Check `app.json` has the correct scheme
- Rebuild the app after changing `app.json`
- Try the manual deep link test command above

**"Invalid token" error?**
- Tokens expire after a set time (configured in PocketBase)
- Request a new reset link
- UI shows friendly error and offers to request new link

---

## Code Files

- `/app/user/forgot-password.tsx` - Request reset link
- `/app/user/reset-password.tsx` - Handle token & set new password
- `/app/user/login.tsx` - Added forgot password link
- `/features/onboarding/UnifiedOnboarding.tsx` - Updated duplicate email handling
- `/app.json` - Deep link configuration

