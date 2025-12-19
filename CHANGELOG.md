# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-19

### Added - Initial Prototype Release

#### Core Features
- **Real-time pose detection** using MediaPipe BlazePose (33-point skeleton)
- **Squat form analysis** with state machine for rep counting
- **Audio feedback system** with non-intrusive voice cues
- **AI coaching integration** using OpenAI GPT-4 for post-set summaries
- **Live camera feed** with skeleton overlay visualization

#### Exercise Tracking
- Automatic rep counting for squats
- Form feedback detection:
  - Knee depth monitoring (parallel/shallow detection)
  - Knee valgus detection (knees caving in)
  - Forward lean detection (torso angle)
- Real-time joint angle calculation
- Set summary statistics

#### Audio System
- Text-to-speech voice prompts:
  - "Knees out" - Push knees outward
  - "Chest up" - Keep torso upright
  - "Go deeper" - Increase squat depth
  - Rep milestone announcements
  - Set completion announcements
- Cooldown system to prevent feedback spam (3-second intervals)
- Threaded audio processing (non-blocking)

#### AI Coaching
- Post-set natural language summaries
- Personalized feedback based on performance
- Form issue analysis and recommendations
- Fallback mode when API unavailable

#### User Interface
- Live webcam feed with pose overlay
- Real-time status display (tracking/paused)
- Rep counter
- Current state indicator (standing/descending/bottom/ascending)
- Joint angle display
- Form feedback messages
- Keyboard controls (Space/R/Q)

#### Documentation
- Comprehensive README with project overview
- INSTALL.md - Step-by-step installation guide
- USAGE.md - Detailed usage instructions
- CONTRIBUTING.md - Contribution guidelines
- ARCHITECTURE.md - System design documentation
- Example scripts with demo mode

#### Development Infrastructure
- Unit tests for squat analyzer
- Requirements.txt for dependencies
- .env.example for configuration template
- .gitignore for clean repository
- MIT License

#### Dependencies
- mediapipe 0.10.9 - Pose estimation
- opencv-python 4.8.1.78 - Video processing
- numpy 1.24.3 - Mathematical operations
- pyttsx3 2.90 - Text-to-speech
- pygame 2.5.2 - Audio support
- openai 1.3.0 - AI coaching
- python-dotenv 1.0.0 - Environment configuration
- pytest 7.4.3 - Testing framework

### Technical Details

#### Pose Detection
- Model complexity: 1 (balanced performance/accuracy)
- Detection confidence: 0.7
- Tracking confidence: 0.7
- Landmark smoothing enabled
- 33 body landmarks tracked

#### Squat State Machine
- Standing threshold: >160° knee angle
- Descent threshold: <140° knee angle
- Bottom threshold: <100° knee angle
- Good depth: <90° knee angle (parallel or below)

#### Form Analysis Thresholds
- Knee valgus: 15% hip-to-knee width reduction
- Forward lean: <70° hip angle
- Shallow depth: >100° knee angle at bottom

#### Performance
- Target frame rate: 30 FPS
- Typical latency: ~35ms per frame
- Memory usage: ~35MB
- CPU usage: 30-50% on average hardware

### Known Limitations

- Desktop/webcam only (mobile apps planned for future)
- Squats only (deadlift/bench press coming soon)
- Side view works better than front view
- Requires good lighting for optimal tracking
- AI coaching requires OpenAI API key (optional feature)

### Supported Platforms

- Windows 10+
- macOS 10.14+
- Linux (Ubuntu 18.04+)
- Python 3.8+

---

## [Unreleased]

### Planned Features

#### Exercises
- [ ] Deadlift form analysis
- [ ] Bench press tracking
- [ ] Overhead press monitoring
- [ ] Pull-up/chin-up counter

#### Analysis
- [ ] Fatigue detection (form degradation tracking)
- [ ] Range of motion scoring
- [ ] Tempo analysis
- [ ] Bar path tracking (with markers)

#### Mobile
- [ ] Android native app
- [ ] iOS native app
- [ ] On-device model optimization
- [ ] Background music integration

#### AI Features
- [ ] Personalized workout recommendations
- [ ] Progress tracking over time
- [ ] Form trend analysis
- [ ] Peer comparison (anonymized)

#### User Experience
- [ ] Multiple exercise modes
- [ ] Workout history
- [ ] Progress charts
- [ ] Export data (CSV/JSON)
- [ ] Video recording with overlay
- [ ] Social sharing

#### Developer
- [ ] REST API
- [ ] Plugin system for custom exercises
- [ ] Configuration file support
- [ ] Batch video analysis mode
- [ ] Performance profiling tools

---

### Version History

- **0.1.0** (2024-12-19) - Initial prototype release
  - Core pose detection and squat analysis
  - Audio feedback system
  - AI coaching integration
  - Desktop application with webcam support

---

For detailed changes in each release, see the [commit history](https://github.com/namitzz/posture/commits/main).
