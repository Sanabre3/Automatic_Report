const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class Logger {
  constructor(module = 'App') {
    this.module = module;
    this.logsDir = path.resolve('./logs'); // Usar pasta existente
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };
    this.initLogs();
  }

  async initLogs() {
    await fs.ensureDir(this.logsDir);
  }

  formatMessage(level, message, module = this.module) {
    const timestamp = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour12: false
    });
    
    return `[${level.padEnd(7)}] ${timestamp} [${module.padEnd(12)}] ${message}`;
  }

  async writeToFile(message) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logsDir, `${today}.log`);
      const latestFile = path.join(this.logsDir, 'latest.log');
      
      await fs.appendFile(logFile, message + '\n');
      
      // Manter compatibilidade com latest.log existente
      const currentLogs = await fs.readFile(logFile, 'utf8').catch(() => '');
      await fs.writeFile(latestFile, currentLogs);
    } catch (error) {
      // Falha silenciosa para evitar recursão
    }
  }

  // Métodos compatíveis com sistema existente
  log(message, type = 'info') {
    switch(type.toLowerCase()) {
      case 'error': return this.error(message);
      case 'success': return this.success(message);
      case 'warning': 
      case 'warn': return this.warn(message);
      case 'step': return this.info(`🔄 ${message}`);
      case 'data': return this.debug(`📊 ${message}`);
      default: return this.info(message);
    }
  }

  info(message) {
    const formatted = this.formatMessage('INFO', message);
    if (process.env.NODE_ENV !== 'test') {
      console.log(chalk.cyan('ℹ️'), chalk.white(message));
    }
    this.writeToFile(formatted);
  }

  success(message) {
    const formatted = this.formatMessage('SUCCESS', message);
    if (process.env.NODE_ENV !== 'test') {
      console.log(chalk.green('✅'), chalk.green(message));
    }
    this.writeToFile(formatted);
  }

  warn(message) {
    const formatted = this.formatMessage('WARN', message);
    if (process.env.NODE_ENV !== 'test') {
      console.log(chalk.yellow('⚠️'), chalk.yellow(message));
    }
    this.writeToFile(formatted);
  }

  error(message) {
    const formatted = this.formatMessage('ERROR', message);
    if (process.env.NODE_ENV !== 'test') {
      console.log(chalk.red('❌'), chalk.red(message));
    }
    this.writeToFile(formatted);
  }

  debug(message) {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('DEBUG', message);
      console.log(chalk.magenta('🔍'), chalk.gray(message));
      this.writeToFile(formatted);
    }
  }

  // Métodos para compatibilidade com logger antigo
  logSeparator() {
    const separator = '─'.repeat(60);
    this.writeToFile(separator);
  }

  logExecutionSummary(startTime, success = true, htmlPath = null, pdfPath = null) {
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    const timestamp = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour12: false
    });

    const summary = `
═══════════════════════════════════════════════════════════════
📊 RESUMO DA EXECUÇÃO
═══════════════════════════════════════════════════════════════
🕐 Fim da execução: ${timestamp}
⏱️ Tempo total: ${totalTime}s
✅ Status: ${success ? 'SUCESSO' : 'FALHA'}
${htmlPath ? `📄 HTML gerado: ${htmlPath}` : ''}
${pdfPath ? `📑 PDF gerado: ${pdfPath}` : ''}
═══════════════════════════════════════════════════════════════
`;

    this.writeToFile(summary);
  }
}

module.exports = Logger;