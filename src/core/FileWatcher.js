const chokidar = require('chokidar');
const path = require('path');
const { EventEmitter } = require('events');
const Logger = require('../utils/Logger');

class FileWatcher extends EventEmitter {
  constructor(filePath = './config.json', options = {}) {
    super();
    this.filePath = path.resolve(filePath);
    this.isWatching = false;
    this.debounceTime = options.debounceTime || 1500; // Aumentado para estabilidade
    this.logger = new Logger('FileWatcher');
    this.lastChange = null;
    this.watcher = null;
    this.debounceTimer = null;
  }

  start() {
    if (this.isWatching) {
      this.logger.warn('⚠️ Watcher já está ativo');
      return this;
    }

    this.logger.info('👁️ Iniciando monitoramento de arquivos...');
    
    // Verificar se arquivo existe
    const fs = require('fs-extra');
    if (!fs.existsSync(this.filePath)) {
      this.logger.error(`❌ Arquivo não encontrado: ${this.filePath}`);
      return this;
    }

    // Configurar watcher com chokidar
    this.watcher = chokidar.watch(this.filePath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000, // Aguardar 1s de estabilidade
        pollInterval: 100
      },
      atomic: true // Detectar writes atômicos
    });

    // Event listeners
    this.watcher
      .on('change', (path) => this.handleFileChange(path))
      .on('error', (error) => this.handleError(error))
      .on('ready', () => {
        this.isWatching = true;
        this.logger.success(`✅ Monitorando: ${path.basename(this.filePath)}`);
        this.emit('ready');
      });

    return this;
  }

  stop() {
    if (!this.isWatching) return;

    this.logger.info('🛑 Parando monitoramento...');
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    
    this.isWatching = false;
    this.logger.success('✅ Monitoramento parado');
  }

  handleFileChange(changedPath) {
    const now = Date.now();
    
    this.logger.info(`📝 Arquivo alterado detectado: ${path.basename(changedPath)}`);
    
    // Limpar timer anterior se existir
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Configurar novo timer com debounce
    this.debounceTimer = setTimeout(() => {
      this.lastChange = now;
      this.logger.info('🔄 Iniciando recálculo automático...');
      
      // Emitir evento para iniciar processamento
      this.emit('fileChanged', {
        path: changedPath,
        timestamp: now,
        type: 'change'
      });
      
      this.debounceTimer = null;
    }, this.debounceTime);
  }

  handleError(error) {
    this.logger.error(`❌ Erro no monitoramento: ${error.message}`);
    this.emit('error', error);
  }

  getStatus() {
    return {
      isWatching: this.isWatching,
      filePath: this.filePath,
      lastChange: this.lastChange,
      hasDebounceTimer: !!this.debounceTimer
    };
  }
}

module.exports = FileWatcher;