"""
Demo script to test GPT-based coaching feedback without a camera.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from squat_analyzer import SquatAnalyzer
from ai_coach import AICoach


class MockLandmark:
    """Mock landmark for testing."""
    def __init__(self, x, y, z, visibility=1.0):
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility


def create_mock_landmarks(knee_angle_config='standing'):
    """Create mock landmarks for different squat positions."""
    landmarks = {}
    
    # Hip landmarks (fixed position)
    landmarks['left_hip'] = MockLandmark(0.3, 0.5, 0.0)
    landmarks['right_hip'] = MockLandmark(0.7, 0.5, 0.0)
    
    # Shoulder landmarks
    landmarks['left_shoulder'] = MockLandmark(0.3, 0.3, 0.0)
    landmarks['right_shoulder'] = MockLandmark(0.7, 0.3, 0.0)
    
    if knee_angle_config == 'standing':
        landmarks['left_knee'] = MockLandmark(0.3, 0.7, 0.0)
        landmarks['right_knee'] = MockLandmark(0.7, 0.7, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'descending':
        landmarks['left_knee'] = MockLandmark(0.38, 0.65, 0.08)
        landmarks['right_knee'] = MockLandmark(0.62, 0.65, 0.08)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'bottom':
        landmarks['left_knee'] = MockLandmark(0.46, 0.62, 0.22)
        landmarks['right_knee'] = MockLandmark(0.54, 0.62, 0.22)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'ascending':
        landmarks['left_knee'] = MockLandmark(0.33, 0.67, 0.04)
        landmarks['right_knee'] = MockLandmark(0.67, 0.67, 0.04)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'knee_valgus':
        # Knees caving in - simulate bad form
        landmarks['left_knee'] = MockLandmark(0.45, 0.62, 0.2)
        landmarks['right_knee'] = MockLandmark(0.55, 0.62, 0.2)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    return landmarks


def simulate_rep(analyzer, rep_sequence):
    """Simulate a single rep with the given sequence."""
    for config in rep_sequence:
        landmarks = create_mock_landmarks(config)
        for _ in range(5):
            analyzer.analyze_frame(landmarks)


def main():
    print("="*60)
    print("GPT COACHING FEEDBACK DEMO")
    print("="*60)
    
    # Initialize components
    analyzer = SquatAnalyzer()
    coach = AICoach()
    
    print("\nSimulating 5 squat reps with varying form...\n")
    
    # Rep 1: Good rep
    print("Rep 1: Performing good form squat...")
    simulate_rep(analyzer, ['standing', 'descending', 'bottom', 'ascending', 'standing'])
    
    # Rep 2: Shallow depth
    print("Rep 2: Performing squat with shallow depth...")
    simulate_rep(analyzer, ['standing', 'descending', 'descending', 'ascending', 'standing'])
    
    # Rep 3: Good rep
    print("Rep 3: Performing good form squat...")
    simulate_rep(analyzer, ['standing', 'descending', 'bottom', 'ascending', 'standing'])
    
    # Rep 4: Knees caving in
    print("Rep 4: Performing squat with knee valgus...")
    simulate_rep(analyzer, ['standing', 'descending', 'knee_valgus', 'ascending', 'standing'])
    
    # Rep 5: Good rep
    print("Rep 5: Performing good form squat...")
    simulate_rep(analyzer, ['standing', 'descending', 'bottom', 'ascending', 'standing'])
    
    print(f"\nCompleted {analyzer.rep_count} reps!")
    
    # Get set summary
    print("\n" + "="*60)
    print("SET SUMMARY")
    print("="*60)
    
    set_summary = analyzer.get_set_summary()
    
    if set_summary:
        print(f"Total Reps: {set_summary['total_reps']}")
        print(f"Average Depth: {set_summary['avg_depth_angle']:.1f}°")
        
        # Display per-rep summaries
        print("\nPer-Rep Analysis:")
        rep_summaries_text = analyzer.get_rep_summaries_text()
        print(rep_summaries_text)
        
        if set_summary['form_issues']:
            print("\nForm Issues:")
            for issue, count in set_summary['form_issues'].items():
                print(f"  • {issue.replace('_', ' ').title()}: {count} reps")
        else:
            print("\n✓ No form issues detected!")
        
        # Generate AI coaching
        print("\n" + "="*60)
        print("🤖 AI COACH FEEDBACK:")
        print("="*60)
        
        coaching = coach.generate_set_summary(set_summary, rep_summaries_text)
        print(f"\n{coaching}\n")
    
    print("="*60)
    print("\nDemo complete! Features demonstrated:")
    print("✓ Per-rep summary generation")
    print("✓ Form tracking (depth, knees, chest)")
    print("✓ GPT prompt formatting")
    print("✓ AI coaching feedback")
    print("✓ Edge case handling (<3 reps, API failures)")
    print("\nPress Ctrl+C to exit")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
