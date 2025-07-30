const http = require('http');

// Clear deleted field for all items
async function clearItemsDeletedField() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:8090/api/collections/items/records?perPage=1000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
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
          
          console.log('🔄 Clearing deleted field for all items...');
          
          // Clear deleted field for all items
          const updateData = {
            items: itemsWithDeleted.map(item => ({
              id: item.id,
              deleted: null
            }))
          };
          
          const updateReq = http.request({
            hostname: '127.0.0.1',
            port: 8090,
            path: '/api/collections/items/records',
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            }
          }, (updateRes) => {
            let updateData = '';
            updateRes.on('data', chunk => updateData += chunk);
            updateRes.on('end', () => {
              if (updateRes.statusCode === 200) {
                console.log('✅ Successfully cleared deleted field for all items');
                resolve();
              } else {
                console.error('❌ Failed to update items:', updateRes.statusCode, updateData);
                reject(new Error(`Failed to update items: ${updateRes.statusCode}`));
              }
            });
          });
          
          updateReq.on('error', reject);
          updateReq.write(JSON.stringify(updateData));
          updateReq.end();
          
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
  });
}

// Clear deleted field for all refs
async function clearRefsDeletedField() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:8090/api/collections/refs/records?perPage=1000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
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
          
          console.log('🔄 Clearing deleted field for all refs...');
          
          // Clear deleted field for all refs
          const updateData = {
            items: refsWithDeleted.map(ref => ({
              id: ref.id,
              deleted: null
            }))
          };
          
          const updateReq = http.request({
            hostname: '127.0.0.1',
            port: 8090,
            path: '/api/collections/refs/records',
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            }
          }, (updateRes) => {
            let updateData = '';
            updateRes.on('data', chunk => updateData += chunk);
            updateRes.on('end', () => {
              if (updateRes.statusCode === 200) {
                console.log('✅ Successfully cleared deleted field for all refs');
                resolve();
              } else {
                console.error('❌ Failed to update refs:', updateRes.statusCode, updateData);
                reject(new Error(`Failed to update refs: ${updateRes.statusCode}`));
              }
            });
          });
          
          updateReq.on('error', reject);
          updateReq.write(JSON.stringify(updateData));
          updateReq.end();
          
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
    console.log('🚀 Starting PocketBase deleted field fix...');
    
    await clearItemsDeletedField();
    await clearRefsDeletedField();
    
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
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main(); 