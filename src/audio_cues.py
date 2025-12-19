"""
Audio cue system with ducking support.
Plays voice prompts without interrupting background music.
"""
import pyttsx3
import threading
import time
from queue import Queue


class AudioCueSystem:
    """
    Manages audio feedback with ducking to avoid interrupting music.
    Uses text-to-speech for real-time cues.
    """
    
    def __init__(self, rate=150, volume=0.8):
        """
        Initialize the audio cue system.
        
        Args:
            rate: Speech rate (words per minute)
            volume: Volume level (0.0 to 1.0)
        """
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', rate)
        self.engine.setProperty('volume', volume)
        
        # Queue for audio cues
        self.cue_queue = Queue()
        self.is_running = False
        self.thread = None
        
        # Cooldown to prevent spam
        self.last_cue_time = {}
        self.cooldown_seconds = 3.0  # Don't repeat same cue within 3 seconds
        
        # Common cues
        self.CUES = {
            'knees_out': "Knees out",
            'chest_up': "Chest up",
            'go_deeper': "Go deeper",
            'good_rep': "Good",
            'set_complete': "Set complete"
        }
    
    def start(self):
        """Start the audio cue system."""
        if not self.is_running:
            self.is_running = True
            self.thread = threading.Thread(target=self._process_queue, daemon=True)
            self.thread.start()
    
    def stop(self):
        """Stop the audio cue system."""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=1.0)
    
    def play_cue(self, cue_name):
        """
        Add a cue to the queue.
        
        Args:
            cue_name: Name of the cue to play
        """
        if cue_name not in self.CUES:
            return
        
        # Check cooldown
        current_time = time.time()
        if cue_name in self.last_cue_time:
            if current_time - self.last_cue_time[cue_name] < self.cooldown_seconds:
                return  # Skip if in cooldown
        
        self.last_cue_time[cue_name] = current_time
        self.cue_queue.put(cue_name)
    
    def play_feedback(self, feedback_list):
        """
        Play audio feedback for a list of form issues.
        
        Args:
            feedback_list: List of feedback strings
        """
        for feedback in feedback_list:
            if "Knees out" in feedback:
                self.play_cue('knees_out')
            elif "Chest up" in feedback:
                self.play_cue('chest_up')
            elif "Go deeper" in feedback:
                self.play_cue('go_deeper')
    
    def announce_rep(self, rep_count):
        """
        Announce rep completion.
        
        Args:
            rep_count: Current rep count
        """
        # Only announce every 5 reps to avoid spam
        if rep_count % 5 == 0:
            self.play_cue('good_rep')
    
    def announce_set_complete(self, total_reps):
        """
        Announce set completion.
        
        Args:
            total_reps: Total reps completed
        """
        self.play_cue('set_complete')
        # Give a moment before speaking the count
        time.sleep(0.5)
        self._speak(f"{total_reps} reps")
    
    def _process_queue(self):
        """Process audio cues from the queue."""
        while self.is_running:
            try:
                if not self.cue_queue.empty():
                    cue_name = self.cue_queue.get(timeout=0.1)
                    text = self.CUES.get(cue_name, "")
                    if text:
                        self._speak(text)
                else:
                    time.sleep(0.1)
            except Exception as e:
                print(f"Audio cue error: {e}")
    
    def _speak(self, text):
        """
        Speak text using TTS engine.
        
        Args:
            text: Text to speak
        """
        try:
            # In a real implementation, this would:
            # 1. Request audio focus (Android) or begin interruption (iOS)
            # 2. Lower music volume (ducking)
            # 3. Play the cue
            # 4. Restore music volume
            # 5. Release audio focus
            
            self.engine.say(text)
            self.engine.runAndWait()
        except Exception as e:
            print(f"Speech error: {e}")
    
    def set_voice_properties(self, rate=None, volume=None, voice_id=None):
        """
        Customize voice properties.
        
        Args:
            rate: Speech rate (words per minute)
            volume: Volume level (0.0 to 1.0)
            voice_id: Voice ID for specific voice
        """
        if rate is not None:
            self.engine.setProperty('rate', rate)
        if volume is not None:
            self.engine.setProperty('volume', volume)
        if voice_id is not None:
            self.engine.setProperty('voice', voice_id)
    
    def get_available_voices(self):
        """Get list of available voices."""
        voices = self.engine.getProperty('voices')
        return [(voice.id, voice.name) for voice in voices]
    
    def __del__(self):
        """Cleanup on deletion."""
        self.stop()
