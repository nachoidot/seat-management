#!/usr/bin/env node

/**
 * Keep-Alive 시스템 테스트 스크립트
 * 
 * 사용법:
 * node scripts/test-keep-alive.js
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://port-0-seat-management-mcdii4ecc60f3aad.sel5.cloudtype.app';
const FRONTEND_URL = 'https://seat-management-el5wgnzgi-jaeho-chois-projects.vercel.app';

// HTTP 요청 헬퍼 함수
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const req = client.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Keep-Alive-Test/1.0',
        'Cache-Control': 'no-cache',
        ...options.headers
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// 백엔드 Health Check 테스트
async function testBackendHealth() {
  console.log('\n🏥 Testing Backend Health...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log('✅ Backend Health Check 성공!');
      console.log(`   - Message: ${data.message}`);
      console.log(`   - Uptime: ${data.uptime}`);
      console.log(`   - Environment: ${data.environment}`);
      return true;
    } else {
      console.log(`❌ Backend Health Check 실패: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Backend Health Check 오류: ${error.message}`);
    return false;
  }
}

// 주요 API 엔드포인트 테스트
async function testAPIEndpoints() {
  console.log('\n🔧 Testing API Endpoints...');
  
  const endpoints = [
    '/api/seats',
    '/api/timeslots',
    '/api/debug/stats'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`   Testing ${endpoint}...`);
      const response = await makeRequest(`${BACKEND_URL}${endpoint}`);
      
      const success = response.status === 200 || response.status === 401; // 401은 인증 필요한 경우
      results.push({
        endpoint,
        status: response.status,
        success
      });
      
      if (success) {
        console.log(`   ✅ ${endpoint} - ${response.status}`);
      } else {
        console.log(`   ❌ ${endpoint} - ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint} - Error: ${error.message}`);
      results.push({
        endpoint,
        status: 'error',
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// 프론트엔드 Cron Job 테스트
async function testVercelCronJob() {
  console.log('\n⏰ Testing Vercel Cron Job...');
  
  try {
    const response = await makeRequest(`${FRONTEND_URL}/api/cron/keep-alive`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer keep-alive-secret',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log('✅ Vercel Cron Job 성공!');
      console.log(`   - Message: ${data.message}`);
      console.log(`   - Timestamp: ${data.timestamp}`);
      return true;
    } else {
      console.log(`❌ Vercel Cron Job 실패: ${response.status}`);
      console.log(`   Response: ${response.data}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Vercel Cron Job 오류: ${error.message}`);
    return false;
  }
}

// 연속 테스트 (서버 깨우기 시뮬레이션)
async function testContinuousWakeup(rounds = 3) {
  console.log(`\n🔄 Testing Continuous Wake-up (${rounds} rounds)...`);
  
  for (let i = 1; i <= rounds; i++) {
    console.log(`\n   Round ${i}/${rounds}:`);
    
    const startTime = Date.now();
    const healthOk = await testBackendHealth();
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    console.log(`   ⏱️ Response time: ${responseTime}ms`);
    
    if (healthOk) {
      console.log(`   ✅ Round ${i} 성공!`);
    } else {
      console.log(`   ❌ Round ${i} 실패!`);
    }
    
    // 다음 라운드 전에 잠시 대기
    if (i < rounds) {
      console.log('   ⏸️ 5초 대기...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// 메인 테스트 함수
async function runTests() {
  console.log('🤖 Keep-Alive 시스템 테스트 시작...');
  console.log('='.repeat(50));
  
  // 1. 백엔드 Health Check
  const healthOk = await testBackendHealth();
  
  // 2. API 엔드포인트 테스트
  const apiResults = await testAPIEndpoints();
  
  // 3. Vercel Cron Job 테스트
  const cronOk = await testVercelCronJob();
  
  // 4. 연속 테스트
  await testContinuousWakeup(3);
  
  // 결과 요약
  console.log('\n📊 테스트 결과 요약:');
  console.log('='.repeat(50));
  console.log(`🏥 Backend Health: ${healthOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`⏰ Vercel Cron Job: ${cronOk ? '✅ PASS' : '❌ FAIL'}`);
  
  const apiSuccess = apiResults.filter(r => r.success).length;
  const apiTotal = apiResults.length;
  console.log(`🔧 API Endpoints: ${apiSuccess}/${apiTotal} PASS`);
  
  if (healthOk && cronOk && apiSuccess === apiTotal) {
    console.log('\n🎉 모든 테스트 통과! Keep-Alive 시스템이 정상 작동합니다.');
  } else {
    console.log('\n⚠️ 일부 테스트 실패. 설정을 확인해주세요.');
  }
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testBackendHealth,
  testAPIEndpoints,
  testVercelCronJob,
  testContinuousWakeup
}; 