# Refs

Currently:

New ref flow
Attaching ref to user flow
[x]
Updating a ref flow

Debugging local build

add profile links

improve existing UI
Make sure the keyboard issue is resolved

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

### Building in EAS

```
eas build --platform ios
```

### Building in Xcode locally

Install dependencies:

```
npm i
```

Build the JS bundle that will be deployed in the generated Xcode app:

```
npx expo export:embed --platform ios --bundle-output './ios/main.jsbundle' --assets-dest ios
```

Open the iOS application in Xcode. Navigate to the iOS directory and open
refsinternetphonebook.xcodeproj, or you can do this from the command line:

```
open ios/refsinternetphonebook.xcodeproj
```

In Product > Destination, select the destination you would like to build the
iOS app for.

Use `Cmd-R` to run the application, or `Cmd-B` to generate a build without
running the application.

### Regenerating the iOS Application

If you ever re-generate the iOS app using `npx expo prebuild`, you will need to
update the app so that you can build it locally. You should avoid this if possible,
but if it's necessary, you will need to take these steps after generating a new
prebuild:

* In Product > Scheme > Edit Scheme, select "Release" as the build configuration.
* In Xcode, in the application's directory tree, drag main.jsbundle from the `ios`
  directory to the root of the application directory tree underneath the main app.
  You will be prompted to add the jsbundle to the application and should accept.
* Underneath the `refsinternetphonebook` bulid configuration, under
  Signing & Capabilities, select a valid Team for building the application.

### Server Build

```
npm i
npm run server
```
