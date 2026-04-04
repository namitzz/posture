# Posture Coach Mobile (PWA)

This folder contains a **usable phone app** version of Posture Coach as a Progressive Web App (PWA).

## What you get
- Live phone camera pose tracking in browser (MediaPipe Tasks Vision JS)
- Rep counting with standing/descending/bottom/ascending state machine
- Real-time form cues (knees out, chest up, go deeper)
- End-of-set summary
- Installable on Android/iOS from browser ("Add to Home Screen")

## Run locally
From repo root:

```bash
python -m http.server 8080
```

Then open:
- On your phone (same Wi-Fi): `http://<your-computer-ip>:8080/mobile_app/`
- Or directly on desktop for testing: `http://localhost:8080/mobile_app/`

## Install on phone
### Android (Chrome)
1. Open the URL above.
2. Tap menu (⋮) → **Add to Home screen**.
3. Launch like a normal app.

### iPhone (Safari)
1. Open the URL above.
2. Tap Share → **Add to Home Screen**.
3. Launch from home screen.

## Notes
- First load needs internet for MediaPipe model/CDN resources.
- Camera permission is required.
- HTTPS is required on many phones unless you are on localhost/safe local network context.
