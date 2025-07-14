#!/usr/bin/env python3
"""
Refs People Finder API - Production version with per-ref personality sentences
"""

import os
import logging
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
import openai
from openai import OpenAI
import uvicorn
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize clients
try:
    supabase_url = os.getenv('SUPA_URL')
    supabase_key = os.getenv('SUPA_KEY') 
    openai_api_key = os.getenv('OPENAI_API_KEY')
    
    if not all([supabase_url, supabase_key, openai_api_key]):
        raise ValueError("Missing required environment variables: OPENAI_API_KEY, SUPA_URL, SUPA_KEY")
    
    supabase: Client = create_client(supabase_url, supabase_key)
    openai_client = OpenAI(api_key=openai_api_key)
    
except Exception as e:
    logger.error(f"Failed to initialize clients: {e}")
    raise

app = FastAPI(title="Refs People Finder API")

# Request/Response Models
class SearchRequest(BaseModel):
    user_id: str
    ref_ids: List[str]  # Should contain 1-12 ref IDs
    page: int = 1  # Page number (1-indexed)
    page_size: int = 20  # Results per page

class PersonResult(BaseModel):
    user_id: str
    name: str
    username: str  # Add username for navigation
    avatar_url: str
    shared_refs: int
    score: float
    personality_insight: str

class SearchResponse(BaseModel):
    people: List[PersonResult]
    total_results: int
    page: int
    page_size: int
    has_more: bool
    title: str  # "People at the ⊕" 
    subtitle: str  # "ref1, ref2, ref3"

class RefData(BaseModel):
    id: str
    title: str
    type: str = ""

class VectorRequest(BaseModel):
    refs: List[RefData]

class UserPersonalityRequest(BaseModel):
    user_id: str
    limit_refs: int = 12  # Only use top N refs to keep costs manageable

class GenerateRefPersonalityRequest(BaseModel):
    user_id: str
    ref_id: str
    ref_title: str
    user_caption: str = ""  # User's personal caption for this ref

async def generate_ref_personality_sentence(user_id: str, ref_id: str, ref_title: str, user_caption: str = "") -> str:
    """Generate a personality sentence for a specific user-ref relationship"""
    try:
        if user_caption:
            # User provided a caption - use it directly
            context = f'"{ref_title}" with their note: "{user_caption}"'
            
            prompt = f"""A user added "{context}" to their personal interests.

Write ONE personality-revealing sentence about this person based on their relationship to this interest and their personal perspective. Focus on:
- What this choice and their personal note reveal about their character/vibe  
- Their likely approach to life or mindset
- Traits that would matter for compatibility"""
        else:
            # No caption provided - use existing personality context
            existing_personalities = await get_user_ref_personalities(user_id, [])  # Get all existing
            existing_sentences = list(existing_personalities.values())
            
            if existing_sentences:
                # Use existing personality insights to inform the new sentence
                personality_context = "\n".join([f"• {sentence}" for sentence in existing_sentences[-10:]])  # Last 10 sentences
                
                prompt = f'''A user added "{ref_title}" to their interests but didn't add a personal note.

Based on their existing personality traits and the associations someone with these traits would have with "{ref_title}", write ONE sentence about this person's relationship to this topic.

EXISTING PERSONALITY INSIGHTS:
{personality_context}

Write a sentence about this person's relationship to "{ref_title}" based on:
1. The associations you can make about someone who likes this topic
2. Their established personality patterns from the insights above
3. How this new interest fits their overall character

Focus on personality traits that would matter for compatibility, not just the interest itself.'''
            else:
                # First ref or no existing context - use basic approach
                prompt = f"""A user added "{ref_title}" to their personal interests.

Write ONE personality-revealing sentence about this person based on their relationship to this interest. Focus on:
- What this choice reveals about their character/vibe
- Their likely approach to life or mindset
- Traits that would matter for compatibility"""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "You generate concise, insightful personality observations based on someone's interests and personal context. Focus on character traits and compatibility factors."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=60,
            temperature=0.7
        )
        
        sentence = response.choices[0].message.content.strip()
        
        # Store in user_ref_personalities table
        try:
            supabase.table('user_ref_personalities').upsert({
                'user_id': user_id,
                'ref_id': ref_id,
                'personality_sentence': sentence,
                'updated_at': 'now()'
            }).execute()
        except Exception as db_error:
            logger.warning(f"Could not store ref personality in DB: {db_error}")
        
        return sentence
        
    except Exception as e:
        logger.error(f"Error generating ref personality for {user_id}/{ref_id}: {e}")
        return "Someone with interesting and thoughtful tastes"

async def get_user_refs_with_captions(user_id: str, limit: int = 12) -> List[dict]:
    """Get a user's top refs with titles and captions"""
    try:
        # Get user's refs from items table with captions, ordered by creation (most recent first)
        items_result = supabase.table('items').select(
            'ref_id, text'
        ).eq('creator', user_id).order('created_at', desc=True).limit(limit).execute()
        
        if not items_result.data:
            logger.warning(f"No refs found for user {user_id}")
            return []
        
        # Get ref details separately
        ref_ids = [item['ref_id'] for item in items_result.data]
        
        refs_result = supabase.table('refs').select(
            'id, title, meta'
        ).in_('id', ref_ids).execute()
        
        refs_data = []
        refs_dict = {ref['id']: ref for ref in refs_result.data}
        items_dict = {item['ref_id']: item for item in items_result.data}
        
        for item in items_result.data:
            ref_id = item['ref_id']
            ref_info = refs_dict.get(ref_id)
            if ref_info:
                refs_data.append({
                    'ref_id': ref_id,
                    'title': ref_info['title'],
                    'caption': item.get('text', '') or ''  # PocketBase 'text' field
                })
        
        logger.info(f"Final refs_data for user {user_id}: {refs_data}")
        return refs_data
        
    except Exception as e:
        logger.error(f"Error getting user refs: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []

async def get_user_ref_personalities(user_id: str, ref_ids: List[str] = None) -> Dict[str, str]:
    """Get cached personality sentences for specific user-ref combinations, or all if ref_ids is empty"""
    try:
        query = supabase.table('user_ref_personalities').select(
            'ref_id, personality_sentence'
        ).eq('user_id', user_id)  # Use 'user_id' as per the table structure
        
        if ref_ids:
            query = query.in_('ref_id', ref_ids)
        
        result = query.execute()
        
        return {row['ref_id']: row['personality_sentence'] for row in result.data}
    except Exception as e:
        logger.warning(f"Could not get cached ref personalities: {e}")
        return {}

async def generate_composite_personality(user_id: str, limit_refs: int = 12) -> str:
    """Generate composite personality from user's top ref personalities"""
    try:
        # Get user's top refs
        refs_data = await get_user_refs_with_captions(user_id, limit_refs)
        if not refs_data:
            return "This person's interests are still being discovered."
        
        ref_ids = [ref['ref_id'] for ref in refs_data]
        
        # Get existing personality sentences
        existing_personalities = await get_user_ref_personalities(user_id, ref_ids)
        
        # Generate missing personality sentences
        personality_sentences = []
        for ref in refs_data:
            ref_id = ref['ref_id']
            if ref_id in existing_personalities:
                personality_sentences.append(existing_personalities[ref_id])
            else:
                # Generate new sentence for this ref
                sentence = await generate_ref_personality_sentence(
                    user_id, ref_id, ref['title'], ref['caption']
                )
                personality_sentences.append(sentence)
        
        # Combine sentences into composite personality
        if len(personality_sentences) == 1:
            composite = personality_sentences[0]
        else:
            sentences_text = "\n".join([f"• {sentence}" for sentence in personality_sentences])
            
            prompt = f"""Based on these personality insights about someone, write 2-3 sentences describing their overall personality and character. Focus on their core traits, mindset, and what kind of person they are.

PERSONALITY INSIGHTS:
{sentences_text}

Synthesize these into a cohesive personality description that captures their essence and would be useful for compatibility matching."""

            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You synthesize personality insights into cohesive character descriptions."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                max_tokens=120,
                temperature=0.7
            )
            
            composite = response.choices[0].message.content.strip()
        
        logger.info(f"Generated composite personality for user {user_id}: {composite}")
        
        # Cache the composite personality
        try:
            supabase.table('user_personalities').upsert({
                'user_id': user_id,
                'personality_summary': composite,
                'ref_ids_used': ref_ids,
                'ref_count': len(ref_ids),
                'updated_at': 'now()'
            }).execute()
        except Exception as db_error:
            logger.warning(f"Could not cache composite personality: {db_error}")
        
        return composite
        
    except Exception as e:
        logger.error(f"Error generating composite personality for user {user_id}: {e}")
        return "This person has diverse and interesting tastes."

async def get_ref_personalities(ref_ids: List[str]) -> dict:
    """Get personality descriptions for specific refs (not used in new architecture)"""
    # This is kept for backward compatibility but not used in per-ref approach
    return {}

async def get_vector_candidates(user_id: str, ref_ids: List[str], limit: int = 90) -> List[dict]:
    """Get candidates using vector similarity search"""
    try:
        if not ref_ids:
            logger.info("No valid ref IDs provided for vector search, skipping")
            return []
        
        # Generate search vector from all provided refs
        ref_titles = []
        for ref_id in ref_ids:
            result = supabase.table('refs').select('title').eq('id', ref_id).execute()
            if result.data:
                ref_titles.append(result.data[0]['title'])
        
        if not ref_titles:
            logger.warning("No valid refs found for vector search")
            return []
        
        search_text = ' '.join(ref_titles)
        
        # Generate embedding
        embedding_response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=search_text
        )
        search_vector = embedding_response.data[0].embedding
        
        # For now, if we can't use the exact rank_people function (which expects 3 refs),
        # we'll get a broader set of users and rank them by personality
        # This ensures we ALWAYS return candidates regardless of vector similarity
        try:
            if len(ref_ids) >= 3:
                # Use the rank_people function with first 3 refs
                result = supabase.rpc('rank_people', {
                    'p_user': user_id,
                    'p_ref1': ref_ids[0],
                    'p_ref2': ref_ids[1], 
                    'p_ref3': ref_ids[2],
                    'p_vec': search_vector
                }).execute()
                
                candidates = []
                for row in result.data:
                    candidates.append({
                        'user_id': row['user_id'],
                        'name': row['name'] or row['username'] or 'Unknown',
                        'username': row['username'] or row['user_id'],  # Include username for navigation
                        'avatar_url': row['avatar_url'] or '',
                        'hard': row.get('exact_matches', 0),
                        'soft': row.get('vector_similarity', 0.1),
                        'score': row.get('exact_matches', 0) * 3 + row.get('vector_similarity', 0.1)
                    })
                    
                return candidates[:limit]
            else:
                # For <3 refs, fall back to getting all users and ranking by personality
                logger.info(f"Using personality-only ranking for {len(ref_ids)} refs")
                return []
                
        except Exception as vector_error:
            logger.warning(f"Vector search failed, will use personality-only ranking: {vector_error}")
            return []
        
    except Exception as e:
        logger.error(f"Error getting vector candidates: {e}")
        return []

async def get_random_candidates(user_id: str, exclude_user_ids: List[str], count: int = 10) -> List[dict]:
    """Get random candidates to diversify results"""
    try:
        # Build the filter
        exclude_list = [user_id] + exclude_user_ids
        
        result = supabase.table('users').select('*').not_.in_('user_id', exclude_list).execute()
        
        import random
        random_users = random.sample(result.data, min(count, len(result.data)))
        
        candidates = []
        for user in random_users:
            candidates.append({
                'user_id': user['user_id'],
                'name': user['name'] or user['username'] or 'Unknown',
                'username': user['username'] or user['user_id'],  # Include username for navigation
                'avatar_url': user['avatar_url'] or '',
                'hard': 0,
                'soft': 0.1,  # Small baseline score
                'score': 0.1
            })
            
        return candidates
        
    except Exception as e:
        logger.error(f"Error getting random candidates: {e}")
        return []

async def get_user_personality(user_id: str) -> str:
    """Get cached composite personality - optimized for speed, no LLM calls during search"""
    try:
        # Try to get cached personality
        try:
            result = supabase.table('user_personalities').select('personality_summary').eq('user_id', user_id).execute()
            
            if result.data:
                return result.data[0]['personality_summary']
        except Exception as table_error:
            logger.warning(f"user_personalities table not available: {table_error}")
        
        # Return default personality instead of generating new one (for speed)
        return "Someone with interesting and diverse tastes"
        
    except Exception as e:
        logger.error(f"Error getting personality for user {user_id}: {e}")
        return "Someone with interesting and diverse tastes"

async def save_search_to_history(user_id: str, ref_ids: List[str], ref_titles: List[str], title: str, subtitle: str, result_count: int, search_results: List[PersonResult] = None):
    """Save a search to the user's search history with full results"""
    try:
        logger.info(f"Attempting to save search to history for user {user_id}")
        
        # Check if this exact search already exists (within last hour to avoid duplicates)
        from datetime import datetime, timedelta
        one_hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
        
        # For now, skip duplicate check to ensure we save the search
        existing = supabase.table('search_history').select('id').eq('user_id', user_id).gte('created_at', one_hour_ago).execute()
        
        # Prepare search data with full results
        search_data = {
            'user_id': user_id,
            'ref_ids': ref_ids,  # Supabase handles list conversion
            'ref_titles': ref_titles,  # Supabase handles list conversion
            'search_title': title,
            'search_subtitle': subtitle,
            'result_count': result_count,
            'updated_at': datetime.now().isoformat()
        }
        
        logger.info(f"Preparing search data: {search_data}")
        
        # Add search_results if available
        if search_results:
            try:
                # Convert PersonResult objects to dictionaries
                results_data = []
                for person in search_results:
                    person_dict = {
                        'user_id': person.user_id,
                        'name': person.name,
                        'username': person.username,
                        'avatar_url': person.avatar_url,
                        'shared_refs': person.shared_refs,
                        'score': person.score,
                        'personality_insight': person.personality_insight
                    }
                    results_data.append(person_dict)
                
                search_data['search_results'] = results_data  # Supabase will handle JSON conversion
                logger.info(f"Prepared {len(results_data)} search results for storage")
            except Exception as json_error:
                logger.warning(f"Could not prepare search results JSON: {json_error}")
                search_data['search_results'] = None
        
        if existing.data:
            # Update existing record
            logger.info(f"Updating existing search history record {existing.data[0]['id']}")
            result = supabase.table('search_history').update(search_data).eq('id', existing.data[0]['id']).execute()
        else:
            # Create new record
            search_data['created_at'] = datetime.now().isoformat()
            logger.info(f"Creating new search history record")
            result = supabase.table('search_history').insert(search_data).execute()
            
        logger.info(f"Successfully saved search to history for user {user_id} with {len(search_results) if search_results else 0} results")
        return result.data
        
    except Exception as e:
        logger.error(f"Error saving search to history: {e}")
        logger.error(f"Search data: user_id={user_id}, ref_ids={ref_ids}, title={title}")
        # Don't raise the exception - just log it so search still works
        return None

async def get_search_history(user_id: str, limit: int = 20) -> List[dict]:
    """Get user's search history"""
    try:
        result = supabase.table('search_history').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(limit).execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Error getting search history for user {user_id}: {e}")
        return []

async def llm_rerank_candidates(search_personality: str, candidates: List[dict], ref_personalities: dict) -> List[dict]:
    """Use LLM to re-rank candidates based on personality insights"""
    try:
        if not candidates:
            return []
            
        # Get personality summaries for candidates
        candidate_descriptions = []
        for i, candidate in enumerate(candidates):
            candidate_personality = await get_user_personality(candidate['user_id'])
            candidate_descriptions.append(
                f"{i+1}. {candidate['name']}: {candidate_personality} (Shared refs: {candidate['hard']})"
            )
        
        candidates_text = "\n".join(candidate_descriptions)
        
        prompt = f"""You are matching people based on personality compatibility and shared interests.

SEARCH PERSON: {search_personality}

CANDIDATES TO RANK:
{candidates_text}

Rank these {len(candidates)} people by compatibility with the search person. Consider:
1. Personality compatibility (most important)
2. Shared interests (secondary)  
3. Potential for meaningful connection

Return ONLY a comma-separated list of numbers (e.g., "3,1,5,2,4") ranking from most compatible to least compatible."""
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert at personality-based matchmaking. Focus on deep compatibility over surface similarities."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100,
            temperature=0.3
        )
        
        # Parse the ranking
        ranking_str = response.choices[0].message.content.strip()
        ranking_indices = [int(x.strip()) - 1 for x in ranking_str.split(',') if x.strip().isdigit()]
        
        # Reorder candidates based on LLM ranking
        reranked_candidates = []
        for idx in ranking_indices:
            if 0 <= idx < len(candidates):
                reranked_candidates.append(candidates[idx])
        
        # Add any missing candidates at the end
        used_indices = set(ranking_indices)
        for i, candidate in enumerate(candidates):
            if i not in used_indices:
                reranked_candidates.append(candidate)
        
        logger.info(f"LLM reranked {len(candidates)} candidates using personality data")
        return reranked_candidates
        
    except Exception as e:
        logger.error(f"Error in LLM reranking: {e}")
        return candidates

@app.get("/")
async def root():
    return {"message": "Refs People Finder API with Per-Ref Personalities"}

@app.post("/search_people", response_model=SearchResponse)
async def search_people(request: SearchRequest):
    """Optimized endpoint for finding similar people - designed for 2-3 second response time"""
    try:
        user_id = request.user_id
        ref_ids = request.ref_ids
        page = max(1, request.page)
        page_size = min(50, max(1, request.page_size))
        
        logger.info(f"Searching for people similar to user {user_id} with refs {ref_ids}, page {page}")
        
        # Get ref titles for display (no LLM needed)
        ref_titles = []
        valid_ref_ids = []
        for ref_id in ref_ids:
            result = supabase.table('refs').select('title').eq('id', ref_id).execute()
            if result.data:
                ref_titles.append(result.data[0]['title'])
                valid_ref_ids.append(ref_id)
            else:
                logger.warning(f"Ref {ref_id} not found in refs table")
        
        if not ref_titles:
            raise HTTPException(status_code=400, detail="No valid refs found")
        
        # Get vector candidates (fast database query)
        vector_candidates = await get_vector_candidates(user_id, valid_ref_ids, limit=90)
        
        # Get additional candidates to ensure we have enough results
        used_user_ids = [c['user_id'] for c in vector_candidates]
        random_candidates = await get_random_candidates(user_id, used_user_ids, count=50)  # Reduced from 1000
        
        # Combine and sort by score (no LLM reranking)
        all_candidates = vector_candidates + random_candidates
        # Sort by score (vector similarity + exact matches)
        all_candidates.sort(key=lambda x: x['score'], reverse=True)
        
        total_found = len(all_candidates)
        logger.info(f"Got {len(vector_candidates)} vector + {len(random_candidates)} random = {total_found} total candidates")
        
        # Pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_candidates = all_candidates[start_idx:end_idx]
        
        # Format results with cached personalities (no LLM calls)
        people = []
        for candidate in page_candidates:
            # Get cached personality or use default
            personality = await get_user_personality(candidate['user_id'])
            
            people.append(PersonResult(
                user_id=candidate['user_id'],
                name=candidate['name'],
                username=candidate['username'],
                avatar_url=candidate['avatar_url'],
                shared_refs=candidate['hard'],
                score=candidate['score'],
                personality_insight=personality
            ))
        
        has_more = end_idx < total_found
        
        # Generate simple title and subtitle
        title = "People at the ⊕"
        subtitle = ", ".join(ref_titles)
        
        # Save search to history (only on first page to avoid duplicates)
        if page == 1:
            try:
                save_result = await save_search_to_history(user_id, valid_ref_ids, ref_titles, title, subtitle, total_found, people)
                if save_result:
                    logger.info(f"Search history saved successfully: {len(save_result)} records")
                else:
                    logger.warning("Search history save returned None - check logs for errors")
            except Exception as e:
                logger.warning(f"Failed to save search to history: {e}")
                # Continue with search even if history save fails
        
        return SearchResponse(
            people=people,
            total_results=total_found,
            page=page,
            page_size=page_size,
            has_more=has_more,
            title=title,
            subtitle=subtitle
        )
        
    except Exception as e:
        logger.error(f"Error in search_people: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-vectors")
async def generate_vectors(request: VectorRequest):
    """Generate and store vectors for refs"""
    try:
        results = {"generated": 0, "errors": []}
        
        logger.info(f"Generating vectors for {len(request.refs)} refs")
        
        for ref in request.refs:
            try:
                # Check if vector already exists
                existing = supabase.table('ref_vectors').select('ref_id').eq('ref_id', ref.id).execute()
                if existing.data:
                    continue  # Skip if vector already exists
                
                # Generate embedding
                embedding_response = openai_client.embeddings.create(
                    model="text-embedding-3-small",
                    input=f"{ref.title} {ref.type}".strip()
                )
                
                vector = embedding_response.data[0].embedding
                
                # Store vector
                supabase.table('ref_vectors').insert({
                    'ref_id': ref.id,
                    'vector': vector
                }).execute()
                
                results["generated"] += 1
                
            except Exception as e:
                error_msg = f"Error generating vector for ref {ref.id}: {e}"
                logger.error(error_msg)
                results["errors"].append(error_msg)
        
        logger.info(f"Successfully generated {results['generated']}/{len(request.refs)} vectors")
        return results
        
    except Exception as e:
        logger.error(f"Error in generate_vectors: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-ref-personality")
async def generate_ref_personality_endpoint(request: GenerateRefPersonalityRequest):
    """Generate personality sentence for a specific user-ref relationship"""
    try:
        sentence = await generate_ref_personality_sentence(
            request.user_id,
            request.ref_id, 
            request.ref_title,
            request.user_caption
        )
        
        return {"personality_sentence": sentence}
        
    except Exception as e:
        logger.error(f"Error in generate_ref_personality: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-user-personality") 
async def generate_user_personality_endpoint(request: UserPersonalityRequest):
    """Generate composite personality for a user from their ref personalities"""
    try:
        personality = await generate_composite_personality(request.user_id, request.limit_refs)
        return {"personality": personality}
        
    except Exception as e:
        logger.error(f"Error in generate_user_personality: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-title")
async def test_title():
    """Test endpoint to see if title/subtitle work"""
    return SearchResponse(
        people=[],
        total_results=0,
        page=1,
        page_size=10,
        has_more=False,
        title="Test Title",
        subtitle="Test Subtitle"
    )

@app.get("/search-history/{user_id}")
async def get_user_search_history(user_id: str, limit: int = 20):
    """Get user's search history"""
    try:
        history = await get_search_history(user_id, limit)
        return {"history": history}
    except Exception as e:
        logger.error(f"Error getting search history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/search-history/{user_id}/restore/{history_id}")
async def restore_search_from_history(user_id: str, history_id: int):
    """Restore a search from history with exact results"""
    try:
        # Get the specific search history record
        result = supabase.table('search_history').select('*').eq('id', history_id).eq('user_id', user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Search history not found")
        
        history_item = result.data[0]
        
        # Parse the stored search results
        if history_item.get('search_results'):
            try:
                # Supabase already returns the JSON as a Python object, no need to parse
                stored_results = history_item['search_results']
                # Convert back to PersonResult objects
                people = [PersonResult(**person_data) for person_data in stored_results]
            except Exception as e:
                logger.error(f"Failed to parse stored search results for history {history_id}: {e}")
                raise HTTPException(status_code=500, detail="Failed to restore search results")
        else:
            # Fallback: no stored results, return empty
            people = []
        
        return SearchResponse(
            people=people,
            total_results=history_item.get('result_count', 0),
            page=1,
            page_size=len(people),
            has_more=False,
            title=history_item.get('search_title', ''),
            subtitle=history_item.get('search_subtitle', '')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring search from history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Per-ref personality system operational"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 