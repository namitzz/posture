# UI Components Documentation

## Overview

The Real-Time Gym Form Correction App now features an enhanced UI with modular components designed for a demo-ready experience. All components feature dark mode styling, smooth animations, and responsive design.

## Components

### 1. PoseOverlay (`src/ui/pose_overlay.py`)

**Purpose**: Enhanced skeleton overlay with color-coded form quality.

**Features**:
- Customizable skeleton rendering
- Color-coded feedback:
  - 🟢 Green: Good form
  - 🟠 Orange: Minor corrections needed
  - 🔴 Red: Poor form requiring attention
  - ⚪ White: Neutral/tracking
- Thicker, more visible joint markers
- Simplified skeleton connections for clarity

**Usage**:
```python
from ui.pose_overlay import PoseOverlay

overlay = PoseOverlay(show_overlay=True)
frame = overlay.draw_skeleton(frame, pose_detector, results, form_quality='good')
overlay.toggle_overlay()  # Toggle on/off
```

### 2. CueDisplay (`src/ui/cue_display.py`)

**Purpose**: Real-time form cues with fade-in/fade-out animations.

**Features**:
- Centered, large text display (fitness-safe font sizes)
- Fade-in animation (200ms)
- Full opacity display
- Fade-out animation (300ms)
- Semi-transparent background for readability
- Automatic cleanup after display duration (default: 1.5 seconds)
- Color-coded cues (green/orange/red)

**Usage**:
```python
from ui.cue_display import CueDisplay

cue_display = CueDisplay(display_duration=1.5, enabled=True)
cue_display.add_cue("Knees out", "warning")  # Types: 'good', 'warning', 'bad'
frame = cue_display.draw_cues(frame)
```

### 3. SetSummaryScreen (`src/ui/set_summary_screen.py`)

**Purpose**: Post-set summary with AI coaching feedback and slide-in animation.

**Features**:
- Smooth slide-in animation from bottom (cubic easing)
- Dark mode styling with cyan accents
- Displays:
  - Total reps completed
  - Average squat depth
  - AI coaching feedback (word-wrapped)
- Action hints at bottom
- Semi-transparent dark background
- Responsive sizing

**Usage**:
```python
from ui.set_summary_screen import SetSummaryScreen

summary_screen = SetSummaryScreen()
summary_data = {
    'total_reps': 5,
    'avg_depth_angle': 82.3,
    'form_issues': {'knee_valgus': 1}
}
coaching_text = "Great work! Focus on keeping knees aligned."
summary_screen.show(summary_data, coaching_text)
frame = summary_screen.draw(frame)
summary_screen.hide()  # Hide the screen
```

### 4. SettingsScreen (`src/ui/settings_screen.py`)

**Purpose**: Interactive settings menu with keyboard navigation.

**Features**:
- Full-screen semi-transparent overlay
- Keyboard navigation (arrow keys)
- Toggle controls:
  - Show Skeleton Overlay
  - Enable Audio Cues
  - Enable AI Coaching
  - Debug Mode (show angles)
- Visual feedback for selected item (cyan highlight)
- Green [ON] / Gray [OFF] indicators

**Usage**:
```python
from ui.settings_screen import SettingsScreen

settings = SettingsScreen()
settings.toggle_visibility()  # Show/hide
frame = settings.draw(frame)

# Navigation
settings.navigate_up()
settings.navigate_down()
key, value = settings.toggle_selected()

# Get/set values
skeleton_on = settings.get_setting('show_skeleton')
settings.set_setting('show_skeleton', False)
```

## Main Application Integration

The main application (`src/main.py`) has been updated to integrate all UI components:

### New Keyboard Controls

- **SPACE**: Start/Stop tracking (also dismisses summary screen)
- **R**: Reset rep counter
- **P**: Play AI coaching summary via text-to-speech
- **S**: Toggle settings screen
- **Arrow Keys**: Navigate settings (when settings open)
- **Enter**: Toggle selected setting (when settings open)
- **Q**: Quit application

### UI Flow

1. **Tracking Mode**:
   - Live camera feed with skeleton overlay
   - Rep counter in top-left
   - Real-time cues appear centered with fade animation
   - Status indicator (TRACKING/PAUSED)

2. **Set Complete**:
   - Summary screen slides in from bottom
   - Shows rep stats, depth, and AI coaching
   - User can press 'P' for audio, 'R' to reset, or SPACE to continue

3. **Settings Mode**:
   - Press 'S' to open settings overlay
   - Navigate with arrow keys
   - Toggle settings with Enter
   - Press 'S' again to close

## Visual Design

### Color Scheme
- **Background**: Dark mode (dark gray/black)
- **Accents**: Cyan (#00FFFF) for highlights and borders
- **Text**: White for primary text
- **Success**: Green (#00FF00) for positive feedback
- **Warning**: Orange (#FFA500) for corrections
- **Error**: Red (#FF0000) for serious issues

### Typography
- Large, bold text for cues (1.5x scale, 3px thickness)
- Medium text for titles and labels
- Small text for hints and instructions
- All text uses FONT_HERSHEY_SIMPLEX or FONT_HERSHEY_DUPLEX for clarity

### Animations
- **Slide-in**: Cubic easing for smooth appearance
- **Fade effects**: Linear fade with 200ms in, 300ms out
- **Duration**: Cues display for 1.5 seconds by default

## Testing

Run the UI component test suite:

```bash
python test_ui_components.py
```

This will:
- Test all component functionality
- Generate visual output images
- Verify toggles and state management

## Screenshots

### 1. Cue Display
Shows real-time form feedback with fade animation and semi-transparent background.

### 2. Set Summary Screen
Displays post-set statistics and AI coaching with smooth slide-in animation.

### 3. Settings Screen
Interactive settings menu with keyboard navigation and toggle controls.

## Settings Control

All UI features respect the settings configured by the user:

- **Show Skeleton Overlay**: Enables/disables the pose overlay
- **Enable Audio Cues**: Controls both visual cues and audio feedback
- **Enable AI Coaching**: Controls whether GPT generates coaching summaries
- **Debug Mode**: Shows additional debug information (angles, etc.)

## Performance Considerations

- All drawing operations are optimized for real-time rendering
- Animations use time-based progression (not frame-based)
- Cue display automatically manages memory by removing expired cues
- Semi-transparent overlays use efficient alpha blending

## Future Enhancements

Potential improvements for production:
- Custom fonts for more professional appearance
- Vibration feedback on mobile devices
- More detailed metrics display
- Historical performance tracking
- Customizable color themes
- Multiple language support
