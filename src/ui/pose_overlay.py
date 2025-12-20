"""
Enhanced pose overlay component with customizable colors and styling.
"""
import cv2
import numpy as np


class PoseOverlay:
    """
    Draws pose landmarks with enhanced styling for demo UI.
    Supports customizable colors based on form quality.
    """
    
    def __init__(self, show_overlay=True):
        """
        Initialize the pose overlay.
        
        Args:
            show_overlay: Whether to show the skeleton overlay
        """
        self.show_overlay = show_overlay
        
        # Color schemes for different states
        self.COLORS = {
            'good': (0, 255, 0),      # Green for good form
            'warning': (0, 165, 255),  # Orange for minor issues
            'bad': (0, 0, 255),        # Red for poor form
            'neutral': (255, 255, 255) # White for neutral/tracking
        }
        
        # Landmark drawing specs
        self.LANDMARK_RADIUS = 5
        self.CONNECTION_THICKNESS = 3
        self.JOINT_RADIUS = 8
    
    def draw_skeleton(self, frame, pose_detector, results, form_quality='neutral'):
        """
        Draw enhanced skeleton overlay on frame.
        
        Args:
            frame: BGR image
            pose_detector: PoseDetector instance
            results: MediaPipe pose results
            form_quality: 'good', 'warning', 'bad', or 'neutral'
        
        Returns:
            Frame with skeleton drawn
        """
        if not self.show_overlay or not results.pose_landmarks:
            return frame
        
        # Get color based on form quality
        color = self.COLORS.get(form_quality, self.COLORS['neutral'])
        
        # Draw with custom styling
        self._draw_custom_landmarks(frame, pose_detector, results, color)
        
        return frame
    
    def _draw_custom_landmarks(self, frame, pose_detector, results, color):
        """
        Draw landmarks with custom styling.
        
        Args:
            frame: BGR image
            pose_detector: PoseDetector instance
            results: MediaPipe pose results
            color: RGB color tuple
        """
        landmarks = results.pose_landmarks.landmark
        height, width = frame.shape[:2]
        
        # Define key connections to draw (simplified skeleton)
        connections = [
            # Torso
            (pose_detector.LANDMARK_INDICES['left_shoulder'], pose_detector.LANDMARK_INDICES['right_shoulder']),
            (pose_detector.LANDMARK_INDICES['left_shoulder'], pose_detector.LANDMARK_INDICES['left_hip']),
            (pose_detector.LANDMARK_INDICES['right_shoulder'], pose_detector.LANDMARK_INDICES['right_hip']),
            (pose_detector.LANDMARK_INDICES['left_hip'], pose_detector.LANDMARK_INDICES['right_hip']),
            
            # Left arm
            (pose_detector.LANDMARK_INDICES['left_shoulder'], pose_detector.LANDMARK_INDICES['left_elbow']),
            (pose_detector.LANDMARK_INDICES['left_elbow'], pose_detector.LANDMARK_INDICES['left_wrist']),
            
            # Right arm
            (pose_detector.LANDMARK_INDICES['right_shoulder'], pose_detector.LANDMARK_INDICES['right_elbow']),
            (pose_detector.LANDMARK_INDICES['right_elbow'], pose_detector.LANDMARK_INDICES['right_wrist']),
            
            # Left leg
            (pose_detector.LANDMARK_INDICES['left_hip'], pose_detector.LANDMARK_INDICES['left_knee']),
            (pose_detector.LANDMARK_INDICES['left_knee'], pose_detector.LANDMARK_INDICES['left_ankle']),
            
            # Right leg
            (pose_detector.LANDMARK_INDICES['right_hip'], pose_detector.LANDMARK_INDICES['right_knee']),
            (pose_detector.LANDMARK_INDICES['right_knee'], pose_detector.LANDMARK_INDICES['right_ankle']),
        ]
        
        # Draw connections
        for start_idx, end_idx in connections:
            start_landmark = landmarks[start_idx]
            end_landmark = landmarks[end_idx]
            
            if start_landmark.visibility > 0.5 and end_landmark.visibility > 0.5:
                start_point = (int(start_landmark.x * width), int(start_landmark.y * height))
                end_point = (int(end_landmark.x * width), int(end_landmark.y * height))
                
                cv2.line(frame, start_point, end_point, color, self.CONNECTION_THICKNESS)
        
        # Draw key joints (larger circles)
        key_joints = [
            'left_shoulder', 'right_shoulder',
            'left_hip', 'right_hip',
            'left_knee', 'right_knee',
            'left_ankle', 'right_ankle'
        ]
        
        for joint_name in key_joints:
            idx = pose_detector.LANDMARK_INDICES[joint_name]
            landmark = landmarks[idx]
            
            if landmark.visibility > 0.5:
                point = (int(landmark.x * width), int(landmark.y * height))
                cv2.circle(frame, point, self.JOINT_RADIUS, color, -1)
                cv2.circle(frame, point, self.JOINT_RADIUS + 2, (0, 0, 0), 2)  # Black outline
    
    def toggle_overlay(self):
        """Toggle the overlay on/off."""
        self.show_overlay = not self.show_overlay
        return self.show_overlay
