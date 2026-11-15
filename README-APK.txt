Stalker TV - Android (phone / tablet / Android TV)
===================================================
This folder is a complete Android project. You do NOT need Android Studio: GitHub builds the APK for you.

Option A - GitHub (no installs, ~5 minutes)
 1. Create a free account on github.com and make a NEW repository (private is fine).
 2. Upload everything in this folder to it (drag the files in, keep the ".github" folder).
 3. Open the "Actions" tab -> "Build APK" -> wait for the green check.
 4. Open the finished run -> "Artifacts" -> download StalkerTV-apk -> unzip -> app-debug.apk.
 5. Copy app-debug.apk to the phone / TV box and install it (allow "install unknown apps").

Option B - Android Studio: open this folder, press Run (or Build > Build APK).

Remote / keyboard: arrows, OK, Back, color keys, channel +/-, 0-9 all work.
Phone: tap = OK, swipe = move, Back button = back.
Same features as the TV app (EPG, subtitles, quality, screen fit...). Playback uses ExoPlayer (HLS, TS, MP4, MKV).
Note: some audio formats (AC3/E-AC3) depend on the device's decoder.
