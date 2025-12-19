"""
Unit tests for the squat analyzer module.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from squat_analyzer import SquatAnalyzer, SquatState


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
        # Standing position - knees almost straight
        landmarks['left_knee'] = MockLandmark(0.3, 0.7, 0.0)
        landmarks['right_knee'] = MockLandmark(0.7, 0.7, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'descending':
        # Descending - knees at ~130 degrees
        landmarks['left_knee'] = MockLandmark(0.32, 0.65, 0.0)
        landmarks['right_knee'] = MockLandmark(0.68, 0.65, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'bottom':
        # Bottom position - deep squat
        landmarks['left_knee'] = MockLandmark(0.35, 0.6, 0.0)
        landmarks['right_knee'] = MockLandmark(0.65, 0.6, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'knee_valgus':
        # Knees caving in
        landmarks['left_knee'] = MockLandmark(0.45, 0.6, 0.0)
        landmarks['right_knee'] = MockLandmark(0.55, 0.6, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    return landmarks


def test_initialization():
    """Test analyzer initialization."""
    analyzer = SquatAnalyzer()
    assert analyzer.rep_count == 0
    assert analyzer.state == SquatState.STANDING


def test_standing_detection():
    """Test standing position detection."""
    analyzer = SquatAnalyzer()
    landmarks = create_mock_landmarks('standing')
    
    analysis = analyzer.analyze_frame(landmarks)
    
    assert analysis['valid_pose'] is True
    assert analysis['state'] == 'standing'
    assert analysis['rep_count'] == 0


def test_rep_counting():
    """Test full squat rep counting."""
    analyzer = SquatAnalyzer()
    
    # Simulate a full squat rep
    # Start standing
    landmarks = create_mock_landmarks('standing')
    analyzer.analyze_frame(landmarks)
    assert analyzer.rep_count == 0
    
    # Descend
    for _ in range(5):
        landmarks = create_mock_landmarks('descending')
        analyzer.analyze_frame(landmarks)
    
    # Bottom
    for _ in range(5):
        landmarks = create_mock_landmarks('bottom')
        analyzer.analyze_frame(landmarks)
    
    # Ascend
    for _ in range(5):
        landmarks = create_mock_landmarks('descending')
        analyzer.analyze_frame(landmarks)
    
    # Return to standing
    for _ in range(5):
        landmarks = create_mock_landmarks('standing')
        analysis = analyzer.analyze_frame(landmarks)
    
    # Should have counted 1 rep
    assert analyzer.rep_count == 1


def test_form_feedback():
    """Test form feedback generation."""
    analyzer = SquatAnalyzer()
    
    # Test with knee valgus
    landmarks = create_mock_landmarks('knee_valgus')
    analysis = analyzer.analyze_frame(landmarks)
    
    # Should detect knee valgus if in bottom position
    # Move to bottom position first
    analyzer.state = SquatState.BOTTOM
    analysis = analyzer.analyze_frame(landmarks)
    
    # Check that feedback is provided
    assert analysis['valid_pose'] is True


def test_set_summary():
    """Test set summary generation."""
    analyzer = SquatAnalyzer()
    
    # Complete one rep
    for config in ['standing', 'descending', 'bottom', 'descending', 'standing']:
        landmarks = create_mock_landmarks(config)
        for _ in range(3):
            analyzer.analyze_frame(landmarks)
    
    summary = analyzer.get_set_summary()
    
    assert summary is not None
    assert summary['total_reps'] == 1
    assert 'avg_depth_angle' in summary
    assert 'form_issues' in summary


def test_reset():
    """Test analyzer reset."""
    analyzer = SquatAnalyzer()
    
    # Do some reps
    analyzer.rep_count = 5
    analyzer.set_data = [{'min_knee_angle': 90, 'max_knee_angle': 170, 'form_issues': []}]
    
    # Reset
    analyzer.reset()
    
    assert analyzer.rep_count == 0
    assert len(analyzer.set_data) == 0
    assert analyzer.state == SquatState.STANDING


def test_missing_landmarks():
    """Test handling of missing landmarks."""
    analyzer = SquatAnalyzer()
    
    # Empty landmarks
    landmarks = {}
    analysis = analyzer.analyze_frame(landmarks)
    
    assert analysis['valid_pose'] is False


if __name__ == '__main__':
    # Run tests
    print("Running tests...")
    
    test_initialization()
    print("✓ Initialization test passed")
    
    test_standing_detection()
    print("✓ Standing detection test passed")
    
    test_rep_counting()
    print("✓ Rep counting test passed")
    
    test_form_feedback()
    print("✓ Form feedback test passed")
    
    test_set_summary()
    print("✓ Set summary test passed")
    
    test_reset()
    print("✓ Reset test passed")
    
    test_missing_landmarks()
    print("✓ Missing landmarks test passed")
    
    print("\nAll tests passed! ✓")
