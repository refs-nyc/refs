/// <reference path="../types.d.ts" />

// PocketBase hook for ref creation - generates embeddings
onRecordAfterCreateRequest((e) => {
  const record = e.record;
  
  // Only process refs collection
  if (e.collection.name !== "refs") {
    return;
  }

  // Extract ref data
  const refId = record.id;
  const title = record.get("title") || "";
  const author = record.get("meta") ? JSON.parse(record.get("meta")).author || "" : "";
  const caption = ""; // You might want to add this field later
  
  // Create embedding text
  const embeddingText = `${title} ${author} ${caption}`.trim();
  
  if (!embeddingText) {
    console.log(`Skipping embedding for ref ${refId} - no text content`);
    return;
  }

  console.log(`Processing ref ${refId}: "${embeddingText}"`);

  // Check if embedding already exists (for duplicate titles)
  const existingRef = $app.dao().findFirstRecordByFilter("refs", `title = "${title}"`);
  if (existingRef && existingRef.id !== refId) {
    console.log(`Found existing ref with same title, copying embedding`);
    // Copy existing embedding (you'd implement this logic)
    return;
  }

  // Generate embedding via OpenAI API
  const openaiKey = $os.getenv("OPENAI_API_KEY");
  if (!openaiKey) {
    console.log("OPENAI_API_KEY not found");
    return;
  }

  const embeddingResponse = $http.send({
    url: "https://api.openai.com/v1/embeddings",
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: embeddingText
    })
  });

  if (embeddingResponse.statusCode !== 200) {
    console.log(`OpenAI API error: ${embeddingResponse.statusCode}`);
    return;
  }

  const embeddingData = embeddingResponse.json;
  const vector = embeddingData.data[0].embedding;

  // Store in Supabase
  const supaUrl = $os.getenv("SUPA_URL");
  const supaKey = $os.getenv("SUPA_KEY");
  
  if (!supaUrl || !supaKey) {
    console.log("Supabase credentials not found");
    return;
  }

  // Insert vector into Supabase
  const supaResponse = $http.send({
    url: `${supaUrl}/rest/v1/ref_vectors`,
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supaKey}`,
      "Content-Type": "application/json",
      "apikey": supaKey
    },
    body: JSON.stringify({
      ref_id: refId,
      vector: vector
    })
  });

  if (supaResponse.statusCode === 201) {
    console.log(`Successfully stored embedding for ref ${refId}`);
  } else {
    console.log(`Supabase error: ${supaResponse.statusCode} - ${supaResponse.raw}`);
  }
}, "refs");

// Hook for when user adds a ref to their collection
onRecordAfterCreateRequest((e) => {
  const record = e.record;
  
  // Only process items collection that have a ref
  if (e.collection.name !== "items" || !record.get("ref")) {
    return;
  }

  const userId = record.get("creator");
  const refId = record.get("ref");

  console.log(`Adding user-ref association: ${userId} -> ${refId}`);

  // Store user-ref association in Supabase
  const supaUrl = $os.getenv("SUPA_URL");
  const supaKey = $os.getenv("SUPA_KEY");
  
  if (!supaUrl || !supaKey) {
    console.log("Supabase credentials not found");
    return;
  }

  const supaResponse = $http.send({
    url: `${supaUrl}/rest/v1/user_refs`,
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supaKey}`,
      "Content-Type": "application/json",
      "apikey": supaKey
    },
    body: JSON.stringify({
      user_id: userId,
      ref_id: refId
    })
  });

  if (supaResponse.statusCode === 201) {
    console.log(`Successfully stored user-ref association`);
  } else {
    console.log(`Supabase user-ref error: ${supaResponse.statusCode} - ${supaResponse.raw}`);
  }
}, "items"); 