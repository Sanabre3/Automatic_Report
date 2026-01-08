#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');

// Importar módulos do sistema novo
const FileWatcher = require('./src/core/FileWatcher');
const Logger = require('./src/utils/Logger');

// Importar gerador original para compatibilidade
const RelatorioPDF = require('./generator');

class AutoReportSystem {
  constructor() {
    this.logger = new Logger('AutoReport');
    this.watcher = null;
    this.isProcessing = false;
    this.setupProcessHandlers();
  }

  setupProcessHandlers() {
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    
    process.on('unhandledRejection', (reason) => {
      this.logger.error(`Rejection não tratada: ${reason}`);
      process.exit(1);
    });
  }

  async gracefulShutdown(signal) {
    this.logger.info(`🛑 Recebido sinal ${signal}, finalizando...`);
    
    if (this.watcher) {
      this.watcher.stop();
    }
    
    this.logger.info('👋 Sistema finalizado');
    process.exit(0);
  }

  async processReport() {
    if (this.isProcessing) {
      this.logger.warn('⚠️ Processamento já em andamento, aguardando...');
      return;
    }

    this.isProcessing = true;
    
    try {
      this.logger.info('🔄 Iniciando processamento do relatório...');
      
      // Usar gerador original por compatibilidade
      const gerador = new RelatorioPDF();
      const result = await gerador.run();
      
      this.logger.success('✅ Relatório processado com sucesso!');
      return result;
      
    } catch (error) {
      this.logger.error(`❌ Erro no processamento: ${error.message}`);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  async startWatchMode() {
    this.logger.info('👁️ Iniciando modo de monitoramento...');
    
    // Verificar se config.json existe
    if (!await fs.pathExists('./config.json')) {
      this.logger.error('❌ Arquivo config.json não encontrado!');
      process.exit(1);
    }

    // Processar relatório inicial
    await this.processReport();

    // Iniciar monitoramento
    this.watcher = new FileWatcher('./config.json', { debounceTime: 2000 });
    
    this.watcher.on('ready', () => {
      this.logger.success('👁️ Sistema de monitoramento ativo!');
      console.log('\n📋 INSTRUÇÕES:');
      console.log('• Edite o arquivo config.json para atualizar dados');
      console.log('• O relatório será regenerado automaticamente');
      console.log('• Pressione Ctrl+C para parar o monitoramento\n');
    });

    this.watcher.on('fileChanged', async (event) => {
      console.log(`\n🔔 Mudança detectada em ${new Date().toLocaleTimeString('pt-BR')}`);
      console.log('🔄 Regenerando relatório...\n');
      
      try {
        await this.processReport();
        console.log(`\n✅ Atualização concluída em ${new Date().toLocaleTimeString('pt-BR')}`);
        console.log('👁️ Continuando monitoramento...\n');
      } catch (error) {
        console.log(`\n❌ Erro na atualização: ${error.message}\n`);
      }
    });

    this.watcher.on('error', (error) => {
      this.logger.error(`❌ Erro no monitoramento: ${error.message}`);
    });

    this.watcher.start();

    // Manter processo ativo
    return new Promise(() => {
      // O processo permanece vivo até receber um sinal
    });
  }

  async runOnce() {
    this.logger.info('⚡ Executando modo único...');
    
    try {
      await this.processReport();
      this.logger.success('🎉 Execução única concluída!');
    } catch (error) {
      this.logger.error(`💥 Erro na execução: ${error.message}`);
      process.exit(1);
    }
  }

  async showStatus() {
    console.log('\n📊 STATUS DO SISTEMA:');
    console.log('═'.repeat(50));
    console.log(`🔄 Processando: ${this.isProcessing ? 'Sim' : 'Não'}`);
    console.log(`👁️ Monitorando: ${this.watcher ? 'Sim' : 'Não'}`);
    console.log(`�� Config: ./config.json`);
    console.log(`📂 Output: ./output`);
    console.log(`📋 Templates: ./templates`);
    
    // Verificar arquivos essenciais
    const files = {
      'config.json': await fs.pathExists('./config.json'),
      'generator.js': await fs.pathExists('./generator.js'),
      'templates/index.html': await fs.pathExists('./templates/index.html'),
      'templates/main.css': await fs.pathExists('./templates/main.css')
    };

    console.log('\n📋 Arquivos Essenciais:');
    Object.entries(files).forEach(([file, exists]) => {
      console.log(`${exists ? '✅' : '❌'} ${file}`);
    });
    
    console.log('═'.repeat(50) + '\n');
  }

  async run() {
    try {
      const args = process.argv.slice(2);
      
      // Verificar argumentos
      if (args.includes('--status')) {
        await this.showStatus();
        return;
      }

      if (args.includes('--watch')) {
        await this.startWatchMode();
      } else {
        await this.runOnce();
      }

    } catch (error) {
      this.logger.error(`💥 Erro fatal: ${error.message}`);
      process.exit(1);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const system = new AutoReportSystem();
  system.run();
}

module.exports = AutoReportSystem;