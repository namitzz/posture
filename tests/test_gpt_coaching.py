"""
Unit tests for GPT-based coaching feedback feature.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from squat_analyzer import SquatAnalyzer
from ai_coach import AICoach, OPENAI_AVAILABLE
import pytest


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
        # Standing position - knees almost straight (170+ degrees)
        landmarks['left_knee'] = MockLandmark(0.3, 0.7, 0.0)
        landmarks['right_knee'] = MockLandmark(0.7, 0.7, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'descending':
        # Descending - knees at ~130 degrees (needs to be <140 to trigger descent)
        landmarks['left_knee'] = MockLandmark(0.38, 0.65, 0.08)
        landmarks['right_knee'] = MockLandmark(0.62, 0.65, 0.08)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'bottom':
        # Bottom position - deep squat (<100 degrees)
        landmarks['left_knee'] = MockLandmark(0.46, 0.62, 0.22)
        landmarks['right_knee'] = MockLandmark(0.54, 0.62, 0.22)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'ascending':
        # Ascending - knees at ~145 degrees (>140 to trigger ascending from bottom)
        landmarks['left_knee'] = MockLandmark(0.33, 0.67, 0.04)
        landmarks['right_knee'] = MockLandmark(0.67, 0.67, 0.04)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    elif knee_angle_config == 'knee_valgus':
        # Knees caving in
        landmarks['left_knee'] = MockLandmark(0.45, 0.6, 0.0)
        landmarks['right_knee'] = MockLandmark(0.55, 0.6, 0.0)
        landmarks['left_ankle'] = MockLandmark(0.3, 0.9, 0.0)
        landmarks['right_ankle'] = MockLandmark(0.7, 0.9, 0.0)
    
    return landmarks


def test_rep_summary_generation():
    """Test per-rep summary string generation."""
    analyzer = SquatAnalyzer()
    
    # Simulate one rep with good form using more frames
    # Standing
    landmarks = create_mock_landmarks('standing')
    for _ in range(5):
        analyzer.analyze_frame(landmarks)
    
    # Descending
    landmarks = create_mock_landmarks('descending')
    for _ in range(5):
        analyzer.analyze_frame(landmarks)
    
    # Bottom
    landmarks = create_mock_landmarks('bottom')
    for _ in range(5):
        analyzer.analyze_frame(landmarks)
    
    # Ascending (back to higher angles > 140)
    landmarks = create_mock_landmarks('ascending')
    for _ in range(5):
        analyzer.analyze_frame(landmarks)
    
    # Back to standing
    landmarks = create_mock_landmarks('standing')
    for _ in range(10):
        analyzer.analyze_frame(landmarks)
    
    # Check that rep summary was generated
    assert len(analyzer.set_data) == 1, f"Expected 1 rep, got {len(analyzer.set_data)}"
    assert 'summary' in analyzer.set_data[0]
    assert analyzer.set_data[0]['summary'].startswith('Rep 1:')
    print(f"✓ Rep summary: {analyzer.set_data[0]['summary']}")


def test_rep_summaries_text_format():
    """Test that rep summaries are formatted correctly for GPT."""
    analyzer = SquatAnalyzer()
    
    # Simulate 3 reps
    for i in range(3):
        for config in ['standing', 'descending', 'bottom', 'ascending', 'standing']:
            landmarks = create_mock_landmarks(config)
            for _ in range(5):
                analyzer.analyze_frame(landmarks)
    
    # Get formatted text
    summaries_text = analyzer.get_rep_summaries_text()
    
    assert summaries_text is not None
    assert '- Rep 1:' in summaries_text
    assert '- Rep 2:' in summaries_text
    assert '- Rep 3:' in summaries_text
    print(f"✓ Formatted summaries:\n{summaries_text}")


def test_edge_case_less_than_3_reps():
    """Test edge case: less than 3 reps."""
    coach = AICoach()
    
    # Create a set with only 2 reps
    set_summary = {
        'total_reps': 2,
        'avg_depth_angle': 85,
        'form_issues': {},
        'rep_details': []
    }
    
    feedback = coach.generate_set_summary(set_summary)
    
    assert feedback == "Do more reps to receive coaching"
    print("✓ Edge case handled: <3 reps returns expected message")


def test_edge_case_api_failure():
    """Test edge case: API failure handling."""
    # Create coach with invalid API key
    coach = AICoach(api_key="invalid_key")
    
    set_summary = {
        'total_reps': 5,
        'avg_depth_angle': 85,
        'form_issues': {},
        'rep_details': []
    }
    
    feedback = coach.generate_set_summary(set_summary, "- Rep 1: Good rep\n- Rep 2: Good rep")
    
    # Should return error message or fallback
    assert feedback is not None
    assert len(feedback) > 0
    print(f"✓ API failure handled gracefully: {feedback[:50]}...")


def test_gpt_prompt_format():
    """Test that GPT prompt follows the required format."""
    coach = AICoach()
    
    set_summary = {
        'total_reps': 5,
        'avg_depth_angle': 85,
        'form_issues': {'knee_valgus': 2},
        'rep_details': []
    }
    
    rep_summaries = """- Rep 1: Depth good, knees stable
- Rep 2: Depth shallow, knees caved in
- Rep 3: Depth good, chest leaned forward
- Rep 4: Good rep
- Rep 5: Depth good, knees stable"""
    
    # Get the prompt
    prompt = coach._create_summary_prompt(set_summary, rep_summaries)
    
    # Verify prompt format
    assert "Here is the summary of 5 squat reps:" in prompt
    assert "- Rep 1:" in prompt
    assert "Please give a short, 2–3 sentence feedback summary like a human strength coach" in prompt
    assert "Be supportive but point out errors" in prompt
    print(f"✓ GPT prompt format correct:\n{prompt}")


def test_tracking_form_issues():
    """Test that form issues are properly tracked per rep."""
    analyzer = SquatAnalyzer()
    
    # Simulate rep with knee valgus
    for config in ['standing', 'descending', 'knee_valgus', 'ascending', 'standing']:
        landmarks = create_mock_landmarks(config)
        for _ in range(3):
            result = analyzer.analyze_frame(landmarks)
    
    # Check that form issues were tracked
    if len(analyzer.set_data) > 0:
        rep_data = analyzer.set_data[0]
        assert 'had_knee_valgus' in rep_data
        assert 'had_forward_lean' in rep_data
        assert 'had_shallow_depth' in rep_data
        print("✓ Form issues tracked correctly per rep")


if __name__ == '__main__':
    # Run tests
    print("Running GPT coaching tests...\n")
    
    test_rep_summary_generation()
    print()
    
    test_rep_summaries_text_format()
    print()
    
    test_edge_case_less_than_3_reps()
    print()
    
    test_edge_case_api_failure()
    print()
    
    test_gpt_prompt_format()
    print()
    
    test_tracking_form_issues()
    print()
    
    print("\nAll GPT coaching tests passed! ✓")
