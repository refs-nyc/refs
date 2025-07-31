-- Test the vector function
SELECT generate_embedding('test') as test_embedding;

-- Test creating a zero vector manually
SELECT array_fill(0::float8, ARRAY[1536])::vector(1536) as zero_vector; 