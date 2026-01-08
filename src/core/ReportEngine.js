const { EventEmitter } = require('events');
const FileWatcher = require('./FileWatcher');
const DataProcessor = require('./DataProcessor');
const CacheManager = require('./CacheManager');
const HTMLGenerator = require('../generators/HTMLGenerator');
const PDFGenerator = require('../generators/PDFGenerator');
const Logger = require('../utils/Logger');

class ReportEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.configPath = options.configPath || './config.json';
    this.outputDir = options.outputDir || './output';
    this.templatesDir = options.templatesDir || './templates';
    this.watchMode = options.watchMode || false;
    
    this.logger = new Logger('ReportEngine');
    this.cache = new CacheManager();
    this.dataProcessor = new DataProcessor();
    this.htmlGenerator = new HTMLGenerator(this.templatesDir);
    this.pdfGenerator = new PDFGenerator();
    
    this.isProcessing = false;
    this.lastProcessTime = null;
    
    // Configurar file watcher se necessário
    if (this.watchMode) {
      this.fileWatcher = new FileWatcher(this.configPath);
      this.setupWatcher();
    }
  }

  // Configurar monitoramento de arquivos
  setupWatcher() {
    this.fileWatcher.on('fileChanged', (event) => {
      this.logger.info(`📝 Arquivo alterado detectado: ${event.path}`);
      this.processReportWithDebounce();
    });

    this.fileWatcher.on('error', (error) => {
      this.logger.error(`❌ Erro no file watcher: ${error.message}`);
      this.emit('error', error);
    });

    this.fileWatcher.on('ready', () => {
      this.logger.success('👁️ Monitoramento ativo - aguardando mudanças...');
      this.emit('watcherReady');
    });
  }

  // Processar relatório com debounce
  async processReportWithDebounce() {
    if (this.isProcessing) {
      this.logger.info('⏳ Processamento já em andamento, aguardando...');
      return;
    }

    try {
      await this.processReport({ useCache: true });
    } catch (error) {
      this.logger.error(`❌ Erro no processamento automático: ${error.message}`);
      this.emit('error', error);
    }
  }

  // Processar relatório completo
  async processReport(options = {}) {
    const { useCache = true, forceRegenerate = false } = options;
    
    if (this.isProcessing) {
      this.logger.warn('⚠️ Processamento já em andamento');
      return null;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.logger.info('🚀 Iniciando processamento do relatório...');
      this.emit('processingStarted');

      // 1. Carregar e validar configuração
      const config = await this.loadConfig();
      const configHash = this.cache.generateHash(config);

      // 2. Verificar cache se solicitado
      let processedData = null;
      if (useCache && !forceRegenerate) {
        processedData = await this.cache.get(`processed_${configHash}`, this.configPath);
        if (processedData) {
          this.logger.info('💾 Usando dados do cache');
        }
      }

      // 3. Processar dados se necessário
      if (!processedData) {
        this.logger.info('🔄 Processando novos dados...');
        processedData = await this.dataProcessor.processConfig(config);
        
        // Salvar no cache
        await this.cache.set(`processed_${configHash}`, processedData);
      }

      // 4. Gerar HTML
      this.logger.info('🎨 Gerando HTML...');
      const htmlPath = await this.htmlGenerator.generate(processedData.template);

      // 5. Gerar PDF
      this.logger.info('📄 Gerando PDF...');
      const pdfPath = await this.pdfGenerator.generate(htmlPath);

      // 6. Limpar cache antigo se necessário
      await this.cleanOldCache();

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      this.lastProcessTime = Date.now();

      const result = {
        success: true,
        htmlPath,
        pdfPath,
        processTime: totalTime,
        timestamp: new Date().toISOString(),
        fromCache: !!processedData
      };

      this.logger.success(`✅ Relatório gerado em ${totalTime}s`);
      this.logger.info(`📄 HTML: ${htmlPath}`);
      this.logger.info(`📑 PDF: ${pdfPath}`);

      this.emit('processingCompleted', result);
      return result;

    } catch (error) {
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      this.logger.error(`❌ Erro após ${totalTime}s: ${error.message}`);
      this.emit('processingError', error);
      
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // Carregar configuração
  async loadConfig() {
    const fs = require('fs-extra');
    
    try {
      const configExists = await fs.pathExists(this.configPath);
      if (!configExists) {
        throw new Error(`Arquivo de configuração não encontrado: ${this.configPath}`);
      }

      const config = await fs.readJson(this.configPath);
      this.logger.info(`⚙️ Configuração carregada: ${this.configPath}`);
      
      return config;
    } catch (error) {
      this.logger.error(`❌ Erro ao carregar configuração: ${error.message}`);
      throw error;
    }
  }

  // Limpar cache antigo
  async cleanOldCache() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    const now = Date.now();

    if (this.lastProcessTime && (now - this.lastProcessTime) > maxAge) {
      await this.cache.clear();
      this.logger.info('🧹 Cache antigo limpo');
    }
  }

  // Iniciar monitoramento
  async startWatching() {
    if (!this.fileWatcher) {
      this.fileWatcher = new FileWatcher(this.configPath);
      this.setupWatcher();
    }

    this.watchMode = true;
    this.fileWatcher.start();
    
    // Processar relatório inicial
    await this.processReport({ useCache: false });
  }

  // Parar monitoramento
  stopWatching() {
    if (this.fileWatcher) {
      this.fileWatcher.stop();
    }
    this.watchMode = false;
    this.logger.info('🛑 Monitoramento parado');
  }

  // Obter status do sistema
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      isWatching: this.watchMode,
      lastProcessTime: this.lastProcessTime,
      configPath: this.configPath,
      outputDir: this.outputDir,
      cacheStats: this.cache.getStats(),
      watcherStatus: this.fileWatcher ? this.fileWatcher.getStatus() : null
    };
  }

  // Limpar recursos
  async cleanup() {
    this.logger.info('🧹 Limpando recursos...');
    
    if (this.fileWatcher) {
      this.fileWatcher.stop();
    }

    await this.pdfGenerator.cleanup();
    this.removeAllListeners();
    
    this.logger.info('✅ Limpeza concluída');
  }
}

module.exports = ReportEngine;