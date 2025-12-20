#!/usr/bin/env python
"""
Generate comprehensive UI screenshots for documentation.
"""
import sys
import os
sys.path.insert(0, 'src')

import cv2
import numpy as np
from ui.pose_overlay import PoseOverlay
from ui.cue_display import CueDisplay
from ui.set_summary_screen import SetSummaryScreen
from ui.settings_screen import SettingsScreen


def create_test_frame(width=1280, height=720, style='gradient'):
    """Create a test frame with different background styles."""
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    if style == 'gradient':
        # Create a gradient background (simulating camera feed)
        for y in range(height):
            intensity = int((y / height) * 100)
            frame[y, :] = [intensity, intensity // 2, intensity // 3]
    elif style == 'dark':
        # Dark background for settings
        frame[:, :] = [20, 20, 20]
    elif style == 'gym':
        # Simulated gym environment with some texture
        for y in range(height):
            for x in range(width):
                base_val = 40 + int((x + y) / 50) % 30
                frame[y, x] = [base_val, base_val - 5, base_val - 10]
    
    return frame


def draw_stick_figure(frame, scale=1.0):
    """Draw a simple stick figure to simulate a person."""
    height, width = frame.shape[:2]
    center_x = width // 2
    center_y = height // 2
    
    color = (200, 200, 200)
    thickness = 3
    
    # Head
    head_center = (int(center_x), int(center_y - 150 * scale))
    cv2.circle(frame, head_center, int(30 * scale), color, thickness)
    
    # Body
    body_top = (int(center_x), int(center_y - 120 * scale))
    body_bottom = (int(center_x), int(center_y + 80 * scale))
    cv2.line(frame, body_top, body_bottom, color, thickness)
    
    # Arms
    left_hand = (int(center_x - 80 * scale), int(center_y - 40 * scale))
    right_hand = (int(center_x + 80 * scale), int(center_y - 40 * scale))
    shoulder = (int(center_x), int(center_y - 80 * scale))
    cv2.line(frame, left_hand, shoulder, color, thickness)
    cv2.line(frame, right_hand, shoulder, color, thickness)
    
    # Legs
    left_foot = (int(center_x - 60 * scale), int(center_y + 180 * scale))
    right_foot = (int(center_x + 60 * scale), int(center_y + 180 * scale))
    cv2.line(frame, body_bottom, left_foot, color, thickness)
    cv2.line(frame, body_bottom, right_foot, color, thickness)
    
    return frame


def generate_screenshot_1_tracking_view():
    """Screenshot 1: Main tracking view with rep counter and skeleton."""
    print("Generating Screenshot 1: Tracking View...")
    
    frame = create_test_frame(style='gym')
    
    # Draw stick figure to simulate person
    frame = draw_stick_figure(frame)
    
    # Add rep counter (top-left)
    cv2.putText(
        frame, "REPS: 3", (20, 60),
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3
    )
    
    # Add status indicator (top-right)
    cv2.putText(
        frame, "TRACKING", (1050, 60),
        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2
    )
    
    # Add help text at bottom
    cv2.putText(
        frame, "SPACE: Stop | R: Reset | S: Settings | Q: Quit", (20, 700),
        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2
    )
    
    cv2.imwrite("docs/screenshots/01_tracking_view.png", frame)
    print("  ✓ Saved: docs/screenshots/01_tracking_view.png")


def generate_screenshot_2_cue_good():
    """Screenshot 2: Good form cue display."""
    print("Generating Screenshot 2: Good Form Cue...")
    
    frame = create_test_frame(style='gym')
    frame = draw_stick_figure(frame)
    
    # Add rep counter
    cv2.putText(
        frame, "REPS: 5", (20, 60),
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3
    )
    
    # Add good form cue
    cue_display = CueDisplay(display_duration=5.0, enabled=True)
    cue_display.add_cue("Great depth!", "good")
    frame = cue_display.draw_cues(frame)
    
    # Add help text
    cv2.putText(
        frame, "SPACE: Stop | R: Reset | S: Settings | Q: Quit", (20, 700),
        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2
    )
    
    cv2.imwrite("docs/screenshots/02_cue_good_form.png", frame)
    print("  ✓ Saved: docs/screenshots/02_cue_good_form.png")


def generate_screenshot_3_cue_warning():
    """Screenshot 3: Warning cue display."""
    print("Generating Screenshot 3: Warning Cue...")
    
    frame = create_test_frame(style='gym')
    frame = draw_stick_figure(frame)
    
    # Add rep counter
    cv2.putText(
        frame, "REPS: 2", (20, 60),
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3
    )
    
    # Add warning cue
    cue_display = CueDisplay(display_duration=5.0, enabled=True)
    cue_display.add_cue("Knees out - push knees outward", "warning")
    frame = cue_display.draw_cues(frame)
    
    # Add help text
    cv2.putText(
        frame, "SPACE: Stop | R: Reset | S: Settings | Q: Quit", (20, 700),
        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2
    )
    
    cv2.imwrite("docs/screenshots/03_cue_warning.png", frame)
    print("  ✓ Saved: docs/screenshots/03_cue_warning.png")


def generate_screenshot_4_cue_bad():
    """Screenshot 4: Bad form cue display."""
    print("Generating Screenshot 4: Bad Form Cue...")
    
    frame = create_test_frame(style='gym')
    frame = draw_stick_figure(frame)
    
    # Add rep counter
    cv2.putText(
        frame, "REPS: 1", (20, 60),
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3
    )
    
    # Add bad form cue
    cue_display = CueDisplay(display_duration=5.0, enabled=True)
    cue_display.add_cue("Chest up! Keep torso upright", "bad")
    frame = cue_display.draw_cues(frame)
    
    # Add help text
    cv2.putText(
        frame, "SPACE: Stop | R: Reset | S: Settings | Q: Quit", (20, 700),
        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2
    )
    
    cv2.imwrite("docs/screenshots/04_cue_bad_form.png", frame)
    print("  ✓ Saved: docs/screenshots/04_cue_bad_form.png")


def generate_screenshot_5_summary():
    """Screenshot 5: Set summary screen with AI coaching."""
    print("Generating Screenshot 5: Set Summary Screen...")
    
    frame = create_test_frame(style='gym')
    frame = draw_stick_figure(frame)
    
    # Add rep counter
    cv2.putText(
        frame, "REPS: 8", (20, 60),
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3
    )
    
    # Create and display summary
    summary_screen = SetSummaryScreen()
    summary_data = {
        'total_reps': 8,
        'avg_depth_angle': 82.3,
        'form_issues': {'knee_valgus': 1, 'shallow_depth': 0}
    }
    coaching_text = "Excellent work! You completed 8 reps with great depth. Just one minor knee alignment issue on rep 5. Focus on pushing your knees outward throughout the movement."
    
    # Show and force animation to complete
    summary_screen.show(summary_data, coaching_text)
    summary_screen.animation_progress = 1.0
    summary_screen.animation_start_time = None
    
    frame = summary_screen.draw(frame)
    
    cv2.imwrite("docs/screenshots/05_set_summary.png", frame)
    print("  ✓ Saved: docs/screenshots/05_set_summary.png")


def generate_screenshot_6_settings():
    """Screenshot 6: Settings screen."""
    print("Generating Screenshot 6: Settings Screen...")
    
    frame = create_test_frame(style='dark')
    
    # Create and display settings
    settings_screen = SettingsScreen()
    settings_screen.show()
    
    # Navigate to second item to show selection
    settings_screen.navigate_down()
    
    frame = settings_screen.draw(frame)
    
    cv2.imwrite("docs/screenshots/06_settings_screen.png", frame)
    print("  ✓ Saved: docs/screenshots/06_settings_screen.png")


def generate_screenshot_7_paused():
    """Screenshot 7: Paused state."""
    print("Generating Screenshot 7: Paused State...")
    
    frame = create_test_frame(style='gym')
    frame = draw_stick_figure(frame)
    
    # Add rep counter
    cv2.putText(
        frame, "REPS: 4", (20, 60),
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3
    )
    
    # Add paused indicator
    cv2.putText(
        frame, "PAUSED", (1050, 60),
        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 100, 0), 2
    )
    
    # Add help text
    cv2.putText(
        frame, "SPACE: Resume | R: Reset | S: Settings | Q: Quit", (20, 700),
        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2
    )
    
    cv2.imwrite("docs/screenshots/07_paused_state.png", frame)
    print("  ✓ Saved: docs/screenshots/07_paused_state.png")


def main():
    """Generate all screenshots."""
    print("\n" + "="*60)
    print("Generating UI Screenshots for Documentation")
    print("="*60 + "\n")
    
    try:
        # Ensure output directory exists
        os.makedirs("docs/screenshots", exist_ok=True)
        
        # Generate all screenshots
        generate_screenshot_1_tracking_view()
        generate_screenshot_2_cue_good()
        generate_screenshot_3_cue_warning()
        generate_screenshot_4_cue_bad()
        generate_screenshot_5_summary()
        generate_screenshot_6_settings()
        generate_screenshot_7_paused()
        
        print("\n" + "="*60)
        print("✓ ALL SCREENSHOTS GENERATED SUCCESSFULLY!")
        print("="*60)
        print("\nScreenshots saved in: docs/screenshots/")
        print("\nGenerated files:")
        print("  • 01_tracking_view.png - Main tracking interface")
        print("  • 02_cue_good_form.png - Good form feedback")
        print("  • 03_cue_warning.png - Warning feedback")
        print("  • 04_cue_bad_form.png - Critical form issue")
        print("  • 05_set_summary.png - AI coaching summary")
        print("  • 06_settings_screen.png - Settings menu")
        print("  • 07_paused_state.png - Paused state")
        
    except Exception as e:
        print(f"\n✗ Screenshot generation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
