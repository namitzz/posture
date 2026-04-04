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

## Use without your laptop nearby
If you do not want your laptop running, host this `mobile_app/` folder online once, then install the hosted URL on your phone.

### Fast hosting options
- **Netlify Drop**: Drag the `mobile_app/` folder to https://app.netlify.com/drop
- **Vercel**: Import this repo and set output directory to `mobile_app`
- **GitHub Pages**: Serve `mobile_app/` from your repo pages branch

After deploy, open the public HTTPS URL on your phone and add it to Home Screen.

## Notes
- First load needs internet for MediaPipe model/CDN resources.
- Camera permission is required.
- HTTPS is required on most phones for camera access.
