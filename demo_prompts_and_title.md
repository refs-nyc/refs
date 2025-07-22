# Current Refs People Finder Prompts & Title Format

## 🎯 Search Results Title Format

**Title**: "People at the ⊕"  
**Subtitle**: "ref1, ref2, ref3"

### Venn Diagram SVG
```svg
<svg width="71" height="47" viewBox="0 0 71 47" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="23.5" cy="23.5" r="23" stroke="black" stroke-dasharray="2 2"/>
<circle cx="47.5" cy="23.5" r="23" stroke="black" stroke-dasharray="2 2"/>
</svg>
```

---

## 🧠 Personality Generation Prompts

### 1. When User HAS a Caption/Note

**System Prompt:**
```
You generate concise, insightful personality observations based on someone's interests and personal context. Focus on character traits and compatibility factors.
```

**User Prompt:**
```
A user added "[ref_title]" with their note: "[user_caption]" to their personal interests.

Write ONE sentence about this person that connects their specific note to broader personality traits that would matter for compatibility. Be grounded in what they actually said, not general assumptions about the topic.

Guidelines:
- Start from their exact words and reasoning
- Focus on the underlying values or mindset their note reveals
- Avoid stereotypical assumptions about the interest itself
- Consider what kind of person would express it that specific way

Example approaches:
- If they mention "strategic depth" → someone who values intellectual complexity
- If they mention "emotional connection" → someone who prioritizes feeling and empathy
- If they mention "technical precision" → someone who appreciates craftsmanship and detail

Write about the personality traits their specific perspective reveals.
```

### 2. When User has NO Caption (but has existing personality data)

**User Prompt:**
```
A user added "[ref_title]" to their interests but didn't add a personal note.

Based on their existing personality traits and the associations someone with these traits would have with "[ref_title]", write ONE sentence about this person's relationship to this topic.

EXISTING PERSONALITY INSIGHTS:
• [previous personality sentence 1]
• [previous personality sentence 2]
• [etc... up to 10 most recent sentences]

Write a sentence about this person's relationship to "[ref_title]" based on:
1. The associations you can make about someone who likes this topic
2. Their established personality patterns from the insights above
3. How this new interest fits their overall character

Focus on personality traits that would matter for compatibility, not just the interest itself.
```

### 3. When User has NO Caption (and NO existing personality data)

**User Prompt:**
```
A user added "[ref_title]" to their personal interests.

Write ONE personality-revealing sentence about this person based on their relationship to this interest. Focus on:
- What this choice reveals about their character/personality
- Their likely approach to life or mindset
- Traits that would matter for compatibility

Examples:
- "Someone who appreciates both intellectual strategy and creative expression"
- "Has a contemplative nature and enjoys life's deeper rhythms"
- "Values tradition while seeking authentic experiences"

Write about their personality, not just the interest itself.
```

---

## 🔄 LLM Ranking Prompt

**System Prompt:**
```
You are an expert at personality-based matchmaking. Focus on deep compatibility over surface similarities.
```

**User Prompt:**
```
You are matching people based on personality compatibility and shared interests.

SEARCH PERSON: [generated search personality description]

CANDIDATES TO RANK:
1. [name]: [personality summary] (Shared refs: [count])
2. [name]: [personality summary] (Shared refs: [count])
3. [name]: [personality summary] (Shared refs: [count])
...

Rank these [N] people by compatibility with the search person. Consider:
1. Personality compatibility (most important)
2. Shared interests (secondary)  
3. Potential for meaningful connection

Return ONLY a comma-separated list of numbers (e.g., "3,1,5,2,4") ranking from most compatible to least compatible.
```

---

## 📊 Search Personality Generation

**Used to create the search personality that gets fed into the ranking prompt:**

**User Prompt:**
```
Someone is searching for people with similar interests in [ref1], [ref2], [ref3].

Write 1-2 sentences describing what kind of person would be interested in these things. Focus on personality traits, mindset, and character that would be revealed by these interests.
```

**System Prompt:**
```
You infer personality from interests to help with people matching.
```

---

## 💡 Key Features

- **Simple Title Format**: No AI generation, just "People at the ⊕" with comma-separated ref names
- **Context-Aware Personality**: Uses existing personality data when available
- **Grounded in User Input**: Prioritizes actual user captions over assumptions
- **Compatibility Focus**: All prompts emphasize traits that matter for relationships
- **Minimal, Clean**: The venn diagram is simple dashed circles 