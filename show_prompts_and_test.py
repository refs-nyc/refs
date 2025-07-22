#!/usr/bin/env python3
"""
Demo script showing current prompts and title format
"""

def show_current_prompts():
    print("🎯 CURRENT REFS PEOPLE FINDER PROMPTS")
    print("="*50)
    
    print("\n📝 1. PERSONALITY GENERATION PROMPT (WITH CAPTION)")
    print("-" * 40)
    prompt_with_caption = """A user added "{ref_title}" with the personal note: "{user_caption}"

Write ONE personality-revealing sentence about this person based on their relationship to this interest and their personal perspective. Focus on:
- What this choice and their personal note reveal about their character/vibe  
- Their likely approach to life or mindset
- Traits that would matter for compatibility"""
    print(prompt_with_caption)
    
    print("\n📝 2. PERSONALITY GENERATION PROMPT (WITHOUT CAPTION)")
    print("-" * 40)
    prompt_without_caption = """A user added "{ref_title}" to their personal interests.

Write ONE personality-revealing sentence about this person based on their relationship to this interest. Focus on:
- What this choice reveals about their character/vibe
- Their likely approach to life or mindset  
- Traits that would matter for compatibility"""
    print(prompt_without_caption)
    
    print("\n📝 3. LLM RANKING PROMPT")
    print("-" * 40)
    ranking_prompt = """You are helping someone find compatible people based on personality insights and shared interests.

SEARCHER'S PERSONALITY: {search_personality}

CANDIDATES: {candidates_info}

Your task:
1. Rank these candidates by compatibility with the searcher
2. Focus on personality alignment, shared values, and complementary traits
3. Consider how their interests and personalities would mesh

Return a JSON array of user_ids in order of best to worst compatibility. Only include the user_id strings.

Example: ["user123", "user456", "user789"]"""
    print(ranking_prompt)
    
    print("\n🎨 4. TITLE FORMAT")
    print("-" * 40)
    print('Title: "People at the ⊕"')
    print('Subtitle: "ref1, ref2, ref3"')
    
    print("\n🔄 5. VENN DIAGRAM SVG")
    print("-" * 40)
    venn_svg = '''<svg width="71" height="47" viewBox="0 0 71 47" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="23.5" cy="23.5" r="23" stroke="black" stroke-dasharray="2 2"/>
<circle cx="47.5" cy="23.5" r="23" stroke="black" stroke-dasharray="2 2"/>
</svg>'''
    print(venn_svg)

def test_title_format():
    print("\n🧪 TESTING TITLE FORMAT")
    print("="*50)
    
    # Simulate different ref combinations
    test_cases = [
        ["Chess", "Jazz", "Philosophy"], 
        ["Art", "Wine", "Books"],
        ["Running", "Meditation", "Vinyl"],
        ["Poetry", "Mountain Climbing", "Vintage Cars"]
    ]
    
    for refs in test_cases:
        title = "People at the ⊕"
        subtitle = ", ".join(refs)
        print(f'Title: "{title}"')
        print(f'Subtitle: "{subtitle}"')
        print()

if __name__ == "__main__":
    show_current_prompts()
    test_title_format()
    
    print("\n✅ SUMMARY")
    print("="*50)
    print("• Syntax error has been fixed")
    print("• Title format: 'People at the ⊕' with comma-separated refs")
    print("• Venn diagram SVG provided")
    print("• All prompts documented above")
    print("• System uses sophisticated per-ref personality generation")
    print("• LLM ranking for compatibility matching") 