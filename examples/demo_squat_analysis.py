"""
Demo script showing the squat analyzer without camera.
Uses simulated data to demonstrate the analysis pipeline.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from squat_analyzer import SquatAnalyzer, SquatState
from ai_coach import AICoach
import time


class MockLandmark:
    """Mock landmark for demo."""
    def __init__(self, x, y, z, visibility=1.0):
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility


def create_squat_position(phase, knee_valgus=False):
    """Create mock landmarks for different squat phases."""
    landmarks = {}
    
    # Fixed landmarks
    landmarks['left_hip'] = MockLandmark(0.3, 0.5, 0.0)
    landmarks['right_hip'] = MockLandmark(0.7, 0.5, 0.0)
    landmarks['left_shoulder'] = MockLandmark(0.3, 0.3, 0.0)
    landmarks['right_shoulder'] = MockLandmark(0.7, 0.3, 0.0)
    
    if phase == 'standing':
        landmarks['left_knee'] = MockLandmark(0.3, 0.7, 0.0)
        landmarks['right_knee'] = MockLandmark(0.7, 0.7, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif phase == 'quarter':
        landmarks['left_knee'] = MockLandmark(0.31, 0.67, 0.0)
        landmarks['right_knee'] = MockLandmark(0.69, 0.67, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif phase == 'half':
        landmarks['left_knee'] = MockLandmark(0.32, 0.65, 0.0)
        landmarks['right_knee'] = MockLandmark(0.68, 0.65, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif phase == 'parallel':
        if knee_valgus:
            landmarks['left_knee'] = MockLandmark(0.45, 0.62, 0.0)
            landmarks['right_knee'] = MockLandmark(0.55, 0.62, 0.0)
        else:
            landmarks['left_knee'] = MockLandmark(0.35, 0.62, 0.0)
            landmarks['right_knee'] = MockLandmark(0.65, 0.62, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif phase == 'deep':
        landmarks['left_knee'] = MockLandmark(0.36, 0.6, 0.0)
        landmarks['right_knee'] = MockLandmark(0.64, 0.6, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    return landmarks


def simulate_squat_rep(analyzer, rep_num, has_issues=False):
    """Simulate a single squat rep."""
    print(f"\n--- Rep {rep_num} ---")
    
    # Descent
    print("Descending...", end='', flush=True)
    for phase in ['quarter', 'half', 'parallel']:
        landmarks = create_squat_position(phase, knee_valgus=has_issues and phase=='parallel')
        analysis = analyzer.analyze_frame(landmarks)
        time.sleep(0.1)
        print(".", end='', flush=True)
    
    # Bottom
    landmarks = create_squat_position('deep')
    analysis = analyzer.analyze_frame(landmarks)
    print(" Bottom", end='', flush=True)
    time.sleep(0.1)
    
    # Ascent
    print(" Ascending...", end='', flush=True)
    for phase in ['parallel', 'half', 'quarter']:
        landmarks = create_squat_position(phase)
        analysis = analyzer.analyze_frame(landmarks)
        time.sleep(0.1)
        print(".", end='', flush=True)
    
    # Return to standing
    landmarks = create_squat_position('standing')
    analysis = analyzer.analyze_frame(landmarks)
    print(" Complete ✓")
    
    if analysis['feedback']:
        print(f"  Feedback: {', '.join(analysis['feedback'])}")
    
    return analysis


def run_demo():
    """Run the demo simulation."""
    print("="*60)
    print("REAL-TIME GYM FORM CORRECTION - DEMO")
    print("="*60)
    print("\nThis demo simulates squat analysis without a camera.")
    print("Watch how the system tracks reps and detects form issues.\n")
    
    input("Press Enter to start Set 1 (Good Form)...")
    
    # Set 1: Good form
    print("\n" + "="*60)
    print("SET 1: Good Form Squats")
    print("="*60)
    
    analyzer = SquatAnalyzer()
    
    for i in range(1, 6):
        simulate_squat_rep(analyzer, i, has_issues=False)
        time.sleep(0.3)
    
    print(f"\n✓ Completed {analyzer.rep_count} reps")
    
    # Get summary
    summary = analyzer.get_set_summary()
    print("\n--- Set Summary ---")
    print(f"Total Reps: {summary['total_reps']}")
    print(f"Average Depth: {summary['avg_depth_angle']:.1f}°")
    
    if summary['form_issues']:
        print("Form Issues:")
        for issue, count in summary['form_issues'].items():
            print(f"  • {issue}: {count} reps")
    else:
        print("✓ No form issues detected!")
    
    # AI Coaching
    print("\n🤖 AI Coach Feedback:")
    ai_coach = AICoach()
    coaching = ai_coach.generate_set_summary(summary)
    print(f"   {coaching}")
    
    # Set 2: Form issues
    input("\n\nPress Enter to start Set 2 (Form Issues)...")
    
    print("\n" + "="*60)
    print("SET 2: Squats with Form Issues")
    print("="*60)
    
    analyzer.reset()
    
    for i in range(1, 6):
        has_issues = (i % 2 == 0)  # Issues on reps 2 and 4
        simulate_squat_rep(analyzer, i, has_issues=has_issues)
        time.sleep(0.3)
    
    print(f"\n✓ Completed {analyzer.rep_count} reps")
    
    # Get summary
    summary = analyzer.get_set_summary()
    print("\n--- Set Summary ---")
    print(f"Total Reps: {summary['total_reps']}")
    print(f"Average Depth: {summary['avg_depth_angle']:.1f}°")
    
    if summary['form_issues']:
        print("Form Issues:")
        for issue, count in summary['form_issues'].items():
            print(f"  • {issue}: {count} reps")
    else:
        print("✓ No form issues detected!")
    
    # AI Coaching
    print("\n🤖 AI Coach Feedback:")
    coaching = ai_coach.generate_set_summary(summary)
    print(f"   {coaching}")
    
    print("\n" + "="*60)
    print("DEMO COMPLETE")
    print("="*60)
    print("\nThis demonstrates the core analysis engine.")
    print("Run 'python main.py' for live camera-based tracking!")
    print()


if __name__ == "__main__":
    try:
        run_demo()
    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
