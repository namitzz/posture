# Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────┐
│                   PostureApp (main.py)                  │
│                  Main Application Loop                   │
└────────┬──────────┬──────────┬──────────┬───────────────┘
         │          │          │          │
    ┌────▼────┐ ┌──▼────┐ ┌───▼─────┐ ┌──▼────────┐
    │  Pose   │ │ Squat │ │  Audio  │ │    AI     │
    │Detector │ │Analyzer│ │  Cues   │ │  Coach    │
    └────┬────┘ └───┬────┘ └────┬────┘ └─────┬─────┘
         │          │           │            │
    ┌────▼──────────▼───────────▼────────────▼─────┐
    │           Camera Feed / Results              │
    └──────────────────────────────────────────────┘
```

## Component Details

### 1. PoseDetector (pose_detector.py)

**Purpose**: Real-time pose estimation using MediaPipe BlazePose

**Key Features**:
- Detects 33 body landmarks
- Tracks full-body skeleton
- Normalizes coordinates
- Provides visibility scores

**Technology**: MediaPipe BlazePose
- Model complexity: 1 (balanced)
- Confidence threshold: 0.7
- Smooth landmark tracking enabled

**Output**: 33-point skeleton with (x, y, z, visibility) per landmark

### 2. SquatAnalyzer (squat_analyzer.py)

**Purpose**: State machine for rep counting and form analysis

**State Machine**:
```
STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING
   ↑                                            │
   └────────────────────────────────────────────┘
                  (Rep Complete)
```

**States**:
- `STANDING`: Knees > 160° (nearly straight)
- `DESCENDING`: Knees < 140° (starting descent)
- `BOTTOM`: Knees < 100° (deep squat position)
- `ASCENDING`: Knees > 140° (rising back up)

**Form Checks**:
1. **Depth**: Knee angle at bottom
   - Good: < 90° (parallel or below)
   - Shallow: > 100°

2. **Knee Alignment**: Distance between knees vs hips
   - Issue: Knees significantly closer than hips (valgus)
   - Threshold: 15% width reduction

3. **Torso Position**: Hip angle
   - Issue: < 70° (excessive forward lean)

**Output**: 
- Current state
- Rep count
- Joint angles
- Form feedback list
- Set summary with statistics

### 3. AudioCueSystem (audio_cues.py)

**Purpose**: Non-intrusive audio feedback using TTS

**Features**:
- Queue-based processing
- Cooldown system (3 seconds per cue)
- Threaded execution (non-blocking)
- Audio ducking ready (lowers music volume)

**Cues**:
- "Knees out" - Push knees outward
- "Chest up" - Keep torso upright  
- "Go deeper" - Increase squat depth
- "Good" - Rep milestone (every 5 reps)
- "Set complete" - End of set

**Technology**: pyttsx3 (cross-platform TTS)

**Audio Ducking**:
In production implementation:
1. Request audio focus (Android) or begin interruption (iOS)
2. Lower background music volume (ducking)
3. Play cue
4. Restore music volume
5. Release audio focus

### 4. AICoach (ai_coach.py)

**Purpose**: Post-set coaching using GPT-4

**Input**: Set summary with:
- Total reps
- Average depth angle
- Form issues breakdown
- Individual rep data

**Process**:
1. Construct prompt with statistics
2. Call GPT-4 with coaching system message
3. Generate 2-3 sentence feedback
4. Return natural language coaching

**Fallback**: Rule-based summary if API unavailable

**Example Output**:
> "Great depth consistency! All reps were at or below parallel. 
> Watch for knee alignment - noticed some valgus on reps 3 and 5. 
> Focus on pushing knees outward throughout the movement."

### 5. Utils (utils.py)

**Purpose**: Mathematical utilities

**Functions**:
- `calculate_angle(a, b, c)`: 3-point angle calculation
- `calculate_distance(p1, p2)`: Euclidean distance
- `normalize_coordinates()`: Pixel value normalization
- `is_visible()`: Visibility threshold check

## Data Flow

### Real-Time Loop (30+ FPS)

```
1. Camera Frame
   ↓
2. Pose Detection (MediaPipe)
   ↓
3. Landmark Extraction
   ↓
4. Angle Calculation (utils)
   ↓
5. State Machine Update (analyzer)
   ↓
6. Form Analysis
   ↓
7. Audio Feedback (if needed)
   ↓
8. UI Overlay
   ↓
9. Display Frame
```

### Post-Set Flow

```
1. User stops tracking
   ↓
2. Get set summary (analyzer)
   ↓
3. Announce completion (audio)
   ↓
4. Generate AI coaching (ai_coach)
   ↓
5. Display summary
   ↓
6. Reset for next set
```

## Performance Considerations

### Frame Rate
- Target: 30 FPS
- MediaPipe latency: ~33ms per frame
- Angle calculations: <1ms
- State machine: <1ms
- **Total**: ~35ms per frame (28+ FPS achievable)

### Memory
- MediaPipe model: ~30MB
- Per-frame data: <1KB
- Set history: ~1KB per rep
- **Total**: ~35MB typical usage

### CPU Usage
- MediaPipe (pose detection): 20-40% single core
- Python logic: <5% single core
- Audio TTS: <5% single core
- **Total**: ~30-50% CPU on average hardware

## Scalability

### Additional Exercises
To add new exercises:
1. Create new analyzer class (e.g., `DeadliftAnalyzer`)
2. Define states and transitions
3. Implement form checks
4. Integrate with main app

Example structure:
```python
class DeadliftAnalyzer:
    states = [STANDING, SETUP, PULL, LOCKOUT]
    form_checks = [back_angle, bar_path, hip_hinge]
```

### Mobile Deployment

**Android** (recommended approach):
- Use MediaPipe Android SDK (native)
- Implement in Kotlin/Java
- Use Android audio focus for ducking
- Keep Python logic for prototyping

**iOS**:
- Use MediaPipe iOS SDK
- Implement in Swift
- Use AVAudioSession for interruption
- Core ML for on-device inference

### Cloud Features

Future enhancements:
- Store workout history
- Aggregate form analytics
- Compare to peer data
- Train personalized models
- Social features

## Security & Privacy

### Data Handling
- All pose detection happens **on-device**
- No video frames sent to cloud
- Only statistics sent to OpenAI (optional)
- No personally identifiable information

### API Keys
- Stored in environment variables
- Never committed to version control
- Users provide their own keys
- Fallback mode without API access

## Testing Strategy

### Unit Tests
- State machine transitions
- Angle calculations
- Form detection rules
- Summary generation

### Integration Tests
- Full rep cycle simulation
- Multi-rep sets
- Edge cases (partial reps, lost tracking)

### Manual Testing
- Real squat videos
- Different body types
- Various camera angles
- Lighting conditions

## Future Architecture

### Microservices (Production)
```
Mobile App ──┐
             ├─→ API Gateway ──┬─→ Pose Service
Web App ─────┘                ├─→ Analytics Service
                              ├─→ Coaching Service
                              └─→ User Service
```

### Machine Learning Pipeline
```
Raw Data → Preprocessing → Feature Extraction → Model Training → Deployment
   ↓                                                                 ↓
Historical Workouts                                          Personalized Models
```

## Dependencies

### Core
- **MediaPipe**: Pose detection (Google)
- **OpenCV**: Video processing
- **NumPy**: Mathematical operations

### Features
- **pyttsx3**: Text-to-speech
- **OpenAI**: GPT-4 API client
- **pygame**: Audio support

### Development
- **pytest**: Testing framework
- **python-dotenv**: Environment management

## Deployment Considerations

### Hardware Requirements
- **Minimum**: Laptop with webcam, 4GB RAM
- **Recommended**: Modern smartphone, 8GB RAM
- **Optimal**: Dedicated tablet on tripod

### Network
- Optional for basic features
- Required for AI coaching
- ~1KB per API call
- No streaming/continuous connection needed

### Battery
- Pose detection: Significant CPU usage
- Recommendations: Plugin power for long sessions
- Mobile: ~2-3 hours typical usage
