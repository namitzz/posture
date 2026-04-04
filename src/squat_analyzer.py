"""
Squat analyzer with state machine for rep counting and form analysis.
Provides real-time feedback on squat form.
"""
from enum import Enum
from utils import calculate_angle, calculate_distance


class SquatState(Enum):
    """States in the squat movement."""
    STANDING = "standing"
    DESCENDING = "descending"
    BOTTOM = "bottom"
    ASCENDING = "ascending"


class SquatAnalyzer:
    """
    Analyzes squat form using a state machine.
    Tracks reps, angles, and provides form feedback.
    """
    
    # Configuration constants - can be customized per user
    DESCENT_ANGLE = 175      # Start of descent
    BOTTOM_ANGLE = 155       # Deep squat position
    ASCENT_ANGLE = 160       # Rising back up
    GOOD_DEPTH_ANGLE = 90    # Parallel or below
    KNEE_VALGUS_THRESHOLD = 0.15  # Knees caving in (15% hip-width reduction)
    FORWARD_LEAN_THRESHOLD = 20   # Excessive forward lean
    
    def __init__(self):
        """Initialize the squat analyzer."""
        self.state = SquatState.STANDING
        self.rep_count = 0
        self.current_rep_data = {
            'min_knee_angle': 180,
            'max_knee_angle': 0,
            'form_issues': [],
            'had_knee_valgus': False,
            'had_forward_lean': False,
            'had_shallow_depth': False
        }
        self.set_data = []
    
    def analyze_frame(self, landmarks_dict):
        """
        Analyze a single frame for squat form.
        
        Args:
            landmarks_dict: Dictionary of landmark objects
        
        Returns:
            Dictionary with analysis results
        """
        if not self._has_required_landmarks(landmarks_dict):
            return {
                'state': self.state.value,
                'rep_count': self.rep_count,
                'knee_angle': 0,
                'hip_angle': 0,
                'feedback': [],
                'valid_pose': False
            }
        
        # Calculate key angles
        left_knee_angle = self._calculate_knee_angle(landmarks_dict, 'left')
        right_knee_angle = self._calculate_knee_angle(landmarks_dict, 'right')
        knee_angle = min(left_knee_angle, right_knee_angle)
        
        hip_angle = self._calculate_hip_angle(landmarks_dict)
        
        # Update state machine
        previous_state = self.state
        self._update_state(knee_angle)
        
        # Track rep completion
        if previous_state == SquatState.ASCENDING and self.state == SquatState.STANDING:
            self._complete_rep()
        
        # Analyze form
        feedback = self._analyze_form(landmarks_dict, knee_angle, hip_angle)
        
        # Update current rep data
        if self.state != SquatState.STANDING:
            self.current_rep_data['min_knee_angle'] = min(
                self.current_rep_data['min_knee_angle'], 
                knee_angle
            )
            self.current_rep_data['max_knee_angle'] = max(
                self.current_rep_data['max_knee_angle'], 
                knee_angle
            )
        
        return {
            'state': self.state.value,
            'rep_count': self.rep_count,
            'knee_angle': knee_angle,
            'hip_angle': hip_angle,
            'feedback': feedback,
            'valid_pose': True
        }
    
    def _has_required_landmarks(self, landmarks_dict):
        """Check if all required landmarks are visible."""
        required = [
            'left_hip', 'right_hip',
            'left_knee', 'right_knee',
            'left_ankle', 'right_ankle',
            'left_shoulder', 'right_shoulder'
        ]
        return all(
            name in landmarks_dict and 
            landmarks_dict[name].visibility > 0.5 
            for name in required
        )
    
    def _calculate_knee_angle(self, landmarks_dict, side):
        """Calculate knee angle for left or right side."""
        hip = landmarks_dict[f'{side}_hip']
        knee = landmarks_dict[f'{side}_knee']
        ankle = landmarks_dict[f'{side}_ankle']
        
        return calculate_angle(
            (hip.x, hip.y, hip.z),
            (knee.x, knee.y, knee.z),
            (ankle.x, ankle.y, ankle.z)
        )
    
    def _calculate_hip_angle(self, landmarks_dict):
        """Calculate hip angle (torso to thigh)."""
        shoulder = landmarks_dict['left_shoulder']
        hip = landmarks_dict['left_hip']
        knee = landmarks_dict['left_knee']
        
        return calculate_angle(
            (shoulder.x, shoulder.y, shoulder.z),
            (hip.x, hip.y, hip.z),
            (knee.x, knee.y, knee.z)
        )
    
    def _update_state(self, knee_angle):
        """Update the state machine based on knee angle."""
        if self.state == SquatState.STANDING:
            if knee_angle < self.DESCENT_ANGLE:
                self.state = SquatState.DESCENDING
        
        elif self.state == SquatState.DESCENDING:
            if knee_angle < self.BOTTOM_ANGLE:
                self.state = SquatState.BOTTOM
        
        elif self.state == SquatState.BOTTOM:
            # Start ascent once angle opens back up from the bottom
            if knee_angle > self.ASCENT_ANGLE:
                self.state = SquatState.ASCENDING
        
        elif self.state == SquatState.ASCENDING:
            if knee_angle > 160:
                self.state = SquatState.STANDING
    
    def _analyze_form(self, landmarks_dict, knee_angle, hip_angle):
        """Analyze squat form and provide feedback."""
        feedback = []
        
        # Check depth
        if self.state == SquatState.BOTTOM:
            if knee_angle > self.GOOD_DEPTH_ANGLE + 10:
                feedback.append("Go deeper - squat to parallel")
                self.current_rep_data['form_issues'].append('shallow_depth')
                self.current_rep_data['had_shallow_depth'] = True
        
        # Check knee alignment
        knee_valgus = self._check_knee_valgus(landmarks_dict)
        if knee_valgus:
            feedback.append("Knees out - push knees outward")
            self.current_rep_data['form_issues'].append('knee_valgus')
            self.current_rep_data['had_knee_valgus'] = True
        
        # Check forward lean
        if hip_angle < 70:
            feedback.append("Chest up - keep torso upright")
            self.current_rep_data['form_issues'].append('forward_lean')
            self.current_rep_data['had_forward_lean'] = True
        
        return feedback
    
    def _check_knee_valgus(self, landmarks_dict):
        """Check if knees are caving inward."""
        left_hip = landmarks_dict['left_hip']
        right_hip = landmarks_dict['right_hip']
        left_knee = landmarks_dict['left_knee']
        right_knee = landmarks_dict['right_knee']
        
        hip_width = calculate_distance(
            (left_hip.x, left_hip.y),
            (right_hip.x, right_hip.y)
        )
        knee_width = calculate_distance(
            (left_knee.x, left_knee.y),
            (right_knee.x, right_knee.y)
        )
        
        # If knees are significantly closer than hips, it's valgus
        if hip_width <= 1e-6:
            return False
        return (hip_width - knee_width) / hip_width > self.KNEE_VALGUS_THRESHOLD
    
    def _generate_rep_summary(self, rep_number, rep_data):
        """
        Generate a human-readable summary for a single rep.
        Format: "Rep X: Depth good, knees stable"
        """
        summary_parts = []
        
        # Analyze depth
        depth = rep_data['min_knee_angle']
        if depth <= self.GOOD_DEPTH_ANGLE:
            summary_parts.append("Depth good")
        else:
            summary_parts.append("Depth shallow")
        
        # Analyze knee stability
        if rep_data['had_knee_valgus']:
            summary_parts.append("knees caved in")
        else:
            summary_parts.append("knees stable")
        
        # Analyze chest angle
        if rep_data['had_forward_lean']:
            summary_parts.append("chest leaned forward")
        else:
            summary_parts.append("chest upright")
        
        # Check if it's a "good rep" (no issues)
        if not rep_data['form_issues']:
            return f"Rep {rep_number}: Good rep"
        
        return f"Rep {rep_number}: {', '.join(summary_parts)}"
    
    def _complete_rep(self):
        """Complete the current rep and save data."""
        self.rep_count += 1
        
        # Generate human-readable summary for this rep
        rep_summary = self._generate_rep_summary(self.rep_count, self.current_rep_data)
        rep_data = self.current_rep_data.copy()
        rep_data['summary'] = rep_summary
        
        self.set_data.append(rep_data)
        
        # Reset for next rep
        self.current_rep_data = {
            'min_knee_angle': 180,
            'max_knee_angle': 0,
            'form_issues': [],
            'had_knee_valgus': False,
            'had_forward_lean': False,
            'had_shallow_depth': False
        }
    
    def get_set_summary(self):
        """Get summary of the completed set."""
        if not self.set_data:
            return None
        
        total_reps = len(self.set_data)
        
        # Count form issues
        form_issue_counts = {}
        for rep_data in self.set_data:
            for issue in rep_data['form_issues']:
                form_issue_counts[issue] = form_issue_counts.get(issue, 0) + 1
        
        # Calculate average depth
        avg_depth = sum(rep['min_knee_angle'] for rep in self.set_data) / total_reps
        
        return {
            'total_reps': total_reps,
            'avg_depth_angle': avg_depth,
            'form_issues': form_issue_counts,
            'rep_details': self.set_data
        }
    
    def get_rep_summaries_text(self):
        """
        Get per-rep summaries formatted as text for GPT prompt.
        Returns a string like:
        - Rep 1: Depth good, knees stable
        - Rep 2: Depth shallow, knees caved in
        """
        if not self.set_data:
            return ""
        
        summaries = []
        for rep_data in self.set_data:
            summaries.append(f"- {rep_data['summary']}")
        
        return "\n".join(summaries)
    
    def reset(self):
        """Reset the analyzer for a new set."""
        self.state = SquatState.STANDING
        self.rep_count = 0
        self.current_rep_data = {
            'min_knee_angle': 180,
            'max_knee_angle': 0,
            'form_issues': [],
            'had_knee_valgus': False,
            'had_forward_lean': False,
            'had_shallow_depth': False
        }
        self.set_data = []
