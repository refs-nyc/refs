-- Fix the generate_embedding function to handle missing API key
CREATE OR REPLACE FUNCTION generate_embedding(text_content TEXT)
RETURNS vector(1536)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response JSONB;
  embedding_vector vector(1536);
  api_key TEXT;
BEGIN
  -- Get the OpenAI API key
  api_key := current_setting('app.openai_api_key', true);
  
  -- Check if API key is set
  IF api_key IS NULL OR api_key = '' THEN
    RAISE NOTICE 'OpenAI API key not set, returning zero vector';
    -- Return a zero vector if no API key
    RETURN '[' || array_to_string(array_fill(0::float8, ARRAY[1536]), ',') || ']'::vector(1536);
  END IF;

  -- Call OpenAI API to generate embedding
  SELECT content INTO response
  FROM http((
    'POST',
    'https://api.openai.com/v1/embeddings',
    ARRAY[
      ('Authorization', 'Bearer ' || api_key),
      ('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'model', 'text-embedding-3-small',
      'input', text_content
    )::text
  ));

  -- Check if response is valid
  IF response IS NULL OR response->'data' IS NULL THEN
    RAISE NOTICE 'Invalid response from OpenAI API, returning zero vector';
    RETURN '[' || array_to_string(array_fill(0::float8, ARRAY[1536]), ',') || ']'::vector(1536);
  END IF;

  -- Extract the embedding from OpenAI response
  embedding_vector := (response->'data'->0->>'embedding')::vector(1536);

  RETURN embedding_vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error generating embedding: %, returning zero vector', SQLERRM;
    -- Return a zero vector if embedding generation fails
    RETURN '[' || array_to_string(array_fill(0::float8, ARRAY[1536]), ',') || ']'::vector(1536);
END;
$$;

-- Fix the generate_seven_string function to handle missing API key
CREATE OR REPLACE FUNCTION generate_seven_string(ref_title TEXT, caption TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response JSONB;
  seven_string TEXT;
  api_key TEXT;
BEGIN
  -- Get the OpenAI API key
  api_key := current_setting('app.openai_api_key', true);
  
  -- Check if API key is set
  IF api_key IS NULL OR api_key = '' THEN
    RAISE NOTICE 'OpenAI API key not set, returning fallback string';
    -- Fallback: return a simple concatenation if OpenAI fails
    RETURN COALESCE(ref_title, '') || ' | ' || COALESCE(caption, '');
  END IF;

  -- Call OpenAI API to generate 7-string
  SELECT content INTO response
  FROM http((
    'POST',
    'https://api.openai.com/v1/chat/completions',
    ARRAY[
      ('Authorization', 'Bearer ' || api_key),
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

  -- Check if response is valid
  IF response IS NULL OR response->'choices' IS NULL THEN
    RAISE NOTICE 'Invalid response from OpenAI API, returning fallback string';
    RETURN COALESCE(ref_title, '') || ' | ' || COALESCE(caption, '');
  END IF;

  -- Extract the generated text from OpenAI response
  seven_string := response->'choices'->0->'message'->>'content';

  -- Clean up the response (remove quotes, extra whitespace)
  seven_string := trim(both '"' from seven_string);
  seven_string := trim(both ' ' from seven_string);

  RETURN seven_string;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error generating 7-string: %, returning fallback string', SQLERRM;
    -- Fallback: return a simple concatenation if OpenAI fails
    RETURN COALESCE(ref_title, '') || ' | ' || COALESCE(caption, '');
  END;
$$; 