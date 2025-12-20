"""
Main application for Real-Time Gym Form Correction.
Uses webcam to track squats and provide real-time feedback.
"""
import cv2
import sys
import time
from pose_detector import PoseDetector
from squat_analyzer import SquatAnalyzer
from audio_cues import AudioCueSystem
from ai_coach import AICoach
from ui.pose_overlay import PoseOverlay
from ui.cue_display import CueDisplay
from ui.set_summary_screen import SetSummaryScreen
from ui.settings_screen import SettingsScreen


class PostureApp:
    """
    Main application for real-time gym form correction.
    """
    
    # Configuration constants
    CAMERA_WIDTH = 1280
    CAMERA_HEIGHT = 720
    
    def __init__(self):
        """Initialize the application."""
        print("Initializing Real-Time Gym Form Correction App...")
        
        # Initialize components
        self.pose_detector = PoseDetector(
            model_complexity=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.7
        )
        self.squat_analyzer = SquatAnalyzer()
        self.audio_system = AudioCueSystem()
        self.ai_coach = AICoach()
        
        # Initialize UI components
        self.pose_overlay = PoseOverlay(show_overlay=True)
        self.cue_display = CueDisplay(display_duration=1.5, enabled=True)
        self.set_summary = SetSummaryScreen()
        self.settings_screen = SettingsScreen()
        
        # State
        self.is_tracking = False
        self.last_rep_count = 0
        self.frame_count = 0
        self.last_coaching_feedback = None
        self.show_coaching_feedback = False
        
        print("✓ Initialization complete!")
    
    def run(self):
        """Run the main application loop."""
        # Open webcam
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("Error: Could not open webcam")
            return
        
        # Set camera properties
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.CAMERA_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.CAMERA_HEIGHT)
        
        # Start audio system
        self.audio_system.start()
        
        print("\n=== Real-Time Gym Form Correction ===")
        print("Controls:")
        print("  SPACE - Start/Stop tracking")
        print("  R - Reset rep counter")
        print("  P - Play AI coaching summary (after set)")
        print("  S - Toggle settings screen")
        print("  Q - Quit")
        print("\nPosition yourself in front of the camera and press SPACE to start!\n")
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Flip frame for mirror view
                frame = cv2.flip(frame, 1)
                
                # Detect pose
                results, processed_frame = self.pose_detector.detect(frame)
                
                # Determine form quality for overlay coloring
                form_quality = 'neutral'
                
                # Draw skeleton with enhanced UI if enabled
                if self.settings_screen.get_setting('show_skeleton'):
                    frame = self.pose_overlay.draw_skeleton(
                        processed_frame, self.pose_detector, results, form_quality
                    )
                else:
                    frame = processed_frame
                
                # Analyze squat form if tracking
                if self.is_tracking and results.pose_landmarks:
                    analysis = self._process_frame(results, frame)
                    
                    # Update form quality for overlay
                    if analysis and analysis.get('feedback'):
                        form_quality = 'warning'
                        # Add cues to display if enabled
                        if self.settings_screen.get_setting('enable_audio_cues'):
                            for feedback in analysis['feedback']:
                                self.cue_display.add_cue(feedback, 'warning')
                    elif self.is_tracking:
                        form_quality = 'good'
                
                # Draw cue display
                frame = self.cue_display.draw_cues(frame)
                
                # Draw UI overlay
                self._draw_ui(frame)
                
                # Draw set summary if visible
                if self.set_summary.is_visible:
                    frame = self.set_summary.draw(frame)
                
                # Draw settings screen if visible
                if self.settings_screen.is_visible:
                    frame = self.settings_screen.draw(frame)
                
                # Display frame
                cv2.imshow('Posture - Real-Time Form Correction', frame)
                
                # Handle keyboard input
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord(' '):
                    if self.set_summary.is_visible:
                        self.set_summary.hide()
                    elif not self.settings_screen.is_visible:
                        self._toggle_tracking()
                elif key == ord('r'):
                    self._reset_tracking()
                elif key == ord('p'):
                    self._play_coaching_summary()
                elif key == ord('s'):
                    self.settings_screen.toggle_visibility()
                elif self.settings_screen.is_visible:
                    # Settings navigation
                    if key == 82 or key == 0:  # Up arrow
                        self.settings_screen.navigate_up()
                    elif key == 84 or key == 1:  # Down arrow
                        self.settings_screen.navigate_down()
                    elif key == 13:  # Enter
                        setting_key, value = self.settings_screen.toggle_selected()
                        self._handle_setting_change(setting_key, value)
                
                self.frame_count += 1
        
        finally:
            # Cleanup
            print("\nShutting down...")
            self.audio_system.stop()
            self.pose_detector.close()
            cap.release()
            cv2.destroyAllWindows()
            print("✓ Shutdown complete")
    
    def _process_frame(self, results, frame):
        """Process a frame for squat analysis."""
        # Get landmarks
        landmarks_dict = self.pose_detector.get_landmarks_dict(results)
        
        # Analyze squat
        analysis = self.squat_analyzer.analyze_frame(landmarks_dict)
        
        if not analysis['valid_pose']:
            return None
        
        # Check for rep completion
        if analysis['rep_count'] > self.last_rep_count:
            if self.settings_screen.get_setting('enable_audio_cues'):
                self.audio_system.announce_rep(analysis['rep_count'])
            self.last_rep_count = analysis['rep_count']
        
        # Play audio feedback (with cooldown built-in)
        if analysis['feedback'] and self.settings_screen.get_setting('enable_audio_cues'):
            self.audio_system.play_feedback(analysis['feedback'])
        
        # Draw analysis info on frame (debug mode)
        if self.settings_screen.get_setting('debug_mode'):
            self._draw_analysis(frame, analysis)
        
        return analysis
    
    def _draw_ui(self, frame):
        """Draw UI overlay on frame."""
        height, width = frame.shape[:2]
        
        # Status indicator
        status_color = (0, 255, 0) if self.is_tracking else (0, 0, 255)
        status_text = "TRACKING" if self.is_tracking else "PAUSED"
        cv2.putText(
            frame, status_text, (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2
        )
        
        # Rep counter
        rep_text = f"REPS: {self.squat_analyzer.rep_count}"
        cv2.putText(
            frame, rep_text, (10, 70),
            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2
        )
        
        # Instructions
        if not self.is_tracking:
            instruction = "Press SPACE to start tracking"
            text_size = cv2.getTextSize(instruction, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
            text_x = (width - text_size[0]) // 2
            text_y = height - 30
            cv2.putText(
                frame, instruction, (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2
            )
    
    def _draw_analysis(self, frame, analysis):
        """Draw analysis information on frame."""
        y_offset = 110
        
        # Current state
        state_text = f"State: {analysis['state']}"
        cv2.putText(
            frame, state_text, (10, y_offset),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2
        )
        y_offset += 35
        
        # Knee angle
        angle_text = f"Knee Angle: {analysis.get('knee_angle', 0):.0f}°"
        cv2.putText(
            frame, angle_text, (10, y_offset),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2
        )
        y_offset += 35
        
        # Feedback
        if analysis['feedback']:
            cv2.putText(
                frame, "FORM CHECK:", (10, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2
            )
            y_offset += 30
            
            for feedback in analysis['feedback'][:3]:  # Show max 3 feedback items
                cv2.putText(
                    frame, f"• {feedback}", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 1
                )
                y_offset += 25
    
    def _toggle_tracking(self):
        """Toggle tracking on/off."""
        self.is_tracking = not self.is_tracking
        
        if self.is_tracking:
            print("\n▶ Started tracking")
            # Hide coaching feedback when starting new set
            self.show_coaching_feedback = False
            self.set_summary.hide()
            self.cue_display.clear_all()
        else:
            print("\n⏸ Paused tracking")
            
            # Generate AI summary if we have completed reps
            if self.squat_analyzer.rep_count > 0:
                self._generate_set_summary()
    
    def _reset_tracking(self):
        """Reset the tracking state."""
        if self.squat_analyzer.rep_count > 0 and not self.set_summary.is_visible:
            self._generate_set_summary()
        
        self.squat_analyzer.reset()
        self.last_rep_count = 0
        self.show_coaching_feedback = False
        self.set_summary.hide()
        self.cue_display.clear_all()
        print("\n↺ Reset rep counter")
    
    def _generate_set_summary(self):
        """Generate AI coaching summary for the completed set."""
        set_summary = self.squat_analyzer.get_set_summary()
        
        if not set_summary:
            return
        
        print("\n" + "="*50)
        print("SET SUMMARY")
        print("="*50)
        print(f"Total Reps: {set_summary['total_reps']}")
        print(f"Average Depth: {set_summary['avg_depth_angle']:.1f}°")
        
        # Display per-rep summaries
        print("\nPer-Rep Analysis:")
        rep_summaries_text = self.squat_analyzer.get_rep_summaries_text()
        if rep_summaries_text:
            print(rep_summaries_text)
        
        if set_summary['form_issues']:
            print("\nForm Issues:")
            for issue, count in set_summary['form_issues'].items():
                print(f"  • {issue.replace('_', ' ').title()}: {count} reps")
        else:
            print("\n✓ No form issues detected!")
        
        # Get AI coaching
        print("\n🤖 AI COACH:")
        if self.settings_screen.get_setting('enable_audio_cues'):
            self.audio_system.announce_set_complete(set_summary['total_reps'])
        
        if self.settings_screen.get_setting('enable_ai_coaching'):
            coaching = self.ai_coach.generate_set_summary(set_summary, rep_summaries_text)
        else:
            coaching = "AI coaching is disabled in settings."
        
        print(f"   {coaching}")
        print("="*50 + "\n")
        
        # Store for display and audio playback
        self.last_coaching_feedback = coaching
        self.show_coaching_feedback = True
        
        # Show set summary screen with animation
        self.set_summary.show(set_summary, coaching)
    
    def _play_coaching_summary(self):
        """Play the coaching summary via text-to-speech."""
        if self.last_coaching_feedback:
            print("▶ Playing coaching summary...")
            if self.settings_screen.get_setting('enable_audio_cues'):
                self.audio_system.speak_coaching_summary(self.last_coaching_feedback)
            else:
                print("Audio cues are disabled in settings.")
        else:
            print("No coaching feedback available to play.")
    
    def _handle_setting_change(self, setting_key, value):
        """Handle changes to settings."""
        if setting_key == 'show_skeleton':
            self.pose_overlay.show_overlay = value
            print(f"Skeleton overlay: {'ON' if value else 'OFF'}")
        elif setting_key == 'enable_audio_cues':
            self.cue_display.enabled = value
            print(f"Audio cues: {'ON' if value else 'OFF'}")
        elif setting_key == 'enable_ai_coaching':
            print(f"AI coaching: {'ON' if value else 'OFF'}")
        elif setting_key == 'debug_mode':
            print(f"Debug mode: {'ON' if value else 'OFF'}")


def main():
    """Main entry point."""
    try:
        app = PostureApp()
        app.run()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
