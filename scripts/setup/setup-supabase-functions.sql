-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS http;

-- Set OpenAI API key (you'll need to set this in Supabase dashboard)
-- ALTER DATABASE postgres SET "app.openai_api_key" = 'your-openai-api-key';

-- Function to generate 7-string using OpenAI
CREATE OR REPLACE FUNCTION generate_seven_string(ref_title TEXT, caption TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response JSONB;
  seven_string TEXT;
BEGIN
  -- Call OpenAI API to generate 7-string
  SELECT content INTO response
  FROM http((
    'POST',
    'https://api.openai.com/v1/chat/completions',
    ARRAY[
      ('Authorization', 'Bearer ' || current_setting('app.openai_api_key')),
      ('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'model', 'gpt-4o',
      'messages', ARRAY[
        json_build_object(
          'role', 'system',
          'content', 'You are a matchmaking descriptor engine. Generate one seven‑slot line, pipes between slots, ≤ 5 words per slot. 1. Intellectual signal – domain or thinking style (e.g., "Constraint‑fiction devotee") 2. Aesthetic vibe – sensory or stylistic flavour (e.g., "Desaturated desert minimalism") 3. Likely skill or habit – action they probably practise (e.g., "Sketches street portraits") 4. Conversation‑starter keyword – quick hook (e.g., "Ask about Oulipo") 5. Core value – guiding principle (e.g., "Rules as creative fuel") 6. Social‑energy cue – preferred social setting (e.g., "Thrives in micro‑salons") 7. Ideal‑match trait – quality a partner should have (e.g., "Loves playful debate") Return the line only. No extra commentary.'
        ),
        json_build_object(
          'role', 'user',
          'content', 'Ref title: «' || ref_title || '» Caption: «' || COALESCE(caption, '') || '»'
        )
      ],
      'temperature', 0.7,
      'max_tokens', 100
    )::text
  ));

  -- Extract the generated text from OpenAI response
  seven_string := response->'choices'->0->'message'->>'content';

  -- Clean up the response (remove quotes, extra whitespace)
  seven_string := trim(both '"' from seven_string);
  seven_string := trim(both ' ' from seven_string);

  RETURN seven_string;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: return a simple concatenation if OpenAI fails
    RETURN COALESCE(ref_title, '') || ' | ' || COALESCE(caption, '');
END;
$$;

-- Function to generate embedding using OpenAI
CREATE OR REPLACE FUNCTION generate_embedding(text_content TEXT)
RETURNS vector(1536)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response JSONB;
  embedding_vector vector(1536);
BEGIN
  -- Call OpenAI API to generate embedding
  SELECT content INTO response
  FROM http((
    'POST',
    'https://api.openai.com/v1/embeddings',
    ARRAY[
      ('Authorization', 'Bearer ' || current_setting('app.openai_api_key')),
      ('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'model', 'text-embedding-3-small',
      'input', text_content
    )::text
  ));

  -- Extract the embedding from OpenAI response
  embedding_vector := (response->'data'->0->>'embedding')::vector(1536);

  RETURN embedding_vector;
EXCEPTION
  WHEN OTHERS THEN
    -- Return a zero vector if embedding generation fails
    RETURN '[' || array_to_string(array_fill(0::float8, ARRAY[1536]), ',') || ']'::vector(1536);
END;
$$;

-- Function to process new item (generate 7-string and embedding)
CREATE OR REPLACE FUNCTION process_new_item(item_id TEXT, ref_id TEXT, item_text TEXT, ref_title TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seven_string TEXT;
  embedding_vector vector(1536);
BEGIN
  -- Generate 7-string
  seven_string := generate_seven_string(ref_title, item_text);

  -- Generate embedding for the 7-string
  embedding_vector := generate_embedding(seven_string);

  -- Insert or update the item
  INSERT INTO items (id, ref_id, text, seven_string, seven_string_embedding)
  VALUES (item_id, ref_id, item_text, seven_string, embedding_vector)
  ON CONFLICT (id) DO UPDATE SET
    ref_id = EXCLUDED.ref_id,
    text = EXCLUDED.text,
    seven_string = EXCLUDED.seven_string,
    seven_string_embedding = EXCLUDED.seven_string_embedding,
    updated_at = NOW();
END;
$$;

-- Function to regenerate spirit vector for a user
CREATE OR REPLACE FUNCTION regenerate_spirit_vector(user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seven_strings TEXT[];
  combined_string TEXT;
  spirit_embedding vector(1536);
BEGIN
  -- Get all 7-strings from user's top 12 grid items
  SELECT array_agg(i.seven_string ORDER BY i.created_at DESC) INTO seven_strings
  FROM items i
  WHERE i.creator = user_id
  LIMIT 12;

  -- Combine all 7-strings
  combined_string := array_to_string(seven_strings, ' | ');

  -- Generate embedding for the combined spirit vector
  spirit_embedding := generate_embedding(combined_string);

  -- Update user's spirit vector
  UPDATE users
  SET spirit_vector = combined_string,
      spirit_vector_embedding = spirit_embedding,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$;
