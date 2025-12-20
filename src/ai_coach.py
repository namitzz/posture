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
    
    # Model configuration
    PRIMARY_MODEL = "gpt-3.5-turbo"
    FALLBACK_MODEL = "gpt-4o"
    
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
    
    def generate_set_summary(self, set_summary, rep_summaries_text=None):
        """
        Generate a natural language summary of a completed set.
        
        Args:
            set_summary: Dictionary with set statistics
            rep_summaries_text: Optional pre-formatted rep summaries text
        
        Returns:
            String with coaching feedback
        """
        # Handle edge case: less than 3 reps
        if set_summary['total_reps'] < 3:
            return "Do more reps to receive coaching"
        
        if not self.client:
            return self._generate_fallback_summary(set_summary)
        
        try:
            # Create prompt with set data
            prompt = self._create_summary_prompt(set_summary, rep_summaries_text)
            
            # Call GPT-3.5-turbo (as specified in requirements)
            try:
                response = self.client.chat.completions.create(
                    model=self.PRIMARY_MODEL,
                    messages=[
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    max_tokens=150,
                    temperature=0.7
                )
            except Exception as model_error:
                # Fallback to GPT-4 if 3.5 unavailable
                if "model" in str(model_error).lower():
                    response = self.client.chat.completions.create(
                        model=self.FALLBACK_MODEL,
                        messages=[
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        max_tokens=150,
                        temperature=0.7
                    )
                else:
                    raise
            
            # Parse response
            if response and response.choices and len(response.choices) > 0:
                return response.choices[0].message.content.strip()
            else:
                return "Couldn't get feedback. Try again later."
        
        except Exception as e:
            print(f"AI Coach error: {e}")
            return "Couldn't get feedback. Try again later."
    
    def _create_summary_prompt(self, set_summary, rep_summaries_text=None):
        """Create a prompt for the AI with set statistics."""
        total_reps = set_summary['total_reps']
        
        # Use provided rep summaries or generate from rep_details
        if rep_summaries_text:
            summaries = rep_summaries_text
        else:
            # Generate from rep_details if available
            summaries = []
            if 'rep_details' in set_summary:
                for i, rep in enumerate(set_summary['rep_details'], 1):
                    if 'summary' in rep:
                        summaries.append(f"- {rep['summary']}")
                    else:
                        # Fallback: generate basic summary
                        depth = rep['min_knee_angle']
                        issues = rep.get('form_issues', [])
                        if not issues:
                            summaries.append(f"- Rep {i}: Good rep")
                        else:
                            parts = []
                            if depth > 90:
                                parts.append("Depth shallow")
                            else:
                                parts.append("Depth good")
                            if 'knee_valgus' in issues:
                                parts.append("knees caved in")
                            if 'forward_lean' in issues:
                                parts.append("chest leaned forward")
                            summaries.append(f"- Rep {i}: {', '.join(parts)}")
            summaries = "\n".join(summaries) if summaries else ""
        
        # Use exact prompt format from requirements
        prompt = f"""Here is the summary of {total_reps} squat reps:

{summaries}

Please give a short, 2–3 sentence feedback summary like a human strength coach. Be supportive but point out errors."""
        
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
