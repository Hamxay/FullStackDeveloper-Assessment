# Cache Testing Script for PowerShell
# 
# This script demonstrates how to test if the cache is working properly.
# Run this after starting your server with: npm run dev
# 
# Usage: .\test-cache.ps1

$BASE_URL = "http://localhost:3000"

function Write-Step {
    param([int]$Step, [string]$Description)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "STEP $Step : $Description" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Make-Request {
    param([string]$Method, [string]$Endpoint, [object]$Body = $null)
    
    $url = "$BASE_URL$Endpoint"
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $bodyJson = $null
    if ($Body) {
        $bodyJson = $Body | ConvertTo-Json
    }
    
    $startTime = Get-Date
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers
        } else {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $bodyJson
        }
        $endTime = Get-Date
        $totalTime = ($endTime - $startTime).TotalMilliseconds
        
        return @{
            Status = 200
            Data = $response
            TotalTime = [math]::Round($totalTime, 2)
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        return @{
            Status = $statusCode
            Data = $errorResponse
            TotalTime = 0
        }
    }
}

function Wait-ForSeconds {
    param([int]$Seconds)
    Start-Sleep -Seconds $Seconds
}

Write-Host ""
Write-Host "🧪 CACHE TESTING SCENARIO" -ForegroundColor Green
Write-Host "Make sure your server is running on http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check initial cache status
Write-Step 1 "Check Initial Cache Status"
$initialStats = Make-Request -Method "GET" -Endpoint "/cache-status"
Write-Host "Initial Cache Stats:" -ForegroundColor Yellow
$initialStats.Data | ConvertTo-Json -Depth 10

# Step 2: First request (Cache Miss)
Write-Step 2 "First Request - Should be a CACHE MISS"
Write-Host "Requesting: GET /users/1" -ForegroundColor Yellow
$firstRequest = Make-Request -Method "GET" -Endpoint "/users/1"
Write-Host "Status: $($firstRequest.Status)" -ForegroundColor $(if ($firstRequest.Status -eq 200) { "Green" } else { "Red" })
Write-Host "Cached: $($firstRequest.Data._cached)" -ForegroundColor $(if ($firstRequest.Data._cached -eq $false) { "Green" } else { "Red" })
Write-Host "Response Time: $($firstRequest.Data._responseTime)ms" -ForegroundColor Yellow
Write-Host "Total Time: $($firstRequest.TotalTime)ms" -ForegroundColor Yellow
Write-Host "User Data:" -ForegroundColor Yellow
@{
    id = $firstRequest.Data.id
    name = $firstRequest.Data.name
    email = $firstRequest.Data.email
} | ConvertTo-Json

if ($firstRequest.Data._cached -eq $false -and $firstRequest.Data._responseTime -ge 200) {
    Write-Host "✅ PASS: First request correctly shows cache miss and database delay" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: First request should show _cached: false and response time ~200ms" -ForegroundColor Red
}

# Step 3: Second request immediately (Cache Hit)
Write-Step 3 "Second Request (Immediate) - Should be a CACHE HIT"
Write-Host "Requesting: GET /users/1 (immediately after first request)" -ForegroundColor Yellow
$secondRequest = Make-Request -Method "GET" -Endpoint "/users/1"
Write-Host "Status: $($secondRequest.Status)" -ForegroundColor $(if ($secondRequest.Status -eq 200) { "Green" } else { "Red" })
Write-Host "Cached: $($secondRequest.Data._cached)" -ForegroundColor $(if ($secondRequest.Data._cached -eq $true) { "Green" } else { "Red" })
Write-Host "Response Time: $($secondRequest.Data._responseTime)ms" -ForegroundColor Yellow
Write-Host "Total Time: $($secondRequest.TotalTime)ms" -ForegroundColor Yellow

if ($secondRequest.Data._cached -eq $true -and $secondRequest.Data._responseTime -lt 10) {
    Write-Host "✅ PASS: Second request correctly shows cache hit with fast response" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Second request should show _cached: true and response time < 10ms" -ForegroundColor Red
}

# Step 4: Multiple cache hits
Write-Step 4 "Multiple Cache Hits - Testing Performance"
Write-Host "Making 5 consecutive requests to /users/1..." -ForegroundColor Yellow
$cacheHits = @()
for ($i = 0; $i -lt 5; $i++) {
    $req = Make-Request -Method "GET" -Endpoint "/users/1"
    $cacheHits += $req.Data._responseTime
    $cachedStatus = if ($req.Data._cached) { "CACHED" } else { "NOT CACHED" }
    Write-Host "Request $($i + 1): $cachedStatus - $($req.Data._responseTime)ms" -ForegroundColor Yellow
}

$avgCacheTime = ($cacheHits | Measure-Object -Average).Average
Write-Host ""
Write-Host "Average response time for cached requests: $([math]::Round($avgCacheTime, 2))ms" -ForegroundColor Yellow

if ($avgCacheTime -lt 10) {
    Write-Host "✅ PASS: All requests served from cache with fast response times" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Cached requests should be much faster" -ForegroundColor Red
}

# Step 5: Check cache statistics
Write-Step 5 "Check Cache Statistics After Requests"
$statsAfter = Make-Request -Method "GET" -Endpoint "/cache-status"
Write-Host "Cache Stats:" -ForegroundColor Yellow
$statsAfter.Data | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "Expected values:" -ForegroundColor Yellow
Write-Host "  - Hits: Should be >= 6 (at least 6 cache hits from steps 3-4)"
Write-Host "  - Misses: Should be >= 1 (at least 1 miss from step 2)"
Write-Host "  - Size: Should be >= 1 (at least user:1 in cache)"

if ($statsAfter.Data.hits -ge 6 -and $statsAfter.Data.misses -ge 1 -and $statsAfter.Data.size -ge 1) {
    Write-Host "✅ PASS: Cache statistics look correct" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Cache statistics may not match expectations" -ForegroundColor Yellow
}

# Step 6: Test different user (Cache Miss)
Write-Step 6 "Request Different User - Should be a CACHE MISS"
Write-Host "Requesting: GET /users/2 (different user, not in cache)" -ForegroundColor Yellow
$differentUser = Make-Request -Method "GET" -Endpoint "/users/2"
Write-Host "Status: $($differentUser.Status)" -ForegroundColor $(if ($differentUser.Status -eq 200) { "Green" } else { "Red" })
Write-Host "Cached: $($differentUser.Data._cached)" -ForegroundColor $(if ($differentUser.Data._cached -eq $false) { "Green" } else { "Red" })
Write-Host "Response Time: $($differentUser.Data._responseTime)ms" -ForegroundColor Yellow

if ($differentUser.Data._cached -eq $false) {
    Write-Host "✅ PASS: Different user correctly shows cache miss" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Different user should show cache miss" -ForegroundColor Red
}

# Step 7: Request same different user (Cache Hit)
Write-Step 7 "Request Same Different User - Should be a CACHE HIT"
Write-Host "Requesting: GET /users/2 (immediately after previous request)" -ForegroundColor Yellow
$differentUserCached = Make-Request -Method "GET" -Endpoint "/users/2"
Write-Host "Status: $($differentUserCached.Status)" -ForegroundColor $(if ($differentUserCached.Status -eq 200) { "Green" } else { "Red" })
Write-Host "Cached: $($differentUserCached.Data._cached)" -ForegroundColor $(if ($differentUserCached.Data._cached -eq $true) { "Green" } else { "Red" })
Write-Host "Response Time: $($differentUserCached.Data._responseTime)ms" -ForegroundColor Yellow

if ($differentUserCached.Data._cached -eq $true) {
    Write-Host "✅ PASS: Second request for user 2 correctly shows cache hit" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Second request should show cache hit" -ForegroundColor Red
}

# Step 8: Check cache size
Write-Step 8 "Check Cache Size - Should Have Multiple Users"
$statsMultiple = Make-Request -Method "GET" -Endpoint "/cache-status"
Write-Host "Cache Stats:" -ForegroundColor Yellow
$statsMultiple.Data | ConvertTo-Json -Depth 10

if ($statsMultiple.Data.size -ge 2) {
    Write-Host "✅ PASS: Cache contains multiple users" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Cache size may be less than expected" -ForegroundColor Yellow
}

# Step 9: Clear cache
Write-Step 9 "Clear Cache"
Write-Host "Requesting: DELETE /cache" -ForegroundColor Yellow
$clearResult = Make-Request -Method "DELETE" -Endpoint "/cache"
Write-Host "Clear Result:" -ForegroundColor Yellow
$clearResult.Data | ConvertTo-Json -Depth 10

# Step 10: Verify cache is cleared
Write-Step 10 "Verify Cache is Cleared"
$statsCleared = Make-Request -Method "GET" -Endpoint "/cache-status"
Write-Host "Cache Stats After Clear:" -ForegroundColor Yellow
$statsCleared.Data | ConvertTo-Json -Depth 10

if ($statsCleared.Data.size -eq 0) {
    Write-Host "✅ PASS: Cache successfully cleared" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Cache should be empty after clear" -ForegroundColor Red
}

# Step 11: Request after clear (Cache Miss)
Write-Step 11 "Request After Cache Clear - Should be a CACHE MISS"
Write-Host "Requesting: GET /users/1 (after cache was cleared)" -ForegroundColor Yellow
$afterClear = Make-Request -Method "GET" -Endpoint "/users/1"
Write-Host "Status: $($afterClear.Status)" -ForegroundColor $(if ($afterClear.Status -eq 200) { "Green" } else { "Red" })
Write-Host "Cached: $($afterClear.Data._cached)" -ForegroundColor $(if ($afterClear.Data._cached -eq $false) { "Green" } else { "Red" })
Write-Host "Response Time: $($afterClear.Data._responseTime)ms" -ForegroundColor Yellow

if ($afterClear.Data._cached -eq $false) {
    Write-Host "✅ PASS: Request after cache clear correctly shows cache miss" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Request after clear should show cache miss" -ForegroundColor Red
}

# Final Summary
Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
$finalStats = Make-Request -Method "GET" -Endpoint "/cache-status"
Write-Host "Final Cache Statistics:" -ForegroundColor Yellow
$finalStats.Data | ConvertTo-Json -Depth 10
Write-Host ""
Write-Host "✅ Cache testing complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Key Indicators of Working Cache:" -ForegroundColor Yellow
Write-Host "  1. First request: _cached: false, response time ~200ms"
Write-Host "  2. Subsequent requests: _cached: true, response time < 10ms"
Write-Host "  3. Cache stats show increasing hits and misses"
Write-Host "  4. Cache size increases as more users are requested"
Write-Host "  5. After clearing, cache size becomes 0"


