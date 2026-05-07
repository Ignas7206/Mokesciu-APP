# Android Build

Sitas projektas ruosiamas Android versijai per Capacitor.

Oficiali logika pagal Capacitor docs:

- instaliuojamas `@capacitor/android`;
- paleidziamas `npx cap add android`;
- web failai nukopijuojami i Android projekta per `npx cap sync android`;
- `.aab` generuojamas Android Studio arba Gradle.

Saltiniai:

- https://capacitorjs.com/docs
- https://developer.android.com/build/building-cmdline

## Pirmas setup kompiuteryje

```powershell
npm install
npm run cap:add:android
```

Po sito atsiras `android/` aplankas.

## Kiekvienas app pakeitimas

```powershell
npm run cap:sync
```

## Atidaryti Android Studio

```powershell
npm run cap:open
```

Android Studio viduje galima paleisti ant telefono arba sugeneruoti signed Android App Bundle.

## Google Play failas

Google Play reikia `.aab`, ne paprasto `.apk`.

Android Studio kelias:

1. Build.
2. Generate Signed App Bundle / APK.
3. Android App Bundle.
4. Sukurti arba pasirinkti keystore.
5. Release build.

Keystore slaptazodziu ir failo negalima kelti i GitHub.
