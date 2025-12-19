# Examples

This directory contains example scripts demonstrating the posture correction features.

## demo_squat_analysis.py

A command-line demo that simulates squat analysis without requiring a camera.

**Features:**
- Simulates squat reps with and without form issues
- Demonstrates the rep counting state machine
- Shows form feedback detection
- Displays AI coaching summaries

**Run it:**
```bash
cd examples
python demo_squat_analysis.py
```

**What you'll see:**
1. Set 1: 5 squats with perfect form
   - Watch rep counting
   - See analysis results
   - Get AI coaching feedback

2. Set 2: 5 squats with form issues
   - Some reps have knee valgus (knees caving in)
   - System detects and reports issues
   - AI provides corrective advice

## Coming Soon

- `demo_camera.py` - Test camera feed without full app
- `demo_audio.py` - Test audio cue system
- `demo_ai_coach.py` - Interactive AI coaching session
