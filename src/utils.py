"""
Utility functions for the posture correction app.
"""
import numpy as np


def calculate_angle(a, b, c):
    """
    Calculate the angle between three points (a, b, c) where b is the vertex.
    
    Args:
        a: First point (x, y, z) or (x, y)
        b: Vertex point (x, y, z) or (x, y)
        c: Third point (x, y, z) or (x, y)
    
    Returns:
        Angle in degrees (0-180)
    """
    a = np.array(a[:2])  # Use only x, y coordinates
    b = np.array(b[:2])
    c = np.array(c[:2])
    
    # Calculate vectors
    ba = a - b
    bc = c - b
    
    # Calculate angle
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    angle = np.arccos(cosine_angle)
    
    return np.degrees(angle)


def calculate_distance(point1, point2):
    """
    Calculate Euclidean distance between two points.
    
    Args:
        point1: First point (x, y, z) or (x, y)
        point2: Second point (x, y, z) or (x, y)
    
    Returns:
        Distance as float
    """
    p1 = np.array(point1[:2])
    p2 = np.array(point2[:2])
    return np.linalg.norm(p1 - p2)


def normalize_coordinates(landmarks, frame_width, frame_height):
    """
    Normalize landmark coordinates to pixel values.
    
    Args:
        landmarks: MediaPipe landmark list
        frame_width: Width of the frame
        frame_height: Height of the frame
    
    Returns:
        Dictionary of normalized landmarks
    """
    normalized = {}
    for idx, landmark in enumerate(landmarks):
        normalized[idx] = {
            'x': landmark.x * frame_width,
            'y': landmark.y * frame_height,
            'z': landmark.z * frame_width,
            'visibility': landmark.visibility
        }
    return normalized


def is_visible(landmark, threshold=0.5):
    """
    Check if a landmark is visible enough to use.
    
    Args:
        landmark: Landmark object with visibility attribute
        threshold: Minimum visibility threshold (0-1)
    
    Returns:
        Boolean indicating if landmark is visible
    """
    return hasattr(landmark, 'visibility') and landmark.visibility > threshold
