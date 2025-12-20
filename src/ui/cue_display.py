"""
Cue display component with fade animations and color coding.
"""
import cv2
import time
import numpy as np


class CueDisplay:
    """
    Displays real-time form cues with fade-in/fade-out animations.
    """
    
    def __init__(self, display_duration=1.5, enabled=True):
        """
        Initialize the cue display.
        
        Args:
            display_duration: How long to show each cue (seconds)
            enabled: Whether cue display is enabled
        """
        self.display_duration = display_duration
        self.enabled = enabled
        
        # Active cues with timestamps
        self.active_cues = {}
        
        # Color coding for cues
        self.CUE_COLORS = {
            'good': (0, 255, 0),      # Green for positive feedback
            'warning': (0, 165, 255),  # Orange for corrections
            'bad': (0, 0, 255),        # Red for serious issues
        }
        
        # Font settings for demo
        self.FONT = cv2.FONT_HERSHEY_SIMPLEX
        self.FONT_SCALE = 1.5
        self.FONT_THICKNESS = 3
    
    def add_cue(self, cue_text, cue_type='warning'):
        """
        Add a new cue to display.
        
        Args:
            cue_text: Text to display
            cue_type: 'good', 'warning', or 'bad'
        """
        if not self.enabled:
            return
        
        current_time = time.time()
        self.active_cues[cue_text] = {
            'type': cue_type,
            'start_time': current_time,
            'color': self.CUE_COLORS.get(cue_type, self.CUE_COLORS['warning'])
        }
    
    def draw_cues(self, frame):
        """
        Draw active cues on the frame with fade effect.
        
        Args:
            frame: BGR image
        
        Returns:
            Frame with cues drawn
        """
        if not self.enabled:
            return frame
        
        current_time = time.time()
        height, width = frame.shape[:2]
        
        # Remove expired cues
        expired_cues = []
        for cue_text, cue_data in self.active_cues.items():
            elapsed = current_time - cue_data['start_time']
            if elapsed > self.display_duration:
                expired_cues.append(cue_text)
        
        for cue_text in expired_cues:
            del self.active_cues[cue_text]
        
        # Draw remaining cues (centered, large text)
        if self.active_cues:
            # Position cues in center of screen
            y_center = height // 2
            
            for idx, (cue_text, cue_data) in enumerate(self.active_cues.items()):
                # Calculate fade effect
                elapsed = current_time - cue_data['start_time']
                alpha = self._calculate_alpha(elapsed)
                
                # Get text size for centering
                text_size = cv2.getTextSize(cue_text, self.FONT, self.FONT_SCALE, self.FONT_THICKNESS)[0]
                text_x = (width - text_size[0]) // 2
                text_y = y_center + (idx * 80) - ((len(self.active_cues) - 1) * 40)
                
                # Draw text with fade effect
                self._draw_faded_text(
                    frame, cue_text, (text_x, text_y),
                    cue_data['color'], alpha
                )
        
        return frame
    
    def _calculate_alpha(self, elapsed_time):
        """
        Calculate alpha value for fade effect.
        
        Args:
            elapsed_time: Time since cue started
        
        Returns:
            Alpha value between 0 and 1
        """
        fade_in_duration = 0.2  # 200ms fade in
        fade_out_duration = 0.3  # 300ms fade out
        
        if elapsed_time < fade_in_duration:
            # Fade in
            return elapsed_time / fade_in_duration
        elif elapsed_time > (self.display_duration - fade_out_duration):
            # Fade out
            remaining = self.display_duration - elapsed_time
            return remaining / fade_out_duration
        else:
            # Full opacity
            return 1.0
    
    def _draw_faded_text(self, frame, text, position, color, alpha):
        """
        Draw text with alpha blending for fade effect.
        
        Args:
            frame: BGR image
            text: Text to draw
            position: (x, y) position
            color: RGB color tuple
            alpha: Alpha value (0-1)
        """
        # Create overlay for text with background
        overlay = frame.copy()
        
        # Get text dimensions
        text_size = cv2.getTextSize(text, self.FONT, self.FONT_SCALE, self.FONT_THICKNESS)[0]
        
        # Draw semi-transparent background box
        padding = 20
        box_x1 = position[0] - padding
        box_y1 = position[1] - text_size[1] - padding
        box_x2 = position[0] + text_size[0] + padding
        box_y2 = position[1] + padding
        
        cv2.rectangle(overlay, (box_x1, box_y1), (box_x2, box_y2), (0, 0, 0), -1)
        
        # Blend background
        cv2.addWeighted(overlay, alpha * 0.7, frame, 1 - (alpha * 0.7), 0, frame)
        
        # Draw text with black outline for better visibility
        outline_color = (0, 0, 0)
        for dx, dy in [(-2, -2), (-2, 2), (2, -2), (2, 2)]:
            cv2.putText(
                frame, text,
                (position[0] + dx, position[1] + dy),
                self.FONT, self.FONT_SCALE,
                outline_color, self.FONT_THICKNESS + 1
            )
        
        # Draw main text
        adjusted_color = tuple(int(c * alpha) for c in color)
        cv2.putText(
            frame, text, position,
            self.FONT, self.FONT_SCALE,
            adjusted_color, self.FONT_THICKNESS
        )
    
    def clear_all(self):
        """Clear all active cues."""
        self.active_cues.clear()
    
    def toggle_display(self):
        """Toggle cue display on/off."""
        self.enabled = not self.enabled
        if not self.enabled:
            self.clear_all()
        return self.enabled
