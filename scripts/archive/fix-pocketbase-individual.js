const http = require('http');

// Update a single item
async function updateItem(itemId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      deleted: null
    });
    
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8090,
      path: `/api/collections/items/records/${itemId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Failed to update item ${itemId}: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Update a single ref
async function updateRef(refId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      deleted: null
    });
    
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8090,
      path: `/api/collections/refs/records/${refId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Failed to update ref ${refId}: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Get all items and update them
async function fixItems() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:8090/api/collections/items/records?perPage=1000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const response = JSON.parse(data);
          const items = response.items;
          console.log(`📋 Found ${items.length} items total`);
          
          const itemsWithDeleted = items.filter(item => item.deleted !== null);
          console.log(`📋 Found ${itemsWithDeleted.length} items with deleted field`);
          
          if (itemsWithDeleted.length === 0) {
            console.log('✅ No items to fix!');
            resolve();
            return;
          }
          
          console.log('🔄 Updating items one by one...');
          let successCount = 0;
          let errorCount = 0;
          
          for (const item of itemsWithDeleted) {
            try {
              await updateItem(item.id);
              successCount++;
              if (successCount % 50 === 0) {
                console.log(`   Progress: ${successCount}/${itemsWithDeleted.length} items updated`);
              }
            } catch (error) {
              errorCount++;
              console.error(`   Error updating item ${item.id}:`, error.message);
            }
          }
          
          console.log(`✅ Items update complete: ${successCount} successful, ${errorCount} failed`);
          resolve();
          
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
  });
}

// Get all refs and update them
async function fixRefs() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:8090/api/collections/refs/records?perPage=1000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const response = JSON.parse(data);
          const refs = response.items;
          console.log(`📋 Found ${refs.length} refs total`);
          
          const refsWithDeleted = refs.filter(ref => ref.deleted !== null);
          console.log(`📋 Found ${refsWithDeleted.length} refs with deleted field`);
          
          if (refsWithDeleted.length === 0) {
            console.log('✅ No refs to fix!');
            resolve();
            return;
          }
          
          console.log('🔄 Updating refs one by one...');
          let successCount = 0;
          let errorCount = 0;
          
          for (const ref of refsWithDeleted) {
            try {
              await updateRef(ref.id);
              successCount++;
              if (successCount % 50 === 0) {
                console.log(`   Progress: ${successCount}/${refsWithDeleted.length} refs updated`);
              }
            } catch (error) {
              errorCount++;
              console.error(`   Error updating ref ${ref.id}:`, error.message);
            }
          }
          
          console.log(`✅ Refs update complete: ${successCount} successful, ${errorCount} failed`);
          resolve();
          
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
  });
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting PocketBase deleted field fix (individual updates)...');
    
    await fixItems();
    await fixRefs();
    
    console.log('✅ All done! PocketBase deleted field fix completed.');
    
    // Verify the fix
    console.log('\n📊 Verification:');
    const verifyReq = http.get('http://127.0.0.1:8090/api/collections/items/records?perPage=1000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        const activeItems = response.items.filter(item => item.deleted === null);
        console.log(`📋 Active items: ${activeItems.length}/${response.items.length}`);
        
        // Show some sample active items
        console.log('\n📋 Sample active items:');
        activeItems.slice(0, 5).forEach(item => {
          console.log(`   - ${item.text || '(no caption)'} (ID: ${item.id})`);
        });
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main(); 