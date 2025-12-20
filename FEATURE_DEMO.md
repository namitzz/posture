# GPT-Based Coaching Feedback - Feature Demo

## Quick Demo

### 1. Run Demo Script (No Camera Required)
```bash
python examples/demo_gpt_coaching.py
```

**Expected Output:**
```
============================================================
GPT COACHING FEEDBACK DEMO
============================================================

Simulating 5 squat reps with varying form...

Rep 1: Performing good form squat...
Rep 2: Performing squat with shallow depth...
Rep 3: Performing good form squat...
Rep 4: Performing squat with knee valgus...
Rep 5: Performing good form squat...

Completed 3 reps!

============================================================
SET SUMMARY
============================================================
Total Reps: 3
Average Depth: 97.1°

Per-Rep Analysis:
- Rep 1: Depth good, knees stable, chest upright
- Rep 2: Depth shallow, knees caved in, chest upright
- Rep 3: Depth good, knees stable, chest upright

🤖 AI COACH FEEDBACK:
Great work! Watch for shallow depth and knee stability in some reps.
============================================================
```

### 2. Test Edge Cases
```bash
python examples/test_edge_cases.py
```

**Expected Output:**
```
✓ <3 reps: Returns "Do more reps to receive coaching"
✓ API failure: Returns "Couldn't get feedback. Try again later."
ALL EDGE CASES PASSED! ✓
```

### 3. Verify Prompt Format
```bash
python examples/verify_prompt_format.py
```

**Expected Output:**
```
✓ Starts with 'Here is the summary of X squat reps:'
✓ Contains per-rep summaries
✓ Contains instruction for 2-3 sentences
✓ Mentions 'like a human strength coach'
✓ Asks to be supportive
✓ Asks to point out errors

PROMPT FORMAT VERIFIED! ✓
```

## Live Demo (With Camera)

### Setup
```bash
# 1. Set API key
export OPENAI_API_KEY='your-key-here'

# 2. Run application
python src/main.py
```

### Usage Flow

1. **Start Tracking**
   - Position in front of camera (side view, 6-8 feet away)
   - Press **SPACE** to start

2. **Perform Set**
   - Do 3+ squats with varying form
   - See real-time feedback on screen

3. **Stop & Review**
   - Press **SPACE** to stop
   - View per-rep analysis in console
   - See AI coaching on screen overlay

4. **Audio Playback** (Optional)
   - Press **P** to hear coaching via TTS

5. **Reset for Next Set**
   - Press **R** to reset counter
   - Coaching feedback auto-hides

## Example Coaching Outputs

### Scenario 1: All Good Reps
```
Input:
- Rep 1: Good rep
- Rep 2: Good rep
- Rep 3: Good rep

GPT Output:
"Excellent work! All three reps showed great form with proper 
depth and knee alignment. Keep up this consistency!"
```

### Scenario 2: Mixed Form
```
Input:
- Rep 1: Depth good, knees stable
- Rep 2: Depth shallow, knees caved in
- Rep 3: Depth good, chest leaned forward
- Rep 4: Good rep
- Rep 5: Depth good, knees stable

GPT Output:
"Great effort overall. Watch for shallow depth on rep 2 and 
knee instability on rep 2. Also maintain chest position on 
rep 3. Otherwise, you're showing solid control!"
```

### Scenario 3: Edge Case - Too Few Reps
```
Input: 2 reps completed

Output:
"Do more reps to receive coaching"
```

## Visual Features

### Console Output
```
==================================================
SET SUMMARY
==================================================
Total Reps: 5
Average Depth: 88.3°

Per-Rep Analysis:
- Rep 1: Depth good, knees stable, chest upright
- Rep 2: Depth shallow, knees caved in, chest upright
...

🤖 AI COACH:
   [Coaching feedback appears here]
==================================================
```

### On-Screen Overlay
```
┌────────────────────────────────────────────┐
│ AI COACH FEEDBACK                          │
│                                            │
│ Great effort overall. Watch for shallow   │
│ depth on rep 2 and knee instability on    │
│ rep 2. Otherwise, you're showing solid    │
│                                            │
│ Press 'P' to play audio                   │
└────────────────────────────────────────────┘
```

## Key Features Demonstrated

✅ **Per-Rep Tracking**: Each rep analyzed individually
✅ **Form Metrics**: Depth, knee stability, chest angle
✅ **GPT Integration**: Natural language coaching
✅ **UI Display**: Both console and overlay
✅ **Audio Playback**: Optional TTS
✅ **Edge Cases**: Graceful handling of errors
✅ **User Controls**: Space, R, P, Q keys

## Troubleshooting

**Issue**: "OPENAI_API_KEY not set"
- **Fix**: Set environment variable or create `.env` file

**Issue**: "Couldn't get feedback. Try again later."
- **Check**: API key validity, internet connection

**Issue**: No coaching displayed
- **Check**: Must complete 3+ reps for GPT feedback
- **Try**: Ensure full squat range of motion

## Files to Explore

1. `src/squat_analyzer.py` - Per-rep summary generation
2. `src/ai_coach.py` - GPT integration & prompt
3. `src/main.py` - UI display & user interaction
4. `tests/test_gpt_coaching.py` - Unit tests
5. `docs/GPT_COACHING.md` - Full documentation

---

**Feature Status**: ✅ Production Ready
