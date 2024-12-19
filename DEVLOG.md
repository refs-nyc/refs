Currently:

New ref flow
Attaching ref to user flow
[x]
Updating a ref flow

Debugging local build
[x]

add profile links

improve existing UI
Make sure the keyboard issue is resolved
[x]

test notifications

run
eas build --profile preview --local && tput bel
eas build --profile preview --local --non-interactive && tput bel

Step 1 Remove providers
Result: Still white screen

Step 2 Render just a RED screen by setting background color.
Note: also moved SystemUI call into useEffect
Result: Still white screen

Step 3
Just render a "bare" expo layout. With Splash screen. Remove all else
Result:

4. MUST HAVES
   [] Share profile link
   [] Lists MVP
   [] Store Push Token

1. Onboarding flow
   [x] Landing Page Design
   [] Be able to add refs in onboarding
1. Add ref flow
   [] Empty search results
   [] Weird search result typing
   [] FOrm validation
1. Nice to have
   [] Ref category
   [] Moving refs to Backlog / Deleting them
   [] Dragging Refs around Profile
   [] Swipe for a random other profile
