"""
AI Coach using OpenAI GPT-4 for workout summaries and personalized feedback.
"""
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class AICoach:
    """
    AI coaching assistant that provides natural language feedback
    on workout performance using GPT-4.
    """
    
    def __init__(self, api_key=None):
        """
        Initialize the AI coach.
        
        Args:
            api_key: OpenAI API key (defaults to environment variable)
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            print("Warning: OPENAI_API_KEY not set. AI coaching will be disabled.")
            self.client = None
        else:
            self.client = OpenAI(api_key=self.api_key)
    
    def generate_set_summary(self, set_summary):
        """
        Generate a natural language summary of a completed set.
        
        Args:
            set_summary: Dictionary with set statistics
        
        Returns:
            String with coaching feedback
        """
        if not self.client:
            return self._generate_fallback_summary(set_summary)
        
        try:
            # Create prompt with set data
            prompt = self._create_summary_prompt(set_summary)
            
            # Call GPT-4
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert strength coach providing concise, encouraging feedback on squat form. Keep responses under 3 sentences. Be specific about form issues but stay positive."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=150,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            print(f"AI Coach error: {e}")
            return self._generate_fallback_summary(set_summary)
    
    def _create_summary_prompt(self, set_summary):
        """Create a prompt for the AI with set statistics."""
        total_reps = set_summary['total_reps']
        avg_depth = set_summary['avg_depth_angle']
        form_issues = set_summary['form_issues']
        
        prompt = f"I just completed {total_reps} squats. "
        
        # Depth analysis
        if avg_depth < 90:
            prompt += f"Average depth was excellent (knee angle: {avg_depth:.0f}°). "
        elif avg_depth < 100:
            prompt += f"Average depth was good (knee angle: {avg_depth:.0f}°). "
        else:
            prompt += f"Average depth was shallow (knee angle: {avg_depth:.0f}°). "
        
        # Form issues
        if form_issues:
            issues_text = []
            if 'knee_valgus' in form_issues:
                issues_text.append(f"knees caving in ({form_issues['knee_valgus']} reps)")
            if 'forward_lean' in form_issues:
                issues_text.append(f"excessive forward lean ({form_issues['forward_lean']} reps)")
            if 'shallow_depth' in form_issues:
                issues_text.append(f"shallow depth ({form_issues['shallow_depth']} reps)")
            
            prompt += f"Form issues: {', '.join(issues_text)}. "
        else:
            prompt += "No form issues detected. "
        
        prompt += "Give me brief coaching feedback."
        
        return prompt
    
    def _generate_fallback_summary(self, set_summary):
        """Generate a basic summary without AI."""
        total_reps = set_summary['total_reps']
        avg_depth = set_summary['avg_depth_angle']
        form_issues = set_summary['form_issues']
        
        summary = f"Great work! Completed {total_reps} reps. "
        
        # Depth feedback
        if avg_depth < 90:
            summary += "Excellent depth! "
        elif avg_depth < 100:
            summary += "Good depth. "
        else:
            summary += "Try to squat deeper next time. "
        
        # Form feedback
        if not form_issues:
            summary += "Form was solid throughout."
        else:
            issue_count = sum(form_issues.values())
            summary += f"Watch out for form issues in {issue_count} reps. "
            
            if 'knee_valgus' in form_issues:
                summary += "Focus on pushing knees outward. "
            if 'forward_lean' in form_issues:
                summary += "Keep your chest up. "
        
        return summary
    
    def generate_workout_plan(self, user_profile):
        """
        Generate personalized workout suggestions.
        
        Args:
            user_profile: Dictionary with user info and history
        
        Returns:
            String with workout recommendations
        """
        if not self.client:
            return "AI coaching unavailable. Continue with your regular routine."
        
        try:
            prompt = f"""Based on this profile, suggest next steps for squat training:
            
            Experience level: {user_profile.get('experience', 'beginner')}
            Recent sets: {user_profile.get('recent_sets', 0)}
            Common form issues: {user_profile.get('common_issues', 'none')}
            
            Provide 2-3 specific, actionable recommendations."""
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a strength coach providing personalized training advice."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            print(f"AI Coach error: {e}")
            return "Focus on form over volume. Practice bodyweight squats daily."
