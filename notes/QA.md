# Quality Assurance notes

We want to have a systematic and repeatable way to test the app, in order to:

1. Detect when code changes have introduced regressions
2. Allow developers and collaborators to understand what the current "feature set" of the app is
3. Give collaborators reviewing each others' code a starting point for manual QA testing
4. Allow us to check whether the app is ready for production release

Right now this consists of a sequence of steps that a user can take to check the various features of the app. At each step, the plan describes what the user should expect to see, what the user should be able to do and the expected effects of those actions.

## Testing plan

### Landing page

Upon opening the app for the first time, the user is not logged in. The app displays the "Landing page" view, which consists of a heading "Refs is the phonebook for the internet", "Join" and "Login" buttons in the centre of the page and a spinning "my neighborhood" graphic at the bottom-right of the page.

Pressing the "Join" button brings you to the "Onboarding" view. Pressing the "Login" button brings you to the "Log in" view.

### Onboarding

The onboarding view consists of a carousel with three items showing 1. a preview grid, 2. example refs and 3. a visualisation of the search feature. The user can navigate between these screens by pressing the "Next" button or by swiping left/right. On the third screen, the "Next" button is replaced with an "I'm ready" button. Pressing this brings the user to the "Sign up" view.

### Sign up

The sign up view is a form that consists of a sequence of screens, where the user can input information to create a new Refs account. The user can only progress to the next screen by clicking the "Next" button if they have provided valid information. If the information given is invalid, the screen must display an error message to the user. The steps are as follows:

- Email: there is one text input where the user must provide a syntactically valid email address (i.e. something@somewhere.com)
- Name: there are two text inputs, a "First Name" and "Last Name". Both fields must be filled in.
- Location: a location must be selected - this can either be done by selecting the location from the dropdown menu, or by pressing "Let us determine your location", which looks up the location based on the device's current location. If a location is found which is not in the list of options, it is listed as "Elsewhere". The "Reset" button resets the currently selected location.
- Password: there are two text (password) inputs, one for the password and one for the password confirmation. The password must be at least 8 characters long and have at least one uppercase letter, one lowercase letter, one number and one special character. The password and the password confirmation must be identical.
- Image: the user must upload an image. The next button has the label "Register". This submits the form data and creates the user and logs the new user in to the app.
- Notifications: The last view asks the user if they would like to be notified when the app goes live in their area. This switch should enable Push Notifications. Pressing the "Done" button should bring the user to the User Profile view.

### Log in

The log in view consists of two screens. On each screen, there are input fields and a submit button. The submit button is only enabled if the input fields have valid input.

- Email: There is a single text input with the label "Login with email". The "Next" button is clickable if the email field contains a syntactically valid email address.
- Password: There is a single password text input with the label "Password". The "Log in" button is clickable if a password is given (i.e. is a non-empty string).

When the "Log in" button is pressed, the email and password that were given by the user are submitted to the server. If the email and password combination is correct, the user is redirected to their user profile page. If the email and password combination is incorrect, an error message "Login unsuccessful" is displayed.

### User profile

TODO: fill this in

#### View ref details

TODO: fill this in

#### Search user's refs

TODO: fill this in

#### Add new ref to profile

TODO: fill this in

- from search
- from camera roll

#### Add new ref to backlog

TODO: fill this in

- from search
- from camera roll

### Feed

TODO: fill this in

#### Search feed

TODO: fill this in

### Other user's profile

TODO: fill this in

#### View ref details

TODO: fill this in

#### Search other user's refs

TODO: fill this in

#### Message

TODO: fill this in

#### Save

TODO: fill this in
