/**
 * Cache Testing Script
 * 
 * This script demonstrates how to test if the cache is working properly.
 * Run this after starting your server with: npm run dev
 * 
 * Usage: node test-cache.js
 */

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const startTime = Date.now();
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    const totalTime = Date.now() - startTime;
    
    return {
      status: response.status,
      data,
      totalTime,
    };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

// Helper to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to format output
function logStep(step, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STEP ${step}: ${description}`);
  console.log('='.repeat(60));
}

async function testCache() {
  console.log('\n🧪 CACHE TESTING SCENARIO');
  console.log('Make sure your server is running on http://localhost:3000\n');
  
  // Step 1: Check initial cache status
  logStep(1, 'Check Initial Cache Status');
  const initialStats = await makeRequest('GET', '/cache-status');
  console.log('Initial Cache Stats:', JSON.stringify(initialStats.data, null, 2));
  
  // Step 2: First request (Cache Miss)
  logStep(2, 'First Request - Should be a CACHE MISS');
  console.log('Requesting: GET /users/1');
  const firstRequest = await makeRequest('GET', '/users/1');
  console.log(`Status: ${firstRequest.status}`);
  console.log(`Cached: ${firstRequest.data._cached}`);
  console.log(`Response Time: ${firstRequest.data._responseTime}ms`);
  console.log(`Total Time: ${firstRequest.totalTime}ms`);
  console.log('User Data:', JSON.stringify({
    id: firstRequest.data.id,
    name: firstRequest.data.name,
    email: firstRequest.data.email,
  }, null, 2));
  
  if (firstRequest.data._cached === false && firstRequest.data._responseTime >= 200) {
    console.log('✅ PASS: First request correctly shows cache miss and database delay');
  } else {
    console.log('❌ FAIL: First request should show _cached: false and response time ~200ms');
  }
  
  // Step 3: Second request immediately (Cache Hit)
  logStep(3, 'Second Request (Immediate) - Should be a CACHE HIT');
  console.log('Requesting: GET /users/1 (immediately after first request)');
  const secondRequest = await makeRequest('GET', '/users/1');
  console.log(`Status: ${secondRequest.status}`);
  console.log(`Cached: ${secondRequest.data._cached}`);
  console.log(`Response Time: ${secondRequest.data._responseTime}ms`);
  console.log(`Total Time: ${secondRequest.totalTime}ms`);
  
  if (secondRequest.data._cached === true && secondRequest.data._responseTime < 10) {
    console.log('✅ PASS: Second request correctly shows cache hit with fast response');
  } else {
    console.log('❌ FAIL: Second request should show _cached: true and response time < 10ms');
  }
  
  // Step 4: Multiple cache hits
  logStep(4, 'Multiple Cache Hits - Testing Performance');
  console.log('Making 5 consecutive requests to /users/1...');
  const cacheHits = [];
  for (let i = 0; i < 5; i++) {
    const req = await makeRequest('GET', '/users/1');
    cacheHits.push(req.data._responseTime);
    console.log(`Request ${i + 1}: ${req.data._cached ? 'CACHED' : 'NOT CACHED'} - ${req.data._responseTime}ms`);
  }
  
  const avgCacheTime = cacheHits.reduce((a, b) => a + b, 0) / cacheHits.length;
  console.log(`\nAverage response time for cached requests: ${avgCacheTime.toFixed(2)}ms`);
  
  if (avgCacheTime < 10) {
    console.log('✅ PASS: All requests served from cache with fast response times');
  } else {
    console.log('❌ FAIL: Cached requests should be much faster');
  }
  
  // Step 5: Check cache statistics
  logStep(5, 'Check Cache Statistics After Requests');
  const statsAfter = await makeRequest('GET', '/cache-status');
  console.log('Cache Stats:', JSON.stringify(statsAfter.data, null, 2));
  
  console.log('\nExpected values:');
  console.log(`  - Hits: Should be >= 6 (at least 6 cache hits from steps 3-4)`);
  console.log(`  - Misses: Should be >= 1 (at least 1 miss from step 2)`);
  console.log(`  - Size: Should be >= 1 (at least user:1 in cache)`);
  
  if (statsAfter.data.hits >= 6 && statsAfter.data.misses >= 1 && statsAfter.data.size >= 1) {
    console.log('✅ PASS: Cache statistics look correct');
  } else {
    console.log('⚠️  WARNING: Cache statistics may not match expectations');
  }
  
  // Step 6: Test different user (Cache Miss)
  logStep(6, 'Request Different User - Should be a CACHE MISS');
  console.log('Requesting: GET /users/2 (different user, not in cache)');
  const differentUser = await makeRequest('GET', '/users/2');
  console.log(`Status: ${differentUser.status}`);
  console.log(`Cached: ${differentUser.data._cached}`);
  console.log(`Response Time: ${differentUser.data._responseTime}ms`);
  
  if (differentUser.data._cached === false) {
    console.log('✅ PASS: Different user correctly shows cache miss');
  } else {
    console.log('❌ FAIL: Different user should show cache miss');
  }
  
  // Step 7: Request same different user (Cache Hit)
  logStep(7, 'Request Same Different User - Should be a CACHE HIT');
  console.log('Requesting: GET /users/2 (immediately after previous request)');
  const differentUserCached = await makeRequest('GET', '/users/2');
  console.log(`Status: ${differentUserCached.status}`);
  console.log(`Cached: ${differentUserCached.data._cached}`);
  console.log(`Response Time: ${differentUserCached.data._responseTime}ms`);
  
  if (differentUserCached.data._cached === true) {
    console.log('✅ PASS: Second request for user 2 correctly shows cache hit');
  } else {
    console.log('❌ FAIL: Second request should show cache hit');
  }
  
  // Step 8: Check cache size
  logStep(8, 'Check Cache Size - Should Have Multiple Users');
  const statsMultiple = await makeRequest('GET', '/cache-status');
  console.log('Cache Stats:', JSON.stringify(statsMultiple.data, null, 2));
  
  if (statsMultiple.data.size >= 2) {
    console.log('✅ PASS: Cache contains multiple users');
  } else {
    console.log('⚠️  WARNING: Cache size may be less than expected');
  }
  
  // Step 9: Clear cache
  logStep(9, 'Clear Cache');
  console.log('Requesting: DELETE /cache');
  const clearResult = await makeRequest('DELETE', '/cache');
  console.log('Clear Result:', JSON.stringify(clearResult.data, null, 2));
  
  // Step 10: Verify cache is cleared
  logStep(10, 'Verify Cache is Cleared');
  const statsCleared = await makeRequest('GET', '/cache-status');
  console.log('Cache Stats After Clear:', JSON.stringify(statsCleared.data, null, 2));
  
  if (statsCleared.data.size === 0) {
    console.log('✅ PASS: Cache successfully cleared');
  } else {
    console.log('❌ FAIL: Cache should be empty after clear');
  }
  
  // Step 11: Request after clear (Cache Miss)
  logStep(11, 'Request After Cache Clear - Should be a CACHE MISS');
  console.log('Requesting: GET /users/1 (after cache was cleared)');
  const afterClear = await makeRequest('GET', '/users/1');
  console.log(`Status: ${afterClear.status}`);
  console.log(`Cached: ${afterClear.data._cached}`);
  console.log(`Response Time: ${afterClear.data._responseTime}ms`);
  
  if (afterClear.data._cached === false) {
    console.log('✅ PASS: Request after cache clear correctly shows cache miss');
  } else {
    console.log('❌ FAIL: Request after clear should show cache miss');
  }
  
  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  const finalStats = await makeRequest('GET', '/cache-status');
  console.log('Final Cache Statistics:', JSON.stringify(finalStats.data, null, 2));
  console.log('\n✅ Cache testing complete!');
  console.log('\nKey Indicators of Working Cache:');
  console.log('  1. First request: _cached: false, response time ~200ms');
  console.log('  2. Subsequent requests: _cached: true, response time < 10ms');
  console.log('  3. Cache stats show increasing hits and misses');
  console.log('  4. Cache size increases as more users are requested');
  console.log('  5. After clearing, cache size becomes 0');
}

// Run the test
testCache().catch(console.error);


