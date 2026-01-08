#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

async function cleanDirectories() {
  console.log('🧹 Limpando diretórios...');
  
  try {
    // Limpar output
    const outputDir = './output';
    if (await fs.pathExists(outputDir)) {
      await fs.emptyDir(outputDir);
      console.log('✅ Pasta output limpa');
    }
    
    // Limpar cache
    const cacheDir = './cache';
    if (await fs.pathExists(cacheDir)) {
      await fs.emptyDir(cacheDir);
      console.log('✅ Pasta cache limpa');
    }
    
    console.log('🎉 Limpeza concluída!');
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error.message);
    process.exit(1);
  }
}

cleanDirectories();