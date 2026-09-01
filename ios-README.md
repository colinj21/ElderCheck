# ElderCheck — Finishing the iOS Build

Everything that can be prepared without a Mac is done: the Xcode project,
app icon, splash screen, and app config are all generated and included in
`eldercheck-ios.zip`. This project uses Swift Package Manager (not
CocoaPods), so there's no extra dependency-manager install step — Xcode
handles it automatically.

## What's already done
- Xcode project generated (Capacitor + Swift Package Manager)
- App icon (1024×1024, moss-green checkmark) placed in the asset catalog
- Splash screen images placed in the asset catalog
- Display name set to "ElderCheck"
- Orientation locked to portrait
- App points at the live site: https://eldercheck-polished-colinjat2-7599s-projects.vercel.app

## What you need on your Mac

**Requirements:** a Mac, Xcode (free, via the Mac App Store), and an Apple ID.
For actually publishing to the App Store, you'll also need an Apple Developer
Program membership ($99/year) — you can do everything up through running the
app on your own phone without it.

### 1. Unzip and open
Unzip `eldercheck-ios.zip`, then open `ios/App/App.xcodeproj` in Xcode
(double-click it, or `open ios/App/App.xcodeproj` from Terminal).

Xcode will automatically resolve the Capacitor Swift package the first time
you open the project — this needs an internet connection and can take a
minute or two. Let it finish before doing anything else.

### 2. Set your Team (required before it will build)
- Click the blue "App" project icon at the top of the left sidebar.
- Under the "App" target, go to the "Signing & Capabilities" tab.
- Under "Team," choose your Apple ID (add it via Xcode → Settings →
  Accounts if it's not listed yet — any free Apple ID works for testing on
  your own device).
- If prompted about the Bundle Identifier (`com.eldercheck.app`) already
  being in use, change it to something unique, e.g. `com.yourname.eldercheck`.

### 3. Run it on your phone (no paid account needed for this)
- Plug your iPhone into your Mac.
- In Xcode's toolbar, select your phone as the run destination (top bar,
  next to the Play button).
- Press Play (▶). Xcode will build and install the app on your phone.
- The first time, your phone will show an "Untrusted Developer" warning —
  go to Settings → General → VPN & Device Management on the phone and trust
  your Apple ID to run it.

At this point you have a real native app running on your phone, showing the
live ElderCheck site in a branded native shell.

### 4. If you want to publish it to the App Store
This is the part that needs a paid account and a bit more setup:
- Enroll in the Apple Developer Program at developer.apple.com ($99/year).
- In Xcode, change your Team to your paid developer team.
- Go to App Store Connect (appstoreconnect.apple.com) and create a new app
  entry — you'll pick the same Bundle ID, add a name, description,
  screenshots, and a support/privacy URL (your `/legal` page works for this).
- Back in Xcode: Product → Archive, then use the Organizer window that opens
  to "Distribute App" → App Store Connect → Upload.
- Once uploaded, it shows up in App Store Connect for you to submit for
  review (usually takes anywhere from a few hours to a couple of days).

### A note on App Store review
Apple's guidelines (specifically 4.2, "Minimum Functionality") sometimes
flag apps that are just a website wrapped in a native shell, if there's no
native-feeling value beyond that. ElderCheck already behaves like a proper
mobile app (installable, full-screen, no browser chrome), which helps, but
if Apple pushes back, adding one or two native touches — push notifications
for check-in alerts being the most natural fit here — usually resolves it.
I can help build that if it comes up.

## If you change the live URL later
If you redeploy ElderCheck to a different/final domain, update the `url`
field in `capacitor.config.ts` (in this same folder) to match, then run
`npx cap sync ios` before opening Xcode again.
