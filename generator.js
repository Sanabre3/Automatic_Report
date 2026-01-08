const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// === SISTEMA DE LOGS AVANÇADO ===
class LogManager {
  constructor() {
    this.logsDir = './logs';
    this.archiveDir = './logs/archive';
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
    
    this.setupLogDirectories();
    this.setupLogFiles();
  }

  setupLogDirectories() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }
  }

  setupLogFiles() {
    const today = new Date().toISOString().split('T')[0];
    this.currentLogFile = path.join(this.logsDir, `${today}.log`);
    this.latestLogFile = path.join(this.logsDir, 'latest.log');
    this.archiveOldLogs();
    this.initializeLogFile();
  }

  archiveOldLogs() {
    const today = new Date().toISOString().split('T')[0];
    try {
      if (fs.existsSync(this.latestLogFile)) {
        const stats = fs.statSync(this.latestLogFile);
        const fileDate = stats.mtime.toISOString().split('T')[0];
        if (fileDate !== today) {
          const archivePath = path.join(this.archiveDir, `${fileDate}.log`);
          fs.copyFileSync(this.latestLogFile, archivePath);
        }
      }
    } catch (error) {
      // Silencioso
    }
  }

  initializeLogFile() {
    const timestamp = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour12: false
    });
    
    const header = `
═══════════════════════════════════════════════════════════════
📊 RELATÓRIO GOOGLE ADS - LOG DE EXECUÇÃO
═══════════════════════════════════════════════════════════════
🕐 Início da sessão: ${timestamp}
🖥️ Sistema: ${process.platform} ${process.arch}
📦 Node.js: ${process.version}
📂 Diretório: ${process.cwd()}
═══════════════════════════════════════════════════════════════

`;

    fs.writeFileSync(this.currentLogFile, header);
    fs.writeFileSync(this.latestLogFile, header);
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.currentLogFile, message);
      fs.appendFileSync(this.latestLogFile, message);
    } catch (error) {
      // Silencioso
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour12: false
    });
    
    const fileMessage = `[${type.toUpperCase()}] ${timestamp}: ${message}\n`;
    this.writeToFile(fileMessage);
  }

  logSeparator() {
    const separator = '─'.repeat(60) + '\n';
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
�� Fim da execução: ${timestamp}
⏱️ Tempo total: ${totalTime}s
✅ Status: ${success ? 'SUCESSO' : 'FALHA'}
${htmlPath ? `📄 HTML gerado: ${htmlPath}` : ''}
${pdfPath ? `📑 PDF gerado: ${pdfPath}` : ''}
═══════════════════════════════════════════════════════════════

`;

    this.writeToFile(summary);
  }

  getLogStats() {
    try {
      const stats = {
        currentLogSize: 0,
        latestLogSize: 0,
        archiveCount: 0
      };

      if (fs.existsSync(this.currentLogFile)) {
        stats.currentLogSize = fs.statSync(this.currentLogFile).size;
      }

      if (fs.existsSync(this.latestLogFile)) {
        stats.latestLogSize = fs.statSync(this.latestLogFile).size;
      }

      if (fs.existsSync(this.archiveDir)) {
        stats.archiveCount = fs.readdirSync(this.archiveDir).length;
      }

      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }
}

const logger = new LogManager();

function log(message, type = 'info') {
  logger.log(message, type);
}

class RelatorioPDF {
  constructor() {
    this.templatePath = './index.html';
    this.cssPath = './main.css';
    this.configPath = './config.json';
    this.outputDir = './output';
    this.startTime = Date.now();
    
    log('🏗️ Inicializando classe RelatorioPDF', 'step');
    log(`📂 Template: ${this.templatePath}`, 'info');
    log(`🎨 CSS: ${this.cssPath}`, 'info');
    log(`⚙️ Config: ${this.configPath}`, 'info');
    log(`📁 Output: ${this.outputDir}`, 'info');
    
    // Log das estatísticas dos logs
    const logStats = logger.getLogStats();
    if (!logStats.error) {
      log(`�� Logs: ${(logStats.currentLogSize / 1024).toFixed(2)}KB atual, ${logStats.archiveCount} arquivados`, 'info');
    }
  }

  ensureDirectory() {
    log('📁 Verificando diretório de saída...', 'step');
    
    if (!fs.existsSync(this.outputDir)) {
      log('📁 Diretório output não existe, criando...', 'info');
      fs.mkdirSync(this.outputDir, { recursive: true });
      log('�� Pasta output criada com sucesso', 'success');
      console.log('📁 Pasta output criada');
    } else {
      log('📁 Diretório output já existe', 'info');
    }
  }

  loadConfig() {
    log('⚙️ Carregando arquivo de configuração...', 'step');
    
    try {
      if (!fs.existsSync(this.configPath)) {
        log(`❌ Arquivo ${this.configPath} não encontrado!`, 'error');
        console.error('❌ Arquivo config.json não encontrado!');
        return null;
      }
      
      log('📖 Lendo arquivo config.json...', 'info');
      const configData = fs.readFileSync(this.configPath, 'utf8');
      
      log('🔄 Fazendo parse do JSON...', 'info');
      const config = JSON.parse(configData);
      
      log('✅ Dados carregados do config.json', 'success');
      console.log('✅ Dados carregados do config.json');
      
      this.logConfigDetails(config);
      
      return config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        log('❌ Erro de sintaxe no arquivo config.json', 'error');
        log(`Detalhes do erro: ${error.message}`, 'error');
        console.error('❌ Erro no config.json:', error.message);
      } else {
        log(`❌ Erro ao carregar config.json: ${error.message}`, 'error');
        console.error('❌ Erro no config.json:', error.message);
      }
      return null;
    }
  }

  logConfigDetails(config) {
    log('📊 Detalhes da configuração carregada:', 'data');
    
    if (config.relatorio) {
      log(`  📅 Período: ${config.relatorio.periodo || 'Não definido'}`, 'data');
      log(`  �� Data Geração: ${config.relatorio.dataGeracao || 'Não definida'}`, 'data');
    }
    
    if (config.empresa) {
      log(`  🏢 Site: ${config.empresa.site || 'Não definido'}`, 'data');
      log(`  💻 GitHub: ${config.empresa.github || 'Não definido'}`, 'data');
    }
    
    if (config.kpis) {
      log(`  📈 KPIs configurados: ${Object.keys(config.kpis).length} itens`, 'data');
    }
    
    if (config.meses) {
      const mesesConfig = Object.keys(config.meses);
      log(`  📊 Meses configurados: ${mesesConfig.join(', ')}`, 'data');
    }
    
    if (config.eficiencia) {
      log(`  ⚡ Dados de eficiência: Configurados`, 'data');
    }
    
    if (config.conclusao) {
      log(`  📝 Conclusão: Configurada`, 'data');
    }
  }

  loadCSS() {
    log('🎨 Carregando arquivo CSS...', 'step');
    
    try {
      if (!fs.existsSync(this.cssPath)) {
        log(`❌ Arquivo ${this.cssPath} não encontrado!`, 'error');
        console.error('❌ Arquivo main.css não encontrado!');
        return '';
      }
      
      log('📖 Lendo arquivo main.css...', 'info');
      const css = fs.readFileSync(this.cssPath, 'utf8');
      
      const cssSize = (css.length / 1024).toFixed(2);
      log(`✅ CSS carregado com sucesso (${cssSize} KB)`, 'success');
      console.log('✅ CSS carregado');
      
      return css;
    } catch (error) {
      log(`❌ Erro ao ler main.css: ${error.message}`, 'error');
      console.error('❌ Erro ao ler main.css:', error.message);
      return '';
    }
  }

  loadTemplate() {
    log('📄 Carregando template HTML...', 'step');
    
    try {
      if (!fs.existsSync(this.templatePath)) {
        log(`❌ Arquivo ${this.templatePath} não encontrado!`, 'error');
        console.error('❌ Arquivo index.html não encontrado!');
        return null;
      }
      
      log('�� Lendo arquivo index.html...', 'info');
      const template = fs.readFileSync(this.templatePath, 'utf8');
      
      const templateSize = (template.length / 1024).toFixed(2);
      log(`✅ Template HTML carregado com sucesso (${templateSize} KB)`, 'success');
      console.log('✅ Template HTML carregado');
      
      return template;
    } catch (error) {
      log(`❌ Erro ao ler index.html: ${error.message}`, 'error');
      console.error('❌ Erro ao ler index.html:', error.message);
      return null;
    }
  }

  // === FUNÇÃO DE PROCESSAMENTO DE IMAGENS ===
  processImages(html) {
    log('🖼️ Processando imagens para Base64...', 'step');
    
    try {
      const possiblePaths = [
        './img/logo-que-vai-aprovar.svg',
        './img/logo-que-vai-aprovar.webp',
        './img/logo-que-vai-aprovar.png',
        './assets/images/logo-que-vai-aprovar.svg',
        './assets/images/logo-que-vai-aprovar.webp',
        './assets/images/logo-que-vai-aprovar.png',
        './logo-que-vai-aprovar.svg',
        './logo-que-vai-aprovar.webp',
        './logo-que-vai-aprovar.png'
      ];

      let imageFound = false;
      let imageBase64 = null;

      for (const imagePath of possiblePaths) {
        if (fs.existsSync(imagePath)) {
          log(`📸 Imagem encontrada: ${imagePath}`, 'info');
          
          const imageBase64Result = this.convertImageToBase64(imagePath);
          if (imageBase64Result) {
            imageBase64 = imageBase64Result;
            imageFound = true;
            break;
          }
        }
      }

      if (!imageFound) {
        log('⚠️ Nenhuma imagem encontrada nos caminhos esperados', 'warning');
        return html;
      }

      log('🔄 Substituindo referências da imagem por Base64...', 'info');
      
      const patterns = [
        /src="[^"]*logo-que-vai-aprovar\.(webp|svg|png)"/g,
        /src='[^']*logo-que-vai-aprovar\.(webp|svg|png)'/g,
        /src=["'][^"']*\/img\/[^"']*["']/g,
        /src=["']\.\/img\/logo-que-vai-aprovar\.[^"']*["']/g
      ];

      let replacements = 0;
      patterns.forEach(pattern => {
        const matches = html.match(pattern);
        if (matches) {
          html = html.replace(pattern, `src="${imageBase64}"`);
          replacements += matches.length;
          log(`✓ ${matches.length} referências substituídas pelo padrão`, 'info');
        }
      });

      if (replacements > 0) {
        log(`✅ ${replacements} referências de imagem convertidas para Base64`, 'success');
      } else {
        log('⚠️ Nenhuma referência de imagem encontrada no HTML', 'warning');
      }

      return html;

    } catch (error) {
      log(`❌ Erro ao processar imagens: ${error.message}`, 'error');
      return html;
    }
  }

  convertImageToBase64(imagePath) {
    try {
      log(`🔄 Convertendo ${imagePath} para Base64...`, 'info');
      
      const imageBuffer = fs.readFileSync(imagePath);
      const imageExtension = path.extname(imagePath).toLowerCase();
      
      let mimeType;
      switch (imageExtension) {
        case '.svg':
          mimeType = 'image/svg+xml';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        default:
          log(`⚠️ Tipo de imagem não reconhecido: ${imageExtension}`, 'warning');
          mimeType = 'image/png';
      }

      const base64String = imageBuffer.toString('base64');
      const dataURI = `data:${mimeType};base64,${base64String}`;
      
      const sizeKB = (imageBuffer.length / 1024).toFixed(2);
      log(`✅ Imagem convertida: ${mimeType}, ${sizeKB} KB`, 'success');
      
      return dataURI;
      
    } catch (error) {
      log(`❌ Erro ao converter ${imagePath}: ${error.message}`, 'error');
      return null;
    }
  }

  incorporateCSS(html, css) {
    log('🔗 Incorporando CSS no HTML...', 'step');
    
    try {
      log('🗑️ Removendo links para CSS externo...', 'info');
      html = html.replace(/<link rel="stylesheet" href="main\.css" \/>/g, '');
      
      log('📝 Adicionando CSS inline no <head>...', 'info');
      const cssTag = `<style>\n${css}\n</style>`;
      html = html.replace('</head>', `${cssTag}\n</head>`);
      
      log('✅ CSS incorporado no HTML com sucesso', 'success');
      console.log('✅ CSS incorporado no HTML');
      return html;
    } catch (error) {
      log(`❌ Erro ao incorporar CSS: ${error.message}`, 'error');
      console.error('❌ Erro ao incorporar CSS:', error.message);
      return html;
    }
  }

updateHTML(template, config) {
  log('🔄 Iniciando atualização de dados no HTML...', 'step');
  let html = template;
  let updateCount = 0;
  
  try {
    console.log('🔄 Atualizando dados no HTML...');

    // === PROCESSAR IMAGENS PRIMEIRO ===
    html = this.processImages(html);

    // === DADOS BÁSICOS ===
    log('📅 Atualizando dados básicos...', 'info');
    if (config.relatorio) {
      if (config.relatorio.dataGeracao) {
        html = html.replace(/Janeiro 2026/g, config.relatorio.dataGeracao);
        updateCount++;
        log(`  ✓ Data de geração atualizada: ${config.relatorio.dataGeracao}`, 'info');
      }
      
      if (config.relatorio.periodo) {
        html = html.replace(/Análise de Performance e ROI - 2026/g, `Análise de Performance e ROI - ${config.relatorio.periodo}`);
        updateCount++;
        log(`  ✓ Período atualizado: ${config.relatorio.periodo}`, 'info');
      }
    }

    if (config.empresa) {
      if (config.empresa.site) {
        html = html.replace(/https:\/\/www\.bisturi\.com\.br\//g, config.empresa.site);
        updateCount++;
        log(`  ✓ Site da empresa atualizado: ${config.empresa.site}`, 'info');
      }
      
      if (config.empresa.github) {
        html = html.replace(/https:\/\/github\.com\/Sanabre3/g, config.empresa.github);
        updateCount++;
        log(`  ✓ GitHub atualizado: ${config.empresa.github}`, 'info');
      }
    }

    // === KPIs (Visão Geral Executiva) ===
    if (config.kpis) {
      log('📊 Atualizando KPIs principais...', 'info');
      let kpiCount = 0;
      
      if (config.kpis.totalPedidos) {
        html = html.replace(/<div class="kpi-value">2\.392<\/div>/g, `<div class="kpi-value">${config.kpis.totalPedidos}</div>`);
        kpiCount++;
        log(`  ✓ Total de Pedidos: ${config.kpis.totalPedidos}`, 'info');
      }
      
      if (config.kpis.totalPedidosCrescimento) {
        html = html.replace(/Total de Pedidos $\+98%$/g, `Total de Pedidos (${config.kpis.totalPedidosCrescimento})`);
        kpiCount++;
        log(`  ✓ Crescimento Pedidos: ${config.kpis.totalPedidosCrescimento}`, 'info');
      }
      
      if (config.kpis.receitaTotal) {
        html = html.replace(/<div class="kpi-value">R$ 577\.893<\/div>/g, `<div class="kpi-value">${config.kpis.receitaTotal}</div>`);
        kpiCount++;
        log(`  ✓ Receita Total: ${config.kpis.receitaTotal}`, 'info');
      }
      
      if (config.kpis.receitaTotalCrescimento) {
        html = html.replace(/Receita Total $\+148%$/g, `Receita Total (${config.kpis.receitaTotalCrescimento})`);
        kpiCount++;
        log(`  ✓ Crescimento Receita: ${config.kpis.receitaTotalCrescimento}`, 'info');
      }
      
      if (config.kpis.ticketMedio) {
        html = html.replace(/<div class="kpi-value">R$ 241,48<\/div>/g, `<div class="kpi-value">${config.kpis.ticketMedio}</div>`);
        kpiCount++;
        log(`  ✓ Ticket Médio: ${config.kpis.ticketMedio}`, 'info');
      }
      
      if (config.kpis.ticketMedioCrescimento) {
        html = html.replace(/Ticket Médio $\+25%$/g, `Ticket Médio (${config.kpis.ticketMedioCrescimento})`);
        kpiCount++;
        log(`  ✓ Crescimento Ticket: ${config.kpis.ticketMedioCrescimento}`, 'info');
      }
      
      updateCount += kpiCount;
      log(`📊 ${kpiCount} KPIs atualizados com sucesso`, 'success');
    }

    // === DESTAQUE ===
    if (config.destaque) {
      log('🎯 Atualizando texto de destaque...', 'info');
      const destaqueOriginal = /Google Ads apresentou crescimento excepcional em 2025, com ROAS médio de 17,5x e crescimento de 98% nos pedidos vs 2024\./g;
      html = html.replace(destaqueOriginal, config.destaque);
      updateCount++;
      log(`  ✓ Destaque atualizado: ${config.destaque.substring(0, 50)}...`, 'info');
    }

    // === GRÁFICO DE BARRAS (Análise de Crescimento) ===
    if (config.meses) {
      log('📊 Atualizando dados do gráfico de barras...', 'info');
      console.log('📊 Atualizando dados do gráfico de barras...');
      let graficosCount = 0;
      
      // Outubro
      if (config.meses.outubro) {
        html = html.replace(/<div class="bar bar-2024" style="height: 43%">\s*<div class="bar-value">433<\/div>/g, 
          `<div class="bar bar-2024" style="height: ${config.meses.outubro.alturaBar2024}"><div class="bar-value">${config.meses.outubro.pedidos2024}</div>`);
        
        html = html.replace(/<div class="bar bar-2025" style="height: 65%">\s*<div class="bar-value">652<\/div>/g, 
          `<div class="bar bar-2025" style="height: ${config.meses.outubro.alturaBar2025}"><div class="bar-value">${config.meses.outubro.pedidos2025}</div>`);
        
        graficosCount++;
        log(`  ✓ Gráfico Outubro: ${config.meses.outubro.pedidos2024} → ${config.meses.outubro.pedidos2025}`, 'info');
      }

      // Novembro
      if (config.meses.novembro) {
        html = html.replace(/<div class="bar bar-2024" style="height: 39%">\s*<div class="bar-value">387<\/div>/g, 
          `<div class="bar bar-2024" style="height: ${config.meses.novembro.alturaBar2024}"><div class="bar-value">${config.meses.novembro.pedidos2024}</div>`);
        
        html = html.replace(/<div class="bar bar-2025" style="height: 89%">\s*<div class="bar-value">892<\/div>/g, 
          `<div class="bar bar-2025" style="height: ${config.meses.novembro.alturaBar2025}"><div class="bar-value">${config.meses.novembro.pedidos2025}</div>`);
        
        graficosCount++;
        log(`  ✓ Gráfico Novembro: ${config.meses.novembro.pedidos2024} → ${config.meses.novembro.pedidos2025}`, 'info');
      }

      // Dezembro
      if (config.meses.dezembro) {
        html = html.replace(/<div class="bar bar-2024" style="height: 41%">\s*<div class="bar-value">415<\/div>/g, 
          `<div class="bar bar-2024" style="height: ${config.meses.dezembro.alturaBar2024}"><div class="bar-value">${config.meses.dezembro.pedidos2024}</div>`);
        
        html = html.replace(/<div class="bar bar-2025" style="height: 85%">\s*<div class="bar-value">848<\/div>/g, 
          `<div class="bar bar-2025" style="height: ${config.meses.dezembro.alturaBar2025}"><div class="bar-value">${config.meses.dezembro.pedidos2025}</div>`);
        
        graficosCount++;
        log(`  ✓ Gráfico Dezembro: ${config.meses.dezembro.pedidos2024} → ${config.meses.dezembro.pedidos2025}`, 'info');
      }
      
      updateCount += graficosCount;
      log(`📊 ${graficosCount} gráficos de barras atualizados`, 'success');
    }

    // === TABELA DE PERFORMANCE DETALHADA ===
    if (config.meses) {
      log('📋 Atualizando tabela de performance detalhada...', 'info');
      console.log('📋 Atualizando tabela de performance...');
      let tabelaCount = 0;
      
      // Outubro
      if (config.meses.outubro) {
        const outubrowOriginal = /<tr>\s*<td><strong>Outubro<\/strong><\/td>\s*<td>433<\/td>\s*<td>652<\/td>\s*<td>R$ 110\.745<\/td>\s*<td>R$ 151\.720<\/td>\s*<td><strong>\+50,6%<\/strong><\/td>\s*<td><strong>\+37,0%<\/strong><\/td>\s*<\/tr>/g;
        
        const outubrowNova = `<tr>
          <td><strong>Outubro</strong></td>
          <td>${config.meses.outubro.pedidos2024}</td>
          <td>${config.meses.outubro.pedidos2025}</td>
          <td>${config.meses.outubro.receita2024}</td>
          <td>${config.meses.outubro.receita2025}</td>
          <td><strong>${config.meses.outubro.crescimentoPedidos}</strong></td>
          <td><strong>${config.meses.outubro.crescimentoReceita}</strong></td>
        </tr>`;
        
        html = html.replace(outubrowOriginal, outubrowNova);
        tabelaCount++;
        log(`  ✓ Linha Outubro: ${config.meses.outubro.crescimentoPedidos} pedidos, ${config.meses.outubro.crescimentoReceita} receita`, 'info');
      }

      // Novembro
      if (config.meses.novembro) {
        const novembrowOriginal = /<tr>\s*<td><strong>Novembro<\/strong><\/td>\s*<td>387<\/td>\s*<td>892<\/td>\s*<td>R$ 90\.337<\/td>\s*<td>R$ 219\.087<\/td>\s*<td><strong>\+130,5%<\/strong><\/td>\s*<td><strong>\+142,5%<\/strong><\/td>\s*<\/tr>/g;
        
        const novembrowNova = `<tr>
          <td><strong>Novembro</strong></td>
          <td>${config.meses.novembro.pedidos2024}</td>
          <td>${config.meses.novembro.pedidos2025}</td>
          <td>${config.meses.novembro.receita2024}</td>
          <td>${config.meses.novembro.receita2025}</td>
          <td><strong>${config.meses.novembro.crescimentoPedidos}</strong></td>
          <td><strong>${config.meses.novembro.crescimentoReceita}</strong></td>
        </tr>`;
        
        html = html.replace(novembrowOriginal, novembrowNova);
        tabelaCount++;
        log(`  ✓ Linha Novembro: ${config.meses.novembro.crescimentoPedidos} pedidos, ${config.meses.novembro.crescimentoReceita} receita`, 'info');
      }

      // Dezembro
      if (config.meses.dezembro) {
        const dezembrowOriginal = /<tr>\s*<td><strong>Dezembro<\/strong><\/td>\s*<td>415<\/td>\s*<td>848<\/td>\s*<td>R$ 83\.432<\/td>\s*<td>R$ 207\.086<\/td>\s*<td><strong>\+104,3%<\/strong><\/td>\s*<td><strong>\+148,2%<\/strong><\/td>\s*<\/tr>/g;
        
        const dezembrowNova = `<tr>
          <td><strong>Dezembro</strong></td>
          <td>${config.meses.dezembro.pedidos2024}</td>
          <td>${config.meses.dezembro.pedidos2025}</td>
          <td>${config.meses.dezembro.receita2024}</td>
          <td>${config.meses.dezembro.receita2025}</td>
          <td><strong>${config.meses.dezembro.crescimentoPedidos}</strong></td>
          <td><strong>${config.meses.dezembro.crescimentoReceita}</strong></td>
        </tr>`;
        
        html = html.replace(dezembrowOriginal, dezembrowNova);
        tabelaCount++;
        log(`  ✓ Linha Dezembro: ${config.meses.dezembro.crescimentoPedidos} pedidos, ${config.meses.dezembro.crescimentoReceita} receita`, 'info');
      }
      
      updateCount += tabelaCount;
      log(`📋 ${tabelaCount} linhas da tabela de performance atualizadas`, 'success');
    }

    // === TABELA DE ROI ===
    if (config.meses) {
      log('💰 Atualizando tabela de ROI...', 'info');
      console.log('💰 Atualizando tabela de ROI...');
      let roiCount = 0;
      
      // ROI Outubro
      if (config.meses.outubro) {
        const roiOutubroOriginal = /<tr>\s*<td><strong>Outubro<\/strong><\/td>\s*<td>R$ 151\.720<\/td>\s*<td>R$ 11\.000<\/td>\s*<td>1\.279%<\/td>\s*<td>13,79x<\/td>\s*<td>🟢 Excelente<\/td>\s*<\/tr>/g;
        
        const roiOutubroNovo = `<tr>
          <td><strong>Outubro</strong></td>
          <td>${config.meses.outubro.receita2025}</td>
          <td>${config.meses.outubro.investimento}</td>
          <td>${config.meses.outubro.roi}</td>
          <td>${config.meses.outubro.roas}</td>
          <td>${config.meses.outubro.performance}</td>
        </tr>`;
        
        html = html.replace(roiOutubroOriginal, roiOutubroNovo);
        roiCount++;
        log(`  ✓ ROI Outubro: ${config.meses.outubro.roas} ROAS`, 'info');
      }

      // ROI Novembro
      if (config.meses.novembro) {
        const roiNovembroOriginal = /<tr>\s*<td><strong>Novembro<\/strong><\/td>\s*<td>R$ 219\.087<\/td>\s*<td>R$ 11\.000<\/td>\s*<td>1\.892%<\/td>\s*<td>19,92x<\/td>\s*<td>🟢 Excepcional<\/td>\s*<\/tr>/g;
        
        const roiNovembroNovo = `<tr>
          <td><strong>Novembro</strong></td>
          <td>${config.meses.novembro.receita2025}</td>
          <td>${config.meses.novembro.investimento}</td>
          <td>${config.meses.novembro.roi}</td>
          <td>${config.meses.novembro.roas}</td>
          <td>${config.meses.novembro.performance}</td>
        </tr>`;
        
        html = html.replace(roiNovembroOriginal, roiNovembroNovo);
        roiCount++;
        log(`  ✓ ROI Novembro: ${config.meses.novembro.roas} ROAS`, 'info');
      }

      // ROI Dezembro
      if (config.meses.dezembro) {
        const roiDezembroOriginal = /<tr>\s*<td><strong>Dezembro<\/strong><\/td>\s*<td>R$ 207\.086<\/td>\s*<td>R$ 11\.000<\/td>\s*<td>1\.783%<\/td>\s*<td>18,83x<\/td>\s*<td>🟢 Excepcional<\/td>\s*<\/tr>/g;
        
        const roiDezembroNovo = `<tr>
          <td><strong>Dezembro</strong></td>
          <td>${config.meses.dezembro.receita2025}</td>
          <td>${config.meses.dezembro.investimento}</td>
          <td>${config.meses.dezembro.roi}</td>
          <td>${config.meses.dezembro.roas}</td>
          <td>${config.meses.dezembro.performance}</td>
        </tr>`;
        
        html = html.replace(roiDezembroOriginal, roiDezembroNovo);
        roiCount++;
        log(`  ✓ ROI Dezembro: ${config.meses.dezembro.roas} ROAS`, 'info');
      }
      
      updateCount += roiCount;
      log(`💰 ${roiCount} linhas da tabela de ROI atualizadas`, 'success');
    }

    // === EFICIÊNCIA ===
    if (config.eficiencia) {
      log('📊 Atualizando indicadores de eficiência...', 'info');
      console.log('📊 Atualizando indicadores de eficiência...');
      let eficienciaCount = 0;
      
      html = html.replace(/<td>412<\/td>/g, `<td>${config.eficiencia.pedidosMes2024}</td>`);
      html = html.replace(/<td>797<\/td>/g, `<td>${config.eficiencia.pedidosMes2025}</td>`);
      html = html.replace(/<td><strong>\+94%<\/strong><\/td>/g, `<td><strong>${config.eficiencia.melhoriaP}</strong></td>`);
      
      html = html.replace(/<td>R$ 94\.838<\/td>/g, `<td>${config.eficiencia.receitaMes2024}</td>`);
      html = html.replace(/<td>R$ 192\.631<\/td>/g, `<td>${config.eficiencia.receitaMes2025}</td>`);
      
      html = html.replace(/<td>R$ 230,10<\/td>/g, `<td>${config.eficiencia.ticketMedio2024}</td>`);
      html = html.replace(/<td>R$ 241,48<\/td>/g, `<td>${config.eficiencia.ticketMedio2025}</td>`);
      
      html = html.replace(/<td>8,6x<\/td>/g, `<td>${config.eficiencia.roasMedio2024}</td>`);
      html = html.replace(/<td>17,5x<\/td>/g, `<td>${config.eficiencia.roasMedio2025}</td>`);
      
      eficienciaCount = 9;
      updateCount += eficienciaCount;
      log(`📊 ${eficienciaCount} indicadores de eficiência atualizados`, 'success');
    }

    // === CONCLUSÃO ===
    if (config.conclusao) {
      log('📝 Atualizando conclusão...', 'info');
      let conclusaoCount = 0;
      
      html = html.replace(/R$ 33\.000\/trimestre/g, `${config.conclusao.investimentoTrimestre}/trimestre`);
      html = html.replace(/gerou R$ 577\.893 em receita/g, `gerou ${config.conclusao.receitaGerada} em receita`);
      html = html.replace(/ROAS médio de 17,5x/g, `ROAS médio de ${config.conclusao.roasResultado}`);
      
      conclusaoCount = 3;
      updateCount += conclusaoCount;
      log(`📝 ${conclusaoCount} itens da conclusão atualizados`, 'success');
    }

    log(`✅ Atualização do HTML concluída: ${updateCount} substituições realizadas`, 'success');
    console.log('✅ Todos os dados atualizados no HTML');
    return html;
    
  } catch (error) {
    log(`❌ Erro ao atualizar HTML: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'error');
    console.error('❌ Erro ao atualizar HTML:', error.message);
    console.error('Stack:', error.stack);
    return template;
  }
}

  generateHTML() {
    log('🎨 Iniciando geração do HTML...', 'step');
    
    try {
      this.ensureDirectory();
      
      const config = this.loadConfig();
      if (!config) {
        log('❌ Falha ao carregar configuração, abortando geração HTML', 'error');
        return null;
      }
      
      const template = this.loadTemplate();
      if (!template) {
        log('❌ Falha ao carregar template, abortando geração HTML', 'error');
        return null;
      }

      const css = this.loadCSS();
      if (!css) {
        log('⚠️ CSS não carregado, continuando sem estilos incorporados', 'warning');
      }

      log('🔄 Processando dados do template...', 'step');
      let updatedHTML = this.updateHTML(template, config);
      
      if (css) {
        updatedHTML = this.incorporateCSS(updatedHTML, css);
      }
      
      const timestamp = new Date().toISOString().slice(0,19).replace(/[:.]/g, '-');
      const htmlPath = path.join(this.outputDir, `relatorio-${timestamp}.html`);
      
      log('💾 Salvando arquivo HTML...', 'step');
      fs.writeFileSync(htmlPath, updatedHTML);
      
      const stats = fs.statSync(htmlPath);
      const fileSize = (stats.size / 1024).toFixed(2);
      
      log(`✅ HTML gerado com CSS incorporado: ${htmlPath}`, 'success');
      log(`📏 Tamanho do arquivo: ${fileSize} KB`, 'info');
      console.log(`✅ HTML gerado com CSS incorporado: ${htmlPath}`);
      
      return htmlPath;
    } catch (error) {
      log(`❌ Erro ao gerar HTML: ${error.message}`, 'error');
      log(`Stack trace: ${error.stack}`, 'error');
      console.error('❌ Erro ao gerar HTML:', error.message);
      return null;
    }
  }

  async generatePDF(htmlPath) {
    log('📄 Iniciando geração do PDF...', 'step');
    let browser;
    
    try {
      log('🚀 Iniciando Puppeteer...', 'info');
      console.log('🔄 Gerando PDF...');
      
      browser = await puppeteer.launch({ 
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      log('✅ Puppeteer iniciado com sucesso', 'success');
      
      log('📖 Criando nova página...', 'info');
      const page = await browser.newPage();
      
      log('🖥️ Configurando viewport (1200x800)...', 'info');
      await page.setViewport({ width: 1200, height: 800 });
      
      const fileUrl = `file://${path.resolve(htmlPath)}`;
      log(`📄 Carregando HTML: ${fileUrl}`, 'info');
      console.log(`📄 Carregando: ${fileUrl}`);
      
      const loadStart = Date.now();
      await page.goto(fileUrl, { 
        waitUntil: 'networkidle0', 
        timeout: 60000 
      });
      const loadTime = ((Date.now() - loadStart) / 1000).toFixed(2);
      log(`✅ HTML carregado em ${loadTime}s`, 'success');
      
      log('⏳ Aguardando renderização completa (5s)...', 'info');
      console.log('⏳ Aguardando renderização completa...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const timestamp = new Date().toISOString().slice(0,19).replace(/[:.]/g, '-');
      const pdfPath = path.join(this.outputDir, `relatorio-google-ads-${timestamp}.pdf`);
      
      log('📄 Gerando arquivo PDF...', 'step');
      console.log('📄 Gerando arquivo PDF...');
      const pdfStart = Date.now();
      
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm', 
          bottom: '20mm',
          left: '15mm'
        },
        preferCSSPageSize: true
      });
      
      const pdfTime = ((Date.now() - pdfStart) / 1000).toFixed(2);
      
      const stats = fs.statSync(pdfPath);
      const pdfSize = (stats.size / 1024).toFixed(2);
      
      log(`✅ PDF gerado em ${pdfTime}s (${pdfSize} KB): ${pdfPath}`, 'success');
      console.log(`✅ PDF gerado com todos os estilos: ${pdfPath}`);
      return pdfPath;
      
    } catch (error) {
      log(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
      log(`Stack completo: ${error.stack}`, 'error');
      console.error('❌ Erro ao gerar PDF:', error.message);
      console.error('Stack completo:', error.stack);
      return null;
    } finally {
      if (browser) {
        log('🔒 Fechando browser...', 'info');
        await browser.close();
        log('�� Browser fechado com sucesso', 'success');
        console.log('🔒 Browser fechado');
      }
    }
  }
    async run() {
    const totalStart = Date.now();
    let success = false;
    let htmlPath = null;
    let pdfPath = null;
    
    log('🚀 Iniciando gerador de relatórios...', 'step');
    console.log('🚀 Iniciando gerador de relatórios...\n');
    logger.logSeparator();
    
    try {
      htmlPath = this.generateHTML();
      if (!htmlPath) {
        log('💥 Falha ao gerar HTML - processo abortado', 'error');
        console.error('💥 Falha ao gerar HTML');
        return;
      }

      pdfPath = await this.generatePDF(htmlPath);
      if (!pdfPath) {
        log('💥 Falha ao gerar PDF - processo abortado', 'error');
        console.error('💥 Falha ao gerar PDF');
        return;
      }

      success = true;
      const totalTime = ((Date.now() - totalStart) / 1000).toFixed(2);
      
      logger.logSeparator();
      log('🎉 Relatório gerado com sucesso!', 'success');
      log(`📄 PDF: ${pdfPath}`, 'success');
      log(`📄 HTML: ${htmlPath}`, 'success');
      log(`📁 Pasta: ${path.resolve(this.outputDir)}`, 'info');
      log(`⏱️ Tempo total de execução: ${totalTime}s`, 'info');
      log('🎨 CSS incorporado e elementos visuais preservados!', 'success');
      
      console.log('\n🎉 Relatório gerado com sucesso!');
      console.log(`📄 PDF: ${pdfPath}`);
      console.log(`📁 Pasta: ${path.resolve(this.outputDir)}`);
      console.log('🎨 CSS incorporado e elementos visuais preservados!');
      
    } catch (error) {
      const totalTime = ((Date.now() - totalStart) / 1000).toFixed(2);
      log(`💥 Erro geral após ${totalTime}s: ${error.message}`, 'error');
      log(`Stack trace: ${error.stack}`, 'error');
      console.error('\n💥 Erro geral:', error.message);
    } finally {
      // Sempre gerar resumo da execução
      logger.logExecutionSummary(totalStart, success, htmlPath, pdfPath);
    }
  }
}

// === TRATAMENTO DE ERROS GLOBAIS ===
process.on('unhandledRejection', (reason, promise) => {
    log('💥 Erro não capturado detectado!', 'error');
    log(`Razão: ${reason}`, 'error');
    console.error('💥 Erro não capturado detectado!');
    console.error('Promise rejeitada em:', promise);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log('💥 Exceção não capturada!', 'error');
    log(`Erro: ${error.message}`, 'error');
    console.error('💥 Exceção não capturada!');
    console.error('Stack trace:', error.stack);
    process.exit(1);
});

// === EXECUÇÃO ===
if (require.main === module) {
  const gerador = new RelatorioPDF();
  gerador.run()
    .then(() => {
      log('🎊 Processo concluído com sucesso!', 'success');
      console.log('🎊 Processo concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      log('💥 Processo falhou!', 'error');
      log(`Erro final: ${error.message}`, 'error');
      console.error('💥 Processo falhou!');
      console.error(`Erro final: ${error.message}`);
      process.exit(1);
    });
}

module.exports = RelatorioPDF;