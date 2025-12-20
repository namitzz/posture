"""
Set summary screen with slide-in animation and AI coaching feedback.
"""
import cv2
import numpy as np
import time


class SetSummaryScreen:
    """
    Displays post-set summary with stats and AI coaching feedback.
    Features slide-in animation and attractive dark mode styling.
    """
    
    def __init__(self):
        """Initialize the set summary screen."""
        self.is_visible = False
        self.animation_progress = 0.0  # 0 to 1
        self.animation_duration = 0.5  # seconds
        self.animation_start_time = None
        
        # Summary data
        self.summary_data = None
        self.coaching_text = None
        
        # UI dimensions (will be set based on frame size)
        self.panel_width = 0
        self.panel_height = 0
        self.panel_x = 0
        self.panel_y = 0
        
        # Colors (dark mode theme)
        self.BG_COLOR = (40, 40, 40)       # Dark gray
        self.BORDER_COLOR = (0, 255, 255)   # Cyan
        self.TEXT_COLOR = (255, 255, 255)   # White
        self.ACCENT_COLOR = (0, 255, 0)     # Green
        self.TITLE_COLOR = (0, 255, 255)    # Cyan
    
    def show(self, summary_data, coaching_text):
        """
        Show the summary screen with animation.
        
        Args:
            summary_data: Dictionary with set statistics
            coaching_text: AI coaching feedback text
        """
        self.summary_data = summary_data
        self.coaching_text = coaching_text
        self.is_visible = True
        self.animation_start_time = time.time()
        self.animation_progress = 0.0
    
    def hide(self):
        """Hide the summary screen."""
        self.is_visible = False
        self.animation_progress = 0.0
    
    def draw(self, frame):
        """
        Draw the summary screen on the frame.
        
        Args:
            frame: BGR image
        
        Returns:
            Frame with summary screen drawn
        """
        if not self.is_visible or not self.summary_data:
            return frame
        
        # Update animation
        if self.animation_start_time:
            elapsed = time.time() - self.animation_start_time
            self.animation_progress = min(1.0, elapsed / self.animation_duration)
            
            if self.animation_progress >= 1.0:
                self.animation_start_time = None
        
        # Calculate panel dimensions
        height, width = frame.shape[:2]
        self.panel_width = min(800, width - 100)
        self.panel_height = min(400, height - 100)
        
        # Slide-in from bottom
        target_y = (height - self.panel_height) // 2
        start_y = height
        current_y = int(start_y + (target_y - start_y) * self._ease_out_cubic(self.animation_progress))
        
        self.panel_x = (width - self.panel_width) // 2
        self.panel_y = current_y
        
        # Draw the panel
        self._draw_panel(frame)
        
        # Draw content only when panel is mostly visible
        if self.animation_progress > 0.5:
            self._draw_content(frame)
        
        return frame
    
    def _ease_out_cubic(self, t):
        """Cubic easing for smooth animation."""
        return 1 - pow(1 - t, 3)
    
    def _draw_panel(self, frame):
        """Draw the main panel background."""
        # Create overlay
        overlay = frame.copy()
        
        # Draw rounded rectangle background
        cv2.rectangle(
            overlay,
            (self.panel_x, self.panel_y),
            (self.panel_x + self.panel_width, self.panel_y + self.panel_height),
            self.BG_COLOR,
            -1
        )
        
        # Blend with frame
        alpha = 0.95
        cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)
        
        # Draw border
        cv2.rectangle(
            frame,
            (self.panel_x, self.panel_y),
            (self.panel_x + self.panel_width, self.panel_y + self.panel_height),
            self.BORDER_COLOR,
            3
        )
    
    def _draw_content(self, frame):
        """Draw the summary content."""
        padding = 30
        x = self.panel_x + padding
        y = self.panel_y + padding
        
        # Title
        cv2.putText(
            frame, "SET COMPLETE!", (x, y + 30),
            cv2.FONT_HERSHEY_BOLD, 1.2, self.TITLE_COLOR, 3
        )
        
        y += 70
        
        # Stats
        total_reps = self.summary_data.get('total_reps', 0)
        avg_depth = self.summary_data.get('avg_depth_angle', 0)
        
        # Rep count
        cv2.putText(
            frame, f"Total Reps: {total_reps}",
            (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, self.TEXT_COLOR, 2
        )
        y += 40
        
        # Avg depth
        depth_text = f"Avg Depth: {avg_depth:.0f}"
        depth_color = self.ACCENT_COLOR if avg_depth <= 90 else (0, 165, 255)
        cv2.putText(
            frame, depth_text,
            (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, depth_color, 2
        )
        y += 50
        
        # AI Coaching section
        cv2.putText(
            frame, "AI COACH:", (x, y),
            cv2.FONT_HERSHEY_BOLD, 0.9, self.TITLE_COLOR, 2
        )
        y += 35
        
        # Word-wrap coaching text
        if self.coaching_text:
            lines = self._wrap_text(self.coaching_text, self.panel_width - 2 * padding)
            for line in lines[:4]:  # Max 4 lines
                cv2.putText(
                    frame, line, (x, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, self.TEXT_COLOR, 1
                )
                y += 30
        
        # Action buttons hint
        y = self.panel_y + self.panel_height - 40
        button_text = "Press 'P' for audio | Press 'R' to reset | Press SPACE to continue"
        text_size = cv2.getTextSize(button_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
        button_x = self.panel_x + (self.panel_width - text_size[0]) // 2
        
        cv2.putText(
            frame, button_text, (button_x, y),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1
        )
    
    def _wrap_text(self, text, max_width):
        """
        Wrap text to fit within max width.
        
        Args:
            text: Text to wrap
            max_width: Maximum width in pixels
        
        Returns:
            List of text lines
        """
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            text_size = cv2.getTextSize(test_line, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)[0]
            
            if text_size[0] <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return lines
