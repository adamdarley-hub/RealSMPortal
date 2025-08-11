// Quick debug script to check job 20483264 data
const express = require('express');

async function debugJob() {
  try {
    console.log('🔍 Debugging job 20483264...');
    
    // Check cached version
    const cachedResponse = await fetch('http://localhost:8080/api/jobs/20483264');
    if (cachedResponse.ok) {
      const cachedJob = await cachedResponse.json();
      const cachedAttempts = cachedJob.attempts || [];
      console.log('💾 CACHED - Attempt count:', cachedAttempts.length);
      console.log('💾 CACHED - Last updated:', cachedJob.updated_at);
      if (cachedAttempts.length > 0) {
        console.log('💾 CACHED - Latest attempt:', cachedAttempts[cachedAttempts.length - 1]?.attempted_at);
      }
    }
    
    // Check direct from ServeManager
    const freshResponse = await fetch('http://localhost:8080/api/servemanager/jobs/20483264');
    if (freshResponse.ok) {
      const freshJob = await freshResponse.json();
      const freshAttempts = freshJob.attempts || [];
      console.log('🔥 FRESH - Attempt count:', freshAttempts.length);
      console.log('🔥 FRESH - Last updated:', freshJob.updated_at);
      if (freshAttempts.length > 0) {
        console.log('🔥 FRESH - Latest attempt:', freshAttempts[freshAttempts.length - 1]?.attempted_at);
      }
    }
    
    // Trigger sync
    console.log('🔄 Triggering sync...');
    const syncResponse = await fetch('http://localhost:8080/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (syncResponse.ok) {
      console.log('✅ Sync completed');
      
      // Check cached version again
      const newCachedResponse = await fetch('http://localhost:8080/api/jobs/20483264');
      if (newCachedResponse.ok) {
        const newCachedJob = await newCachedResponse.json();
        const newCachedAttempts = newCachedJob.attempts || [];
        console.log('💾 POST-SYNC - Attempt count:', newCachedAttempts.length);
        console.log('💾 POST-SYNC - Last updated:', newCachedJob.updated_at);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugJob();
