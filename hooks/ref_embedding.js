/// <reference path="../types.d.ts" />

// PocketBase hook for item creation - integrates with new matchmaking pipeline
onRecordAfterCreateRequest((e) => {
  const record = e.record;
  
  // Only process items collection
  if (e.collection.name !== "items") {
    return;
  }

  const itemId = record.id;
  const userId = record.get("creator");
  const refId = record.get("ref");
  const caption = record.get("text") || "";
  
  if (!userId || !refId) {
    console.log(`Skipping matchmaking processing for item ${itemId} - missing user or ref`);
    return;
  }

  // Get ref details
  const ref = $app.dao().findFirstRecordByFilter("refs", `id = "${refId}"`);
  if (!ref) {
    console.log(`Ref ${refId} not found for item ${itemId}`);
    return;
  }

  const title = ref.get("title") || "";
  const author = ref.get("meta") ? JSON.parse(ref.get("meta")).author || "" : "";
  const fullTitle = author ? `${title} by ${author}` : title;

  console.log(`Processing item ${itemId}: "${fullTitle}" with caption: "${caption}"`);

  // Call our matchmaking API to process this item
  const matchmakingUrl = $os.getenv("MATCHMAKING_API_URL") || "http://localhost:3001";
  
  const matchmakingResponse = $http.send({
    url: `${matchmakingUrl}/api/process-item`,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pocketbase_item_id: itemId,
      pocketbase_ref_id: refId,
      user_id: userId,
      title: fullTitle,
      caption: caption
    })
  });

  if (matchmakingResponse.statusCode === 200) {
    console.log(`Successfully processed item ${itemId} for matchmaking`);
  } else {
    console.log(`Matchmaking API error: ${matchmakingResponse.statusCode} - ${matchmakingResponse.raw}`);
  }
}, "items");

// Hook for when user updates an item (caption changes)
onRecordAfterUpdateRequest((e) => {
  const record = e.record;
  
  // Only process items collection
  if (e.collection.name !== "items") {
    return;
  }

  const itemId = record.id;
  const userId = record.get("creator");
  const refId = record.get("ref");
  const caption = record.get("text") || "";
  
  if (!userId || !refId) {
    return;
  }

  // Get ref details
  const ref = $app.dao().findFirstRecordByFilter("refs", `id = "${refId}"`);
  if (!ref) {
    return;
  }

  const title = ref.get("title") || "";
  const author = ref.get("meta") ? JSON.parse(ref.get("meta")).author || "" : "";
  const fullTitle = author ? `${title} by ${author}` : title;

  console.log(`Updating item ${itemId} for matchmaking`);

  // Call our matchmaking API to update this item
  const matchmakingUrl = $os.getenv("MATCHMAKING_API_URL") || "http://localhost:3001";
  
  const matchmakingResponse = $http.send({
    url: `${matchmakingUrl}/api/process-item`,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pocketbase_item_id: itemId,
      pocketbase_ref_id: refId,
      user_id: userId,
      title: fullTitle,
      caption: caption
    })
  });

  if (matchmakingResponse.statusCode === 200) {
    console.log(`Successfully updated item ${itemId} for matchmaking`);
  } else {
    console.log(`Matchmaking API error: ${matchmakingResponse.statusCode} - ${matchmakingResponse.raw}`);
  }
}, "items");

// Hook for when user deletes an item
onRecordAfterDeleteRequest((e) => {
  const record = e.record;
  
  // Only process items collection
  if (e.collection.name !== "items") {
    return;
  }

  const itemId = record.id;
  const userId = record.get("creator");

  if (!userId) {
    return;
  }

  console.log(`Deleting item ${itemId} from matchmaking`);

  // Call our matchmaking API to delete this item
  const matchmakingUrl = $os.getenv("MATCHMAKING_API_URL") || "http://localhost:3001";
  
  const matchmakingResponse = $http.send({
    url: `${matchmakingUrl}/api/delete-item`,
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pocketbase_item_id: itemId,
      user_id: userId
    })
  });

  if (matchmakingResponse.statusCode === 200) {
    console.log(`Successfully deleted item ${itemId} from matchmaking`);
  } else {
    console.log(`Matchmaking API error: ${matchmakingResponse.statusCode} - ${matchmakingResponse.raw}`);
  }
}, "items"); 