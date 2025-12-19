# Usage Guide

## Quick Start

1. **Position yourself** in front of your webcam
2. **Run the app:**
   ```bash
   cd src
   python main.py
   ```
3. **Stand in view** so your full body is visible
4. **Press SPACE** to start tracking
5. **Perform squats** and get real-time feedback
6. **Press SPACE** again to stop and see AI coaching summary

## Keyboard Controls

| Key | Action |
|-----|--------|
| `SPACE` | Start/Stop tracking |
| `R` | Reset rep counter and get summary |
| `Q` | Quit application |

## Camera Setup

### Optimal Positioning

1. **Distance**: Stand 6-8 feet from camera
2. **Angle**: Camera should be at hip height, facing you
3. **Lighting**: Face a light source for better detection
4. **Background**: Plain background works best
5. **Full body**: Ensure head to feet are visible

### Tripod Setup (Recommended)

For best results, mount your phone or camera on:
- Tripod or phone stand
- Stable chair or table
- At appropriate height and distance

## Performing Squats

### Body Position

1. **Start standing** with feet shoulder-width apart
2. **Face the camera** (side view works better than front view)
3. **Keep visible** - don't move out of frame during reps

### What to Watch For

The app tracks:
- **Knee angle**: Ensures proper depth
- **Knee alignment**: Detects if knees cave inward
- **Torso position**: Checks for excessive forward lean
- **Rep counting**: Automatically counts complete reps

### Audio Cues

You'll hear:
- **"Knees out"** - Push knees outward
- **"Chest up"** - Keep torso upright
- **"Go deeper"** - Squat lower for proper depth
- **"Good"** - Every 5 reps
- **"Set complete"** - When you stop tracking

**Note:** Audio cues use "ducking" technology - they briefly lower your music volume, then restore it.

## Understanding Feedback

### Real-Time Display

The screen shows:
- **Status**: TRACKING or PAUSED
- **Rep Count**: Current number of reps
- **State**: standing, descending, bottom, or ascending
- **Knee Angle**: Current knee bend (degrees)
- **Form Checks**: Instant feedback on form issues

### Angle Guidelines

- **180°**: Standing straight
- **140°**: Start of descent
- **100°**: Bottom of squat (goal: <90° for parallel)
- **90°**: Parallel depth (thighs parallel to ground)

### Set Summary

After stopping or resetting, you'll see:
- **Total Reps**: Number completed
- **Average Depth**: Mean knee angle at bottom
- **Form Issues**: Count of each problem detected
- **AI Coaching**: Personalized feedback from GPT-4

## Tips for Best Results

### 1. Wear Fitted Clothing
- Avoid baggy clothes that hide joint positions
- Shorts and t-shirt work best
- Contrasting colors help detection

### 2. Good Lighting
- Face toward light source
- Avoid backlighting (don't stand in front of window)
- Consistent lighting across your body

### 3. Start Slow
- Do 1-2 practice reps to ensure detection works
- Watch the skeleton overlay on screen
- Adjust position if joints aren't tracking well

### 4. Focus on Form
- Prioritize form over speed
- Listen to audio cues
- Take breaks between sets

### 5. Use the Summary
- Read the AI coaching after each set
- Track common issues across workouts
- Adjust form based on feedback

## Workout Flow Example

### Beginner Set (3x10)

1. **Set 1**: 10 reps
   - Press SPACE to start
   - Complete 10 squats with focus on form
   - Press SPACE to stop
   - Read AI coaching
   - Rest 90 seconds

2. **Set 2**: 10 reps
   - Press R to reset counter
   - Press SPACE to start
   - Complete 10 reps
   - Apply feedback from Set 1
   - Rest 90 seconds

3. **Set 3**: 10 reps
   - Press R to reset
   - Complete final 10 reps
   - Review all feedback

### Progressive Approach

**Week 1-2**: Focus on depth
- Goal: Consistent depth to parallel
- Don't worry about rep count

**Week 3-4**: Focus on knee alignment
- Goal: Keep knees tracking over toes
- No knee valgus (caving in)

**Week 5-6**: Focus on torso position
- Goal: Maintain upright chest
- Minimize forward lean

## Troubleshooting

### Skeleton Not Appearing
- Step back from camera
- Ensure full body is visible
- Improve lighting
- Remove obstructions

### Rep Not Counting
- Squat deeper (below 100° knee angle)
- Complete full range of motion
- Stand fully upright between reps

### Too Much Feedback
- Audio has 3-second cooldown
- Focus on one cue at a time
- Start with slower reps

### AI Coaching Not Working
- Verify OPENAI_API_KEY is set
- Check internet connection
- See fallback summary if API unavailable

## Advanced Features

### Customizing Audio
Edit `src/audio_cues.py` to:
- Change voice rate/volume
- Select different voice
- Adjust cooldown timing

### Recording Sessions
- Consider using OBS or similar to record screen
- Review footage later for detailed analysis
- Track progress over time

## Safety Notes

⚠️ **Important:**
- This app is a training tool, not medical advice
- Consult a fitness professional for personalized guidance
- Stop immediately if you experience pain
- Don't sacrifice form for rep count
- This is a prototype - use professional judgment

## Next Steps

- Track your workouts in a journal
- Note improvements in form issues
- Gradually increase volume (sets/reps)
- Join the community (coming soon)
- Share feedback to improve the app
