# Frequently Asked Questions (FAQ)

## General

### What is this app?

A real-time gym form correction app that uses your camera and AI to analyze your exercise form while you're working out, providing instant audio feedback and post-set coaching.

### Is it free?

Yes! The app is open source (MIT License). You only need an OpenAI API key for AI coaching features, which is optional.

### What exercises are supported?

Currently: **Squats** only

Coming soon: Deadlifts, Bench Press, Overhead Press, and more.

### Do I need special equipment?

No. Just:
- A computer/laptop with a webcam OR
- A smartphone/tablet (mobile app coming soon)
- Internet connection (optional, only for AI coaching)

## Installation & Setup

### What are the system requirements?

**Minimum:**
- Python 3.8+
- 4GB RAM
- Webcam
- Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)

**Recommended:**
- Python 3.10+
- 8GB RAM
- HD webcam
- Modern CPU (Intel i5 or equivalent)

### How do I install it?

```bash
git clone https://github.com/namitzz/posture.git
cd posture
pip install -r requirements.txt
```

See [QUICKSTART.md](QUICKSTART.md) for details.

### Do I need an OpenAI API key?

**No**, the app works without it. You'll just get basic summaries instead of AI-powered coaching.

To enable AI coaching:
1. Get a key from [platform.openai.com](https://platform.openai.com)
2. Add it to `.env` file or set as environment variable

### How much does OpenAI API cost?

GPT-4 pricing: ~$0.03 per 1K tokens. A typical workout session uses ~500-1000 tokens total, costing **$0.01-0.03 per workout**.

## Usage

### How do I use it?

1. Run: `python src/main.py`
2. Position yourself in front of camera (full body visible, side view)
3. Press SPACE to start tracking
4. Do your squats
5. Press SPACE to stop and see feedback

See [USAGE.md](USAGE.md) for detailed guide.

### Why isn't the app detecting me?

**Common issues:**
- Not enough light (face a light source)
- Too close to camera (stand 6-8 feet away)
- Body partially out of frame (ensure head-to-toe visibility)
- Wearing baggy clothes (fitted clothing works better)

### Why aren't reps being counted?

**Rep requirements:**
- Start from standing (knees nearly straight)
- Squat down (knees < 100°)
- Return to standing

If reps still aren't counting:
- Squat deeper (aim for thighs parallel to ground)
- Stand fully upright between reps
- Check that skeleton is tracking your legs correctly

### Can I use it without a camera?

Yes! Try the demo:
```bash
python examples/demo_squat_analysis.py
```

This simulates squat tracking without needing a camera.

### What's the best camera angle?

**Side view** works best:
- Stand perpendicular to camera
- Camera at hip height
- 6-8 feet distance
- Full body in frame

**Front view** works but is less accurate for depth detection.

### Does the audio interrupt my music?

It's designed not to! The app uses short voice cues and implements "ducking" (briefly lowering music volume).

**Current status:** Basic TTS implementation
**Coming soon:** Full ducking support on mobile (Android/iOS)

## Technical

### How does pose detection work?

We use **MediaPipe BlazePose** by Google:
- Detects 33 body landmarks in real-time
- Runs on-device (no cloud required)
- ~30ms latency per frame
- Works with CPU (no GPU needed)

### How accurate is the form analysis?

**Limitations:**
- Not a replacement for a human coach
- Works best with good camera angle and lighting
- May miss subtle form issues
- Can have false positives

**Best practices:**
- Use as a training tool, not gospel
- Cross-reference with professional coaching
- Focus on consistent cues, not perfect scores

### Is my data safe?

**Yes!** 
- All pose detection happens **on your device**
- No video frames are sent to the internet
- Only text statistics sent to OpenAI (if enabled)
- No personal information collected
- Open source - you can verify the code

### Can I run it on my phone?

Not yet! Current version is desktop/webcam only.

**Coming soon:**
- Android native app
- iOS native app

In the meantime, you can use a laptop with webcam.

### What about performance on older computers?

**Minimum specs work**, but:
- Expect 15-20 FPS (vs 30 FPS on modern hardware)
- May need to reduce model complexity
- Close other apps to free up CPU

**To optimize:**
Edit `src/pose_detector.py`:
```python
model_complexity=0  # Lower complexity (faster, less accurate)
```

### Can I use a USB webcam?

Yes! If it's not camera 0, edit `src/main.py`:
```python
cap = cv2.VideoCapture(1)  # Try 1, 2, etc.
```

## Form & Training

### What defines good squat form?

The app checks:
1. **Depth**: Thighs parallel to ground or lower (knee angle <90°)
2. **Knee alignment**: Knees track over toes (no valgus)
3. **Torso position**: Chest up, minimal forward lean

### Can beginners use this?

**Absolutely!** Perfect for:
- Learning proper squat form
- Building good habits early
- Getting feedback without a trainer

**But:** Start with bodyweight squats. Add weight only after mastering form.

### Should I trust the app over my coach?

**No.** The app is a tool, not a replacement for:
- Professional coaching
- In-person feedback
- Medical advice

Use it as supplementary feedback between training sessions.

### Can I use it for competitive lifting?

It's designed for **general fitness**, not powerlifting competition prep.

For serious training:
- Work with a qualified coach
- Use video analysis
- Get in-person feedback
- Use this app for daily practice

## Troubleshooting

### "ModuleNotFoundError: No module named 'X'"

Install dependencies:
```bash
pip install -r requirements.txt
```

### Camera won't open

**Windows:**
- Settings > Privacy > Camera
- Allow apps to access camera

**macOS:**
- System Preferences > Security & Privacy > Camera
- Grant terminal/Python permission

**Linux:**
```bash
sudo usermod -a -G video $USER
# Then log out and back in
```

### Audio not working

**Windows:** Install [eSpeak](http://espeak.sourceforge.net/)

**Linux:**
```bash
sudo apt-get install espeak
```

**macOS:** Should work by default (built-in TTS)

### App is slow/laggy

1. Close other applications
2. Reduce model complexity (see "Performance" above)
3. Lower camera resolution (edit `main.py`)
4. Check CPU temperature (may be thermal throttling)

### "OpenAI API error"

- Check your API key is correct
- Verify you have API credits
- Check internet connection
- The app works without API (basic summaries only)

## Contributing

### Can I contribute?

**Yes please!** We need:
- New exercise modules (deadlift, bench, etc.)
- Mobile app development
- UI/UX improvements
- Documentation
- Bug fixes

See [CONTRIBUTING.md](CONTRIBUTING.md).

### I'm a fitness coach. How can I help?

**We need your expertise!**
- Review form detection rules
- Suggest improvements
- Validate biomechanics
- Test with real clients (with permission)

Open an issue or PR with your feedback!

### I found a bug. What do I do?

1. Check if it's already reported: [Issues](https://github.com/namitzz/posture/issues)
2. If not, open a new issue with:
   - Description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Your system info

## Future Plans

### What features are coming?

**Soon:**
- Deadlift tracking
- Bench press tracking
- Mobile apps (Android/iOS)

**Later:**
- Workout history
- Progress tracking
- Multiple users
- Cloud sync
- Social features

See [CHANGELOG.md](CHANGELOG.md) for roadmap.

### Will there be a paid version?

Currently no plans for paid features. The app is free and open source.

**Possible future:**
- Premium cloud features (optional)
- Advanced analytics (optional)
- Core app will always be free

### Can I use this commercially?

Yes! MIT License permits commercial use.

**Requirements:**
- Include copyright notice
- Include copy of license
- See [LICENSE](LICENSE) for details

## Still Have Questions?

- 📖 Check the [documentation](README.md)
- 🐛 Open an [issue](https://github.com/namitzz/posture/issues)
- 💡 Start a [discussion](https://github.com/namitzz/posture/discussions)

---

**Didn't find your answer? Open an issue and we'll update this FAQ!**
