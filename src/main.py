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


class PostureApp:
    """
    Main application for real-time gym form correction.
    """
    
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
        
        # State
        self.is_tracking = False
        self.last_rep_count = 0
        self.frame_count = 0
        
        print("✓ Initialization complete!")
    
    def run(self):
        """Run the main application loop."""
        # Open webcam
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("Error: Could not open webcam")
            return
        
        # Set camera properties
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        # Start audio system
        self.audio_system.start()
        
        print("\n=== Real-Time Gym Form Correction ===")
        print("Controls:")
        print("  SPACE - Start/Stop tracking")
        print("  R - Reset rep counter")
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
                
                # Draw skeleton
                frame = self.pose_detector.draw_landmarks(processed_frame, results)
                
                # Analyze squat form if tracking
                if self.is_tracking and results.pose_landmarks:
                    self._process_frame(results, frame)
                
                # Draw UI overlay
                self._draw_ui(frame)
                
                # Display frame
                cv2.imshow('Posture - Real-Time Form Correction', frame)
                
                # Handle keyboard input
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord(' '):
                    self._toggle_tracking()
                elif key == ord('r'):
                    self._reset_tracking()
                
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
            return
        
        # Check for rep completion
        if analysis['rep_count'] > self.last_rep_count:
            self.audio_system.announce_rep(analysis['rep_count'])
            self.last_rep_count = analysis['rep_count']
        
        # Play audio feedback (with cooldown built-in)
        if analysis['feedback']:
            self.audio_system.play_feedback(analysis['feedback'])
        
        # Draw analysis info on frame
        self._draw_analysis(frame, analysis)
    
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
        if 'knee_angle' in analysis:
            angle_text = f"Knee Angle: {analysis['knee_angle']:.0f}°"
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
        else:
            print("\n⏸ Paused tracking")
            
            # Generate AI summary if we have completed reps
            if self.squat_analyzer.rep_count > 0:
                self._generate_set_summary()
    
    def _reset_tracking(self):
        """Reset the tracking state."""
        if self.squat_analyzer.rep_count > 0:
            self._generate_set_summary()
        
        self.squat_analyzer.reset()
        self.last_rep_count = 0
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
        
        if set_summary['form_issues']:
            print("\nForm Issues:")
            for issue, count in set_summary['form_issues'].items():
                print(f"  • {issue.replace('_', ' ').title()}: {count} reps")
        else:
            print("\n✓ No form issues detected!")
        
        # Get AI coaching
        print("\n🤖 AI COACH:")
        self.audio_system.announce_set_complete(set_summary['total_reps'])
        
        coaching = self.ai_coach.generate_set_summary(set_summary)
        print(f"   {coaching}")
        print("="*50 + "\n")


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
