"""
Verify GPT prompt format matches requirements.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from ai_coach import AICoach


def test_prompt_format():
    print("="*60)
    print("VERIFYING GPT PROMPT FORMAT")
    print("="*60)
    
    coach = AICoach()
    
    # Create example set summary
    set_summary = {
        'total_reps': 5,
        'avg_depth_angle': 85,
        'form_issues': {'knee_valgus': 2},
        'rep_details': []
    }
    
    # Example per-rep summaries from requirements
    rep_summaries = """- Rep 1: Depth good, knees stable
- Rep 2: Depth shallow, knees caved in
- Rep 3: Depth good, chest leaned forward
- Rep 4: Good rep
- Rep 5: Depth good, knees stable"""
    
    # Generate prompt
    prompt = coach._create_summary_prompt(set_summary, rep_summaries)
    
    print("\nGenerated Prompt:")
    print("-" * 60)
    print(prompt)
    print("-" * 60)
    
    # Verify required elements
    print("\nVerifying prompt format:")
    
    checks = [
        ("Starts with 'Here is the summary of X squat reps:'", 
         "Here is the summary of 5 squat reps:" in prompt),
        
        ("Contains per-rep summaries",
         "- Rep 1: Depth good, knees stable" in prompt),
        
        ("Contains instruction for 2-3 sentences",
         "2–3 sentence" in prompt or "2-3 sentence" in prompt),
        
        ("Mentions 'like a human strength coach'",
         "like a human strength coach" in prompt),
        
        ("Asks to be supportive",
         "supportive" in prompt),
        
        ("Asks to point out errors",
         "point out errors" in prompt)
    ]
    
    all_passed = True
    for check_name, check_result in checks:
        status = "✓" if check_result else "❌"
        print(f"   {status} {check_name}")
        if not check_result:
            all_passed = False
    
    if all_passed:
        print("\n" + "="*60)
        print("PROMPT FORMAT VERIFIED! ✓")
        print("="*60)
        print("\nThe prompt matches the requirements exactly:")
        print("✓ Uses 'Here is the summary of X squat reps:'")
        print("✓ Includes per-rep summaries in bullet format")
        print("✓ Asks for '2-3 sentence feedback summary'")
        print("✓ References 'human strength coach'")
        print("✓ Instructs to 'Be supportive but point out errors'")
    else:
        print("\n❌ PROMPT FORMAT DOES NOT MATCH REQUIREMENTS!")
        sys.exit(1)


if __name__ == '__main__':
    try:
        test_prompt_format()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
