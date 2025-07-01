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
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// 주요 API 엔드포인트 테스트
async function testAPIEndpoints() {
  const endpoints = [
    '/api/seats',
    '/api/timeslots',
    '/api/debug/stats'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${BACKEND_URL}${endpoint}`);
      
      const success = response.status === 200 || response.status === 401; // 401은 인증 필요한 경우
      results.push({
        endpoint,
        status: response.status,
        success
      });
    } catch (error) {
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

// 프론트엔드 접근성 테스트
async function testFrontendAccess() {
  try {
    const response = await makeRequest(FRONTEND_URL);
    
    if (response.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// 연속 테스트 (서버 깨우기 시뮬레이션)
async function testContinuousWakeup(rounds = 3) {
  for (let i = 1; i <= rounds; i++) {
    const startTime = Date.now();
    const healthOk = await testBackendHealth();
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    // 다음 라운드 전에 잠시 대기
    if (i < rounds) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// 메인 테스트 함수
async function runTests() {
  // 1. 백엔드 Health Check
  const healthOk = await testBackendHealth();
  
  // 2. API 엔드포인트 테스트
  const apiResults = await testAPIEndpoints();
  
  // 3. 프론트엔드 접근성 테스트
  const frontendOk = await testFrontendAccess();
  
  // 4. 연속 테스트
  await testContinuousWakeup(3);
  
  const apiSuccess = apiResults.filter(r => r.success).length;
  const apiTotal = apiResults.length;
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testBackendHealth,
  testAPIEndpoints,
  testFrontendAccess,
  testContinuousWakeup
}; 