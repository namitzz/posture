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
                elif key == ord('p'):
                    self._play_coaching_summary()
                
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
        
        # Display AI coaching feedback if available
        if self.last_coaching_feedback and self.show_coaching_feedback:
            self._draw_coaching_feedback(frame)
        
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
        self.show_coaching_feedback = False
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
        self.audio_system.announce_set_complete(set_summary['total_reps'])
        
        coaching = self.ai_coach.generate_set_summary(set_summary, rep_summaries_text)
        print(f"   {coaching}")
        print("="*50 + "\n")
        
        # Store for display and audio playback
        self.last_coaching_feedback = coaching
        self.show_coaching_feedback = True
    
    def _draw_coaching_feedback(self, frame):
        """Draw AI coaching feedback on the frame."""
        height, width = frame.shape[:2]
        
        # Create semi-transparent overlay for feedback box
        overlay = frame.copy()
        
        # Define feedback box dimensions
        box_height = 150
        box_width = width - 40
        box_x = 20
        box_y = height - box_height - 20
        
        # Draw rounded rectangle background
        cv2.rectangle(overlay, (box_x, box_y), (box_x + box_width, box_y + box_height), 
                     (50, 50, 50), -1)
        
        # Blend overlay with original frame
        alpha = 0.8
        cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)
        
        # Draw border
        cv2.rectangle(frame, (box_x, box_y), (box_x + box_width, box_y + box_height), 
                     (0, 255, 255), 2)
        
        # Draw title
        cv2.putText(frame, "AI COACH FEEDBACK", (box_x + 10, box_y + 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        # Draw feedback text (word wrap for long text)
        text = self.last_coaching_feedback
        max_width = box_width - 20
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            text_size = cv2.getTextSize(test_line, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
            if text_size[0] <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        
        if current_line:
            lines.append(' '.join(current_line))
        
        # Draw each line
        y_text = box_y + 60
        for line in lines[:3]:  # Max 3 lines
            cv2.putText(frame, line, (box_x + 10, y_text),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            y_text += 25
        
        # Draw instruction
        cv2.putText(frame, "Press 'P' to play audio", (box_x + 10, box_y + box_height - 10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
    
    def _play_coaching_summary(self):
        """Play the coaching summary via text-to-speech."""
        if self.last_coaching_feedback:
            print("▶ Playing coaching summary...")
            self.audio_system.speak_coaching_summary(self.last_coaching_feedback)
        else:
            print("No coaching feedback available to play.")


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
