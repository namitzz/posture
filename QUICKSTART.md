# Quick Start Guide

Get up and running with the Real-Time Gym Form Correction App in under 5 minutes!

## TL;DR

```bash
# 1. Clone
git clone https://github.com/namitzz/posture.git
cd posture

# 2. Install
pip install -r requirements.txt

# 3. Run demo (no camera needed)
python examples/demo_squat_analysis.py

# 4. Run live app
cd src
python main.py
```

## Prerequisites

- ✅ Python 3.8 or higher
- ✅ Webcam (for live tracking)
- ✅ 4GB RAM minimum

## Installation (3 steps)

### 1. Clone the Repository

```bash
git clone https://github.com/namitzz/posture.git
cd posture
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs MediaPipe, OpenCV, OpenAI, and other dependencies.

⏱️ Takes ~2-3 minutes depending on your connection.

### 3. (Optional) Set OpenAI API Key

For AI coaching features:

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your key
# OPENAI_API_KEY=sk-...
```

**Don't have an API key?** That's fine! The app works without it (you'll just get basic summaries instead of AI coaching).

## First Run

### Try the Demo (No Camera Required)

```bash
cd examples
python demo_squat_analysis.py
```

This simulates squat tracking to show you how the system works.

**What you'll see:**
- Simulated squat reps
- Rep counting in action
- Form feedback detection
- AI coaching summaries

### Run the Live App

```bash
cd src
python main.py
```

This opens your webcam and starts the real-time tracking.

**Controls:**
- `SPACE` - Start/Stop tracking
- `R` - Reset counter
- `Q` - Quit

## Camera Setup Tips

For best results:

1. **Distance**: Stand 6-8 feet from camera
2. **Position**: Camera at hip height
3. **Angle**: Side view works best
4. **Lighting**: Face a light source
5. **Visibility**: Full body (head to feet) in frame

## Your First Squat Set

1. **Run the app**: `python src/main.py`
2. **Position yourself**: Full body visible, side view
3. **Press SPACE**: Start tracking
4. **Do 5-10 squats**: Watch real-time feedback
5. **Press SPACE**: Stop and see AI summary

## Troubleshooting

### "No module named 'mediapipe'"

```bash
pip install -r requirements.txt
```

### Camera Won't Open

- **Check permissions** (Windows: Settings > Privacy > Camera)
- **Try different camera**: Edit `main.py`, change `cv2.VideoCapture(0)` to `cv2.VideoCapture(1)`

### Pose Not Detected

- Step back from camera
- Improve lighting
- Ensure full body is visible
- Remove obstructions

### Audio Not Working

**Windows**: Install [eSpeak](http://espeak.sourceforge.net/)

**Linux**: 
```bash
sudo apt-get install espeak
```

**macOS**: Should work out of the box

## Next Steps

- 📖 Read [USAGE.md](USAGE.md) for detailed instructions
- 🏗️ See [ARCHITECTURE.md](ARCHITECTURE.md) to understand how it works
- 🤝 Check [CONTRIBUTING.md](CONTRIBUTING.md) to help improve the app
- 🐛 Found a bug? Open an [issue](https://github.com/namitzz/posture/issues)

## Need Help?

- 📚 Full docs: See `INSTALL.md` and `USAGE.md`
- 🐛 Issues: [GitHub Issues](https://github.com/namitzz/posture/issues)
- 💡 Ideas: Open a feature request

## Quick Reference

| What | How |
|------|-----|
| Start tracking | Press `SPACE` |
| Stop tracking | Press `SPACE` again |
| Reset counter | Press `R` |
| Quit app | Press `Q` |
| Good squat depth | <90° knee angle |
| Camera distance | 6-8 feet |
| Best view | Side angle |

---

**Ready to lift? Let's go! 💪**
