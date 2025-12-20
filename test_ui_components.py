#!/usr/bin/env python
"""
Test script for UI components.
Tests the new UI components without requiring a camera.
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


def create_test_frame(width=1280, height=720):
    """Create a test frame with a gradient background."""
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Create a gradient background
    for y in range(height):
        intensity = int((y / height) * 100)
        frame[y, :] = [intensity, intensity // 2, intensity // 3]
    
    return frame


def test_pose_overlay():
    """Test the PoseOverlay component."""
    print("\n=== Testing PoseOverlay ===")
    
    overlay = PoseOverlay(show_overlay=True)
    
    # Test toggle
    assert overlay.show_overlay == True
    overlay.toggle_overlay()
    assert overlay.show_overlay == False
    overlay.toggle_overlay()
    assert overlay.show_overlay == True
    
    print("✓ PoseOverlay tests passed")


def test_cue_display():
    """Test the CueDisplay component."""
    print("\n=== Testing CueDisplay ===")
    
    cue_display = CueDisplay(display_duration=1.5, enabled=True)
    frame = create_test_frame()
    
    # Add some cues
    cue_display.add_cue("Knees out", "warning")
    cue_display.add_cue("Good form!", "good")
    
    # Draw cues on frame
    frame = cue_display.draw_cues(frame)
    
    # Test toggle
    assert cue_display.enabled == True
    cue_display.toggle_display()
    assert cue_display.enabled == False
    
    # Clear cues
    cue_display.toggle_display()
    cue_display.clear_all()
    
    print("✓ CueDisplay tests passed")


def test_set_summary_screen():
    """Test the SetSummaryScreen component."""
    print("\n=== Testing SetSummaryScreen ===")
    
    summary_screen = SetSummaryScreen()
    frame = create_test_frame()
    
    # Create mock summary data
    summary_data = {
        'total_reps': 5,
        'avg_depth_angle': 85.5,
        'form_issues': {'knee_valgus': 2}
    }
    
    coaching_text = "Great depth! Keep knees aligned for better form."
    
    # Show summary
    summary_screen.show(summary_data, coaching_text)
    assert summary_screen.is_visible == True
    
    # Draw on frame
    frame = summary_screen.draw(frame)
    
    # Hide summary
    summary_screen.hide()
    assert summary_screen.is_visible == False
    
    print("✓ SetSummaryScreen tests passed")


def test_settings_screen():
    """Test the SettingsScreen component."""
    print("\n=== Testing SettingsScreen ===")
    
    settings_screen = SettingsScreen()
    frame = create_test_frame()
    
    # Test visibility toggle
    assert settings_screen.is_visible == False
    settings_screen.toggle_visibility()
    assert settings_screen.is_visible == True
    
    # Test drawing
    frame = settings_screen.draw(frame)
    
    # Test navigation
    settings_screen.navigate_down()
    settings_screen.navigate_up()
    
    # Test toggle
    key, value = settings_screen.toggle_selected()
    assert key is not None
    
    # Test getting/setting values
    assert settings_screen.get_setting('show_skeleton') in [True, False]
    settings_screen.set_setting('show_skeleton', False)
    assert settings_screen.get_setting('show_skeleton') == False
    
    print("✓ SettingsScreen tests passed")


def test_visual_output():
    """Create visual test output."""
    print("\n=== Creating Visual Test Output ===")
    
    # Create a test frame
    frame = create_test_frame()
    
    # Add text to show it's a test
    cv2.putText(
        frame, "UI COMPONENT TEST", (450, 50),
        cv2.FONT_HERSHEY_DUPLEX, 1.5, (255, 255, 255), 3
    )
    
    # Test CueDisplay
    cue_display = CueDisplay(display_duration=5.0, enabled=True)
    cue_display.add_cue("Knees out - push knees outward", "warning")
    frame = cue_display.draw_cues(frame)
    
    # Add rep counter
    cv2.putText(
        frame, "REPS: 3", (10, 70),
        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2
    )
    
    # Save test output
    output_path = "test_ui_output.png"
    cv2.imwrite(output_path, frame)
    print(f"✓ Visual test output saved to {output_path}")
    
    # Test SetSummaryScreen
    frame2 = create_test_frame()
    summary_screen = SetSummaryScreen()
    summary_data = {
        'total_reps': 5,
        'avg_depth_angle': 82.3,
        'form_issues': {'knee_valgus': 1, 'shallow_depth': 2}
    }
    coaching_text = "Great work! You completed 5 reps with good depth. Focus on keeping your knees aligned throughout the movement."
    
    # Force animation to complete
    summary_screen.show(summary_data, coaching_text)
    summary_screen.animation_progress = 1.0
    summary_screen.animation_start_time = None
    
    frame2 = summary_screen.draw(frame2)
    
    output_path2 = "test_summary_screen.png"
    cv2.imwrite(output_path2, frame2)
    print(f"✓ Summary screen test output saved to {output_path2}")
    
    # Test SettingsScreen
    frame3 = create_test_frame()
    settings_screen = SettingsScreen()
    settings_screen.show()
    frame3 = settings_screen.draw(frame3)
    
    output_path3 = "test_settings_screen.png"
    cv2.imwrite(output_path3, frame3)
    print(f"✓ Settings screen test output saved to {output_path3}")


def main():
    """Run all tests."""
    print("Starting UI Component Tests...")
    
    try:
        test_pose_overlay()
        test_cue_display()
        test_set_summary_screen()
        test_settings_screen()
        test_visual_output()
        
        print("\n" + "="*50)
        print("✓ ALL UI COMPONENT TESTS PASSED!")
        print("="*50)
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
