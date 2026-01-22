# Notiflow Mobile (Flutter)

Cliente móvil de Notiflow (iOS/Android) construido con Flutter. Incluye login y mensajería alineada con el frontend web.

## Requisitos
- Flutter 3.5+ (Dart SDK incluido)
- Xcode (para iOS) y CocoaPods (`pod install`)
- Android SDK + emulador o dispositivo físico

## Setup rápido
```bash
cd mobile_flutter
flutter pub get
# iOS: instala pods si es la primera vez
cd ios && pod install && cd ..
```

## Ejecutar en desarrollo
```bash
# Lista dispositivos disponibles
flutter devices
# Ejecuta en un simulador o dispositivo
flutter run -d <device_id_or_name>
```

## Builds de release
```bash
# iOS (sin firmar, usa Xcode para firmar/IPA)
flutter build ios --release --no-codesign

# Android APK
flutter build apk --release
```

## Configuración clave
- Bundle identifier iOS: `cl.notiflow.app` (ver Runner.xcodeproj).
- Versionado: `pubspec.yaml` (`version: x.y.z+build`) se propaga a iOS/Android.
- Firebase: reemplaza `ios/Runner/GoogleService-Info.plist` y `android/app/google-services.json` con los de tu proyecto si usas otros entornos.
