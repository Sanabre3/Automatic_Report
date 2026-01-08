const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const Logger = require('../utils/Logger');

class CacheManager {
  constructor(cacheDir = './cache') {
    this.cacheDir = path.resolve(cacheDir);
    this.logger = new Logger('CacheManager');
    this.memoryCache = new Map();
    this.init();
  }

  async init() {
    try {
      await fs.ensureDir(this.cacheDir);
      this.logger.info(`📁 Cache inicializado em: ${this.cacheDir}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao inicializar cache: ${error.message}`);
    }
  }

  // Gerar hash dos dados para cache
  generateHash(data) {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  // Verificar se cache é válido
  async isCacheValid(key, sourceFile) {
    try {
      const cachePath = path.join(this.cacheDir, `${key}.json`);
      
      if (!await fs.pathExists(cachePath)) {
        return false;
      }

      const [cacheStats, sourceStats] = await Promise.all([
        fs.stat(cachePath),
        fs.stat(sourceFile)
      ]);

      // Cache é válido se for mais recente que o arquivo fonte
      return cacheStats.mtime > sourceStats.mtime;
    } catch (error) {
      this.logger.warn(`⚠️ Erro ao verificar cache: ${error.message}`);
      return false;
    }
  }

  // Obter dados do cache
  async get(key, sourceFile = null) {
    try {
      // Verificar cache em memória primeiro
      if (this.memoryCache.has(key)) {
        this.logger.info(`💾 Cache em memória: ${key}`);
        return this.memoryCache.get(key);
      }

      // Verificar cache em disco
      if (sourceFile && await this.isCacheValid(key, sourceFile)) {
        const cachePath = path.join(this.cacheDir, `${key}.json`);
        const data = await fs.readJson(cachePath);
        
        // Armazenar em memória para próxima consulta
        this.memoryCache.set(key, data);
        
        this.logger.info(`💽 Cache em disco: ${key}`);
        return data;
      }

      return null;
    } catch (error) {
      this.logger.warn(`⚠️ Erro ao ler cache ${key}: ${error.message}`);
      return null;
    }
  }

  // Armazenar dados no cache
  async set(key, data, options = {}) {
    try {
      // Armazenar em memória
      this.memoryCache.set(key, data);

      // Armazenar em disco se não for temporário
      if (!options.memoryOnly) {
        const cachePath = path.join(this.cacheDir, `${key}.json`);
        await fs.writeJson(cachePath, data, { spaces: 2 });
        
        this.logger.info(`💾 Cache salvo: ${key}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Erro ao salvar cache ${key}: ${error.message}`);
      return false;
    }
  }

  // Invalidar cache específico
  async invalidate(key) {
    try {
      // Remover da memória
      this.memoryCache.delete(key);

      // Remover do disco
      const cachePath = path.join(this.cacheDir, `${key}.json`);
      if (await fs.pathExists(cachePath)) {
        await fs.remove(cachePath);
        this.logger.info(`🗑️ Cache removido: ${key}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Erro ao invalidar cache ${key}: ${error.message}`);
      return false;
    }
  }

  // Limpar todo o cache
  async clear() {
    try {
      this.memoryCache.clear();
      await fs.emptyDir(this.cacheDir);
      this.logger.info('🧹 Cache limpo completamente');
      return true;
    } catch (error) {
      this.logger.error(`❌ Erro ao limpar cache: ${error.message}`);
      return false;
    }
  }

  // Estatísticas do cache
  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
      cacheDir: this.cacheDir
    };
  }
}

module.exports = CacheManager;