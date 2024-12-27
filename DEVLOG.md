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
1. Add ref flow
   [] Empty search results
   [] Weird search result typing
   [] FOrm validation
1. Nice to have
1. [ ] OTP password integration

IDES
[] Swipe for a random other profile

1. Detail view Carousel
   [x]
2. Quick feed
   [x]
3. Lists

tomorrow: auth/notifs + list

AUTH

1. [x] Setup DB to switch over profiles
2. [x] Adjust UI
3. [x?] API RULES

LISTS

1. Add UI to start a list

<!-- Bug: on first join, make sure we can add to grid -->

Switch email sign in

- [x] Be able to add refs in onboarding
- [x] Moving refs to Backlog / Deleting them
- [ ] Dragging Refs around Profile -> on branch
      Lists
- [ ] Add lists
- [ ] Notifications test

Friday: place/art/neither flow + feed of refs
[] Add Ref category to db
Sat: tuning it all up, squashing bugs
3m

Mini Roadmap

- [ ] Integrate Lists
- [ ] Improve lacking parts of the new ref UI
- [ ] Implement a basic search so the search bar does something

- [ ] Universal links for easy sharing of profile / profile item

  28.12.2024
  New data structure to add notes and type on refs
  Moved the type field to the ref instead of on the item.
  An item can now have a boolean that says it's a list.
