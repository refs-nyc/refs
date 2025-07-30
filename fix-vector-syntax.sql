-- Fix the vector syntax in the generate_embedding function
CREATE OR REPLACE FUNCTION generate_embedding(text_content TEXT)
RETURNS vector(1536)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response JSONB;
  embedding_vector vector(1536);
  api_key TEXT;
  zero_array float8[];
BEGIN
  -- Get the OpenAI API key
  api_key := current_setting('app.openai_api_key', true);
  
  -- Create a proper zero array for fallback
  zero_array := array_fill(0::float8, ARRAY[1536]);
  
  -- Check if API key is set
  IF api_key IS NULL OR api_key = '' THEN
    RAISE NOTICE 'OpenAI API key not set, returning zero vector';
    -- Return a zero vector if no API key
    RETURN zero_array::vector(1536);
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
    RETURN zero_array::vector(1536);
  END IF;

  -- Extract the embedding from OpenAI response
  embedding_vector := (response->'data'->0->>'embedding')::vector(1536);

  RETURN embedding_vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error generating embedding: %, returning zero vector', SQLERRM;
    -- Return a zero vector if embedding generation fails
    RETURN zero_array::vector(1536);
  END;
$$; 