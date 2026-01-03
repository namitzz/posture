"""
Pose detection module using MediaPipe BlazePose.
Detects 33-point skeleton from camera feed.
"""
import sys

try:
    import cv2
except ImportError as e:
    print("Error: OpenCV is not installed.")
    print("Please install it with: pip install opencv-python")
    print(f"Details: {e}")
    sys.exit(1)

try:
    import mediapipe as mp
except ImportError as e:
    print("Error: MediaPipe is not installed.")
    print("Please install it with: pip install mediapipe")
    print(f"Details: {e}")
    sys.exit(1)

import numpy as np


class PoseDetector:
    """
    Real-time pose detection using MediaPipe BlazePose.
    Detects 33 body landmarks for full-body tracking.
    """
    
    def __init__(self, 
                 static_image_mode=False,
                 model_complexity=1,
                 smooth_landmarks=True,
                 min_detection_confidence=0.5,
                 min_tracking_confidence=0.5):
        """
        Initialize the pose detector.
        
        Args:
            static_image_mode: Whether to treat each image independently
            model_complexity: Complexity of pose model (0, 1, or 2)
            smooth_landmarks: Whether to smooth landmarks across frames
            min_detection_confidence: Minimum confidence for detection
            min_tracking_confidence: Minimum confidence for tracking
        """
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        self.pose = self.mp_pose.Pose(
            static_image_mode=static_image_mode,
            model_complexity=model_complexity,
            smooth_landmarks=smooth_landmarks,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        
        # MediaPipe landmark indices
        self.LANDMARK_INDICES = {
            'nose': 0,
            'left_eye_inner': 1,
            'left_eye': 2,
            'left_eye_outer': 3,
            'right_eye_inner': 4,
            'right_eye': 5,
            'right_eye_outer': 6,
            'left_ear': 7,
            'right_ear': 8,
            'mouth_left': 9,
            'mouth_right': 10,
            'left_shoulder': 11,
            'right_shoulder': 12,
            'left_elbow': 13,
            'right_elbow': 14,
            'left_wrist': 15,
            'right_wrist': 16,
            'left_pinky': 17,
            'right_pinky': 18,
            'left_index': 19,
            'right_index': 20,
            'left_thumb': 21,
            'right_thumb': 22,
            'left_hip': 23,
            'right_hip': 24,
            'left_knee': 25,
            'right_knee': 26,
            'left_ankle': 27,
            'right_ankle': 28,
            'left_heel': 29,
            'right_heel': 30,
            'left_foot_index': 31,
            'right_foot_index': 32
        }
    
    def detect(self, frame):
        """
        Detect pose landmarks in a frame.
        
        Args:
            frame: BGR image from camera
        
        Returns:
            Tuple of (results, processed_frame)
        """
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image_rgb.flags.writeable = False
        
        # Detect pose
        results = self.pose.process(image_rgb)
        
        # Convert back to BGR
        image_rgb.flags.writeable = True
        frame = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
        
        return results, frame
    
    def draw_landmarks(self, frame, results):
        """
        Draw pose landmarks and connections on the frame.
        
        Args:
            frame: BGR image
            results: MediaPipe pose results
        
        Returns:
            Frame with landmarks drawn
        """
        if results.pose_landmarks:
            self.mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
            )
        return frame
    
    def get_landmark(self, results, landmark_name):
        """
        Get a specific landmark from results.
        
        Args:
            results: MediaPipe pose results
            landmark_name: Name of the landmark
        
        Returns:
            Landmark object or None
        """
        if not results.pose_landmarks:
            return None
        
        idx = self.LANDMARK_INDICES.get(landmark_name)
        if idx is None:
            return None
        
        return results.pose_landmarks.landmark[idx]
    
    def get_landmarks_dict(self, results):
        """
        Get all landmarks as a dictionary.
        
        Args:
            results: MediaPipe pose results
        
        Returns:
            Dictionary mapping landmark names to landmark objects
        """
        if not results.pose_landmarks:
            return {}
        
        landmarks_dict = {}
        for name, idx in self.LANDMARK_INDICES.items():
            landmarks_dict[name] = results.pose_landmarks.landmark[idx]
        
        return landmarks_dict
    
    def close(self):
        """Release resources."""
        self.pose.close()
