"""
Settings screen with toggles for app features.
"""
import cv2
import numpy as np


class SettingsScreen:
    """
    Settings screen with toggle controls for various features.
    """
    
    def __init__(self):
        """Initialize the settings screen."""
        self.is_visible = False
        
        # Settings state
        self.settings = {
            'show_skeleton': True,
            'enable_audio_cues': True,
            'enable_ai_coaching': True,
            'debug_mode': False
        }
        
        # Selected setting index for keyboard navigation
        self.selected_index = 0
        
        # UI settings
        self.BG_COLOR = (30, 30, 30)
        self.BORDER_COLOR = (100, 100, 100)
        self.TEXT_COLOR = (255, 255, 255)
        self.SELECTED_COLOR = (0, 255, 255)
        self.TOGGLE_ON_COLOR = (0, 255, 0)
        self.TOGGLE_OFF_COLOR = (100, 100, 100)
    
    def toggle_visibility(self):
        """Toggle settings screen visibility."""
        self.is_visible = not self.is_visible
        return self.is_visible
    
    def show(self):
        """Show the settings screen."""
        self.is_visible = True
    
    def hide(self):
        """Hide the settings screen."""
        self.is_visible = False
    
    def draw(self, frame):
        """
        Draw the settings screen overlay.
        
        Args:
            frame: BGR image
        
        Returns:
            Frame with settings screen drawn
        """
        if not self.is_visible:
            return frame
        
        height, width = frame.shape[:2]
        
        # Create semi-transparent overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (width, height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        
        # Settings panel dimensions
        panel_width = 600
        panel_height = 400
        panel_x = (width - panel_width) // 2
        panel_y = (height - panel_height) // 2
        
        # Draw panel background
        cv2.rectangle(
            frame,
            (panel_x, panel_y),
            (panel_x + panel_width, panel_y + panel_height),
            self.BG_COLOR,
            -1
        )
        
        # Draw border
        cv2.rectangle(
            frame,
            (panel_x, panel_y),
            (panel_x + panel_width, panel_y + panel_height),
            self.BORDER_COLOR,
            2
        )
        
        # Title
        cv2.putText(
            frame, "SETTINGS", (panel_x + 30, panel_y + 50),
            cv2.FONT_HERSHEY_DUPLEX, 1.2, self.TEXT_COLOR, 3
        )
        
        # Draw settings items
        y_offset = panel_y + 110
        item_height = 60
        
        setting_items = [
            ('show_skeleton', 'Show Skeleton Overlay'),
            ('enable_audio_cues', 'Enable Audio Cues'),
            ('enable_ai_coaching', 'Enable AI Coaching'),
            ('debug_mode', 'Debug Mode (show angles)')
        ]
        
        for idx, (key, label) in enumerate(setting_items):
            y = y_offset + (idx * item_height)
            is_selected = (idx == self.selected_index)
            is_enabled = self.settings[key]
            
            # Draw setting item
            self._draw_setting_item(
                frame, label, is_enabled, is_selected,
                panel_x + 30, y, panel_width - 60
            )
        
        # Instructions
        instructions = "Press 'S' to close settings | Use arrow keys to navigate | Press ENTER to toggle"
        text_size = cv2.getTextSize(instructions, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
        text_x = panel_x + (panel_width - text_size[0]) // 2
        cv2.putText(
            frame, instructions, (text_x, panel_y + panel_height - 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1
        )
        
        return frame
    
    def _draw_setting_item(self, frame, label, is_enabled, is_selected, x, y, width):
        """
        Draw a single setting item with toggle.
        
        Args:
            frame: BGR image
            label: Setting label text
            is_enabled: Whether the setting is enabled
            is_selected: Whether this item is currently selected
            x, y: Position
            width: Item width
        """
        # Highlight if selected
        if is_selected:
            cv2.rectangle(
                frame, (x - 10, y - 30), (x + width + 10, y + 10),
                self.SELECTED_COLOR, 2
            )
        
        # Draw label
        text_color = self.SELECTED_COLOR if is_selected else self.TEXT_COLOR
        cv2.putText(
            frame, label, (x, y),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, text_color, 2
        )
        
        # Draw toggle indicator
        toggle_x = x + width - 100
        toggle_text = "[ON]" if is_enabled else "[OFF]"
        toggle_color = self.TOGGLE_ON_COLOR if is_enabled else self.TOGGLE_OFF_COLOR
        
        cv2.putText(
            frame, toggle_text, (toggle_x, y),
            cv2.FONT_HERSHEY_DUPLEX, 0.7, toggle_color, 2
        )
    
    def navigate_up(self):
        """Move selection up."""
        self.selected_index = max(0, self.selected_index - 1)
    
    def navigate_down(self):
        """Move selection down."""
        max_index = len(self.settings) - 1
        self.selected_index = min(max_index, self.selected_index + 1)
    
    def toggle_selected(self):
        """Toggle the currently selected setting."""
        setting_keys = list(self.settings.keys())
        if 0 <= self.selected_index < len(setting_keys):
            key = setting_keys[self.selected_index]
            self.settings[key] = not self.settings[key]
            return key, self.settings[key]
        return None, None
    
    def get_setting(self, key):
        """
        Get the value of a setting.
        
        Args:
            key: Setting key
        
        Returns:
            Boolean value of the setting
        """
        return self.settings.get(key, True)
    
    def set_setting(self, key, value):
        """
        Set the value of a setting.
        
        Args:
            key: Setting key
            value: Boolean value
        """
        if key in self.settings:
            self.settings[key] = value
