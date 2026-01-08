#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function showLogs() {
  const latestLogPath = './logs/latest.log';
  
  try {
    if (fs.existsSync(latestLogPath)) {
      const logs = fs.readFileSync(latestLogPath, 'utf8');
      console.log('📋 ÚLTIMOS LOGS:\n');
      console.log(logs);
    } else {
      console.log('⚠️ Nenhum log encontrado');
      console.log('Execute "npm start" ou "npm run watch" para gerar logs');
    }
  } catch (error) {
    console.error('❌ Erro ao ler logs:', error.message);
    process.exit(1);
  }
}

showLogs();