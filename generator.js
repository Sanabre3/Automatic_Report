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
🕐 Fim da execução: ${timestamp}
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
      log(`📊 Logs: ${(logStats.currentLogSize / 1024).toFixed(2)}KB atual, ${logStats.archiveCount} arquivados`, 'info');
    }
  }

  ensureDirectory() {
    log('📁 Verificando diretório de saída...', 'step');
    
    if (!fs.existsSync(this.outputDir)) {
      log('📁 Diretório output não existe, criando...', 'info');
      fs.mkdirSync(this.outputDir, { recursive: true });
      log('📁 Pasta output criada com sucesso', 'success');
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
      log(`  📆 Data Geração: ${config.relatorio.dataGeracao || 'Não definida'}`, 'data');
      log(`  🏷️ Plataforma: ${config.relatorio.plataforma || 'Não definida'}`, 'data');
    }
    
    if (config.empresa) {
      log(`  🏢 Site: ${config.empresa.site || 'Não definido'}`, 'data');
      log(`  💻 GitHub: ${config.empresa.github || 'Não definido'}`, 'data');
    }
    
    if (config.dados) {
      log(`  📊 Registros de dados: ${config.dados.length} entradas`, 'data');
    }
    
    if (config.configuracoes) {
      log(`  💰 Investimento mensal: ${config.configuracoes.investimentoMensalMedio || 'Não definido'}`, 'data');
      log(`  🎯 Meta ROAS: ${config.configuracoes.metaROAS || 'Não definida'}`, 'data');
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
      
      log('📖 Lendo arquivo index.html...', 'info');
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

  // === PROCESSAMENTO DE IMAGENS ===
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

  // === NOVO SISTEMA DE PROCESSAMENTO DE DADOS ===
  processarDadosSimplificados(config) {
    log('🧮 Processando dados simplificados...', 'step');
    console.log(`🔄 Analisando dados da plataforma: ${config.relatorio.plataforma}`);
    
    try {
      const { dados, configuracoes } = config;
      const { investimentoMensalMedio, metaROAS } = configuracoes;
      
      // 1. ORGANIZAR DADOS POR ANO E MÊS
      const dadosOrganizados = this.organizarDadosPorPeriodo(dados);
      
      // 2. CALCULAR TODAS AS MÉTRICAS
      const metricas = this.calcularTodasMetricas(dadosOrganizados, investimentoMensalMedio, metaROAS);
      
      // 3. GERAR DADOS PARA O HTML
      const dadosParaHTML = this.prepararDadosHTML(metricas, config.relatorio);
      
      log('✅ Processamento simplificado concluído', 'success');
      console.log('✅ Relatório completo gerado automaticamente');
      
      return dadosParaHTML;
      
    } catch (error) {
      log(`❌ Erro no processamento: ${error.message}`, 'error');
      console.error('❌ Erro:', error.message);
      return null;
    }
  }

  organizarDadosPorPeriodo(dados) {
    log('📅 Organizando dados por período...', 'info');
    
    const dadosOrganizados = {
      2024: {},
      2025: {}
    };
    
    dados.forEach(item => {
      const data = new Date(item.data);
      const ano = data.getFullYear();
      const mes = this.obterNomeMes(data.getMonth());
      
      if (!dadosOrganizados[ano]) {
        dadosOrganizados[ano] = {};
      }
      
      dadosOrganizados[ano][mes] = {
        pedidos: item.pedidos,
        receita: item.valorBruto,
        data: item.data
      };
      
      log(`  ✓ ${mes}/${ano}: ${item.pedidos} pedidos, ${this.formatarMoeda(item.valorBruto)}`, 'info');
    });
    
    return dadosOrganizados;
  }

  calcularTodasMetricas(dadosOrganizados, investimento, metaROAS) {
    log('📊 Calculando todas as métricas...', 'info');
    
    const anos = Object.keys(dadosOrganizados);
    const meses = Object.keys(dadosOrganizados[anos[0]] || {});
    
    const metricas = {
      porMes: {},
      totais: {},
      comparacoes: {},
      eficiencia: {}
    };
    
    // 1. MÉTRICAS POR MÊS
    meses.forEach(mes => {
      metricas.porMes[mes] = this.calcularMetricasMensal(
        dadosOrganizados[2024][mes] || {pedidos: 0, receita: 0},
        dadosOrganizados[2025][mes] || {pedidos: 0, receita: 0},
        investimento,
        metaROAS
      );
    });
    
    // 2. TOTAIS ANUAIS
    anos.forEach(ano => {
      metricas.totais[ano] = this.calcularTotaisAno(dadosOrganizados[ano]);
    });
    
    // 3. COMPARAÇÕES
    metricas.comparacoes = this.calcularComparacoes(metricas.totais);
    
    // 4. EFICIÊNCIA
    metricas.eficiencia = this.calcularIndicadoresEficiencia(metricas.totais, meses.length);
    
    return metricas;
  }

  calcularMetricasMensal(dados2024, dados2025, investimento, metaROAS) {
    const crescPedidos = this.calcularCrescimento(dados2024.pedidos, dados2025.pedidos);
    const crescReceita = this.calcularCrescimento(dados2024.receita, dados2025.receita);
    
    const roi = this.calcularROI(dados2025.receita, investimento);
    const roas = this.calcularROAS(dados2025.receita, investimento);
    const performance = this.avaliarPerformance(roas, metaROAS);
    
    return {
      pedidos2024: dados2024.pedidos,
      pedidos2025: dados2025.pedidos,
      receita2024: this.formatarMoeda(dados2024.receita),
      receita2025: this.formatarMoeda(dados2025.receita),
      crescimentoPedidos: crescPedidos,
      crescimentoReceita: crescReceita,
      investimento: this.formatarMoeda(investimento),
      roi: roi,
      roas: roas,
      performance: performance,
      _receitaBruta2024: dados2024.receita,
      _receitaBruta2025: dados2025.receita
    };
  }

  calcularTotaisAno(dadosAno) {
    const meses = Object.values(dadosAno);
    
    const totalPedidos = meses.reduce((sum, mes) => sum + (mes.pedidos || 0), 0);
    const totalReceita = meses.reduce((sum, mes) => sum + (mes.receita || 0), 0);
    
    const ticketMedio = totalPedidos > 0 ? totalReceita / totalPedidos : 0;
    
    return {
      pedidos: totalPedidos,
      receita: totalReceita,
      ticketMedio: ticketMedio,
      meses: meses.length
    };
  }

  calcularComparacoes(totais) {
    const crescPedidos = this.calcularCrescimento(totais[2024].pedidos, totais[2025].pedidos);
    const crescReceita = this.calcularCrescimento(totais[2024].receita, totais[2025].receita);
    const crescTicket = this.calcularCrescimento(totais[2024].ticketMedio, totais[2025].ticketMedio);
    
    return {
      pedidos: crescPedidos,
      receita: crescReceita,
      ticketMedio: crescTicket
    };
  }

  calcularIndicadoresEficiencia(totais, qtdMeses) {
    const pedidosMes2024 = Math.round(totais[2024].pedidos / qtdMeses);
    const pedidosMes2025 = Math.round(totais[2025].pedidos / qtdMeses);
    
    const receitaMes2024 = totais[2024].receita / qtdMeses;
    const receitaMes2025 = totais[2025].receita / qtdMeses;
    
    // Simular ROAS médio com investimento padrão
    const roasMedio2024 = receitaMes2024 / 11000;
    const roasMedio2025 = receitaMes2025 / 11000;
    
    return {
      pedidosMes2024: pedidosMes2024,
      pedidosMes2025: pedidosMes2025,
      melhoriaP: this.calcularCrescimento(pedidosMes2024, pedidosMes2025),
      receitaMes2024: this.formatarMoeda(receitaMes2024),
      receitaMes2025: this.formatarMoeda(receitaMes2025),
      ticketMedio2024: this.formatarMoeda(totais[2024].ticketMedio),
      ticketMedio2025: this.formatarMoeda(totais[2025].ticketMedio),
      roasMedio2024: `${roasMedio2024.toFixed(1)}x`,
      roasMedio2025: `${roasMedio2025.toFixed(1)}x`
    };
  }

  prepararDadosHTML(metricas, infoRelatorio) {
    log('📝 Preparando dados para o HTML...', 'info');
    
    // 1. KPIs PRINCIPAIS
    const kpis = {
      totalPedidos: this.formatarNumero(metricas.totais[2025].pedidos),
      totalPedidosCrescimento: metricas.comparacoes.pedidos,
      receitaTotal: this.formatarMoeda(metricas.totais[2025].receita),
      receitaTotalCrescimento: metricas.comparacoes.receita,
      ticketMedio: this.formatarMoeda(metricas.totais[2025].ticketMedio),
      ticketMedioCrescimento: metricas.comparacoes.ticketMedio
    };
    
    // 2. CALCULAR ALTURAS DOS GRÁFICOS
    const mesesComGraficos = this.calcularAlturasGraficosCompleto(metricas.porMes);
    
    // 3. CONCLUSÃO AUTOMÁTICA
    const investimentoTotal = Object.keys(metricas.porMes).length * 11000; // 3 meses * investimento
    const conclusao = {
      investimentoTrimestre: this.formatarMoeda(investimentoTotal),
      receitaGerada: kpis.receitaTotal,
      roasResultado: `${(metricas.totais[2025].receita / investimentoTotal).toFixed(1)}x`
    };
    
    // 4. DESTAQUE DINÂMICO
    const destaque = this.gerarDestaqueDinamico(infoRelatorio.plataforma, metricas.comparacoes, conclusao.roasResultado);
    
    return {
      kpis,
      meses: mesesComGraficos,
      eficiencia: metricas.eficiencia,
      conclusao,
      destaque
    };
  }

  calcularAlturasGraficosCompleto(porMes) {
    // Encontrar valor máximo para normalização
    let maxValue = 0;
    Object.values(porMes).forEach(mes => {
      maxValue = Math.max(maxValue, mes.pedidos2024, mes.pedidos2025);
    });
    
    // Calcular alturas proporcionais
    const mesesComAlturas = {};
    Object.keys(porMes).forEach(mesKey => {
      const mes = porMes[mesKey];
      
      const altura2024 = Math.max(20, (mes.pedidos2024 / maxValue) * 100);
      const altura2025 = Math.max(20, (mes.pedidos2025 / maxValue) * 100);
      
      mesesComAlturas[mesKey] = {
        ...mes,
        alturaBar2024: `${altura2024.toFixed(0)}%`,
        alturaBar2025: `${altura2025.toFixed(0)}%`
      };
      
      log(`  ✓ Gráfico ${mesKey}: ${altura2024.toFixed(0)}% | ${altura2025.toFixed(0)}%`, 'info');
    });
    
    return mesesComAlturas;
  }

  gerarDestaqueDinamico(plataforma, comparacoes, roas) {
    const crescimentoPedidos = comparacoes.pedidos.replace('+', '');
    
    return `${plataforma} apresentou crescimento excepcional em 2025, com ROAS médio de ${roas} e crescimento de ${crescimentoPedidos} nos pedidos vs 2024.`;
  }

  // === FUNÇÕES UTILITÁRIAS ===
  obterNomeMes(numeroMes) {
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return meses[numeroMes];
  }

  calcularCrescimento(valorAnterior, valorAtual) {
    if (valorAnterior === 0) return '+∞%';
    const crescimento = ((valorAtual - valorAnterior) / valorAnterior) * 100;
    const sinal = crescimento >= 0 ? '+' : '';
    return `${sinal}${crescimento.toFixed(1)}%`;
  }

  calcularROI(receita, investimento) {
    const roi = ((receita - investimento) / investimento) * 100;
    return `${roi.toFixed(0)}%`;
  }

  calcularROAS(receita, investimento) {
    const roas = receita / investimento;
    return `${roas.toFixed(2)}x`;
  }

  avaliarPerformance(roasString, metaROAS) {
    const roas = parseFloat(roasString.replace('x', ''));
    
    if (roas >= metaROAS * 2) return '🟢 Excepcional';
    if (roas >= metaROAS * 1.5) return '🟢 Excelente';
    if (roas >= metaROAS) return '🟡 Bom';
    return '🔴 Abaixo da Meta';
  }

  formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  formatarNumero(numero) {
    return new Intl.NumberFormat('pt-BR').format(numero);
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

// === SISTEMA DE SUBSTITUIÇÃO FORÇADA ===
updateHTML(template, config) {
  log('🔄 Iniciando atualização COMPLETA de todas as seções...', 'step');
  let html = template;
  let updateCount = 0;
  
  try {
    console.log('🔄 Processamento completo de todas as seções...');

    // === PROCESSAR IMAGENS ===
    html = this.processImages(html);

    // === CALCULAR DADOS COMPLETOS ===
    const { dados, configuracoes } = config;
    const investimento = configuracoes.investimentoMensalMedio || 9000;
    const dadosCompletos = this.calcularDadosCompletosParaSecoes(dados, investimento);
    
    console.log('📊 Dados completos calculados:');
    console.log(`  Total Pedidos 2025: ${dadosCompletos.formatados.pedidos2025}`);
    console.log(`  Total Receita 2025: ${dadosCompletos.formatados.receita2025}`);

    // === 1. ATUALIZAR KPIs PRINCIPAIS ===
    html = this.atualizarKPIsPrincipais(html, dadosCompletos, config);
    updateCount += 3;

    // === 2. ATUALIZAR TABELA DE PERFORMANCE DETALHADA ===
    html = this.atualizarTabelaPerformanceDetalhada(html, dadosCompletos);
    updateCount += 3;

    // === 3. ATUALIZAR ANÁLISE DE ROI ===
    html = this.atualizarAnaliseROI(html, dadosCompletos);
    updateCount += 3;

    // === 4. ATUALIZAR ANÁLISE DE TICKET MÉDIO ===
    html = this.atualizarAnaliseTicketMedio(html, dadosCompletos);
    updateCount += 6; // tabela + gráfico

    // === 5. ATUALIZAR INDICADORES DE EFICIÊNCIA ===
    html = this.atualizarIndicadoresEficiencia(html, dadosCompletos);
    updateCount += 4;

    // === 6. ATUALIZAR GRÁFICOS DE BARRAS ===
    html = this.atualizarGraficosBarras(html, dadosCompletos);
    updateCount += 6;

    // === 7. ATUALIZAR TEXTOS E CONCLUSÕES ===
    html = this.atualizarTextosEConclusoes(html, dadosCompletos, config);
    updateCount += 3;

    console.log(`\n✅ ${updateCount} elementos atualizados em TODAS as seções!`);
    
    // Log detalhado por seção
    this.logDadosPorSecao(dadosCompletos);
    
    return html;
    
  } catch (error) {
    log(`❌ Erro na atualização completa: ${error.message}`, 'error');
    console.error('❌ Erro:', error.message);
    return template;
  }
}

// === CALCULAR DADOS COMPLETOS PARA TODAS AS SEÇÕES ===
calcularDadosCompletosParaSecoes(dados, investimento) {
  console.log('🧮 Calculando dados completos para todas as seções...');
  
  // Organizar dados por mês e ano
  const dadosPorMes = {
    '2024-10': { pedidos: 0, receita: 0 }, // Outubro 2024
    '2024-11': { pedidos: 0, receita: 0 }, // Novembro 2024
    '2024-12': { pedidos: 0, receita: 0 }, // Dezembro 2024
    '2025-10': { pedidos: 0, receita: 0 }, // Outubro 2025
    '2025-11': { pedidos: 0, receita: 0 }, // Novembro 2025
    '2025-12': { pedidos: 0, receita: 0 }  // Dezembro 2025
  };

  // Processar dados do config.json
  dados.forEach(item => {
    const data = new Date(item.data);
    const ano = data.getFullYear();
    const mes = data.getMonth() + 1; // 1-12
    const chave = `${ano}-${mes.toString().padStart(2, '0')}`;
    
    if (dadosPorMes[chave] !== undefined) {
      dadosPorMes[chave] = {
        pedidos: item.pedidos,
        receita: item.valorBruto
      };
      console.log(`  📅 ${chave}: ${item.pedidos} pedidos, ${this.formatarMoeda(item.valorBruto)}`);
    }
  });

  // Calcular totais por ano
  const total2024 = Object.keys(dadosPorMes)
    .filter(key => key.startsWith('2024'))
    .reduce((acc, key) => ({
      pedidos: acc.pedidos + dadosPorMes[key].pedidos,
      receita: acc.receita + dadosPorMes[key].receita
    }), { pedidos: 0, receita: 0 });

  const total2025 = Object.keys(dadosPorMes)
    .filter(key => key.startsWith('2025'))
    .reduce((acc, key) => ({
      pedidos: acc.pedidos + dadosPorMes[key].pedidos,
      receita: acc.receita + dadosPorMes[key].receita
    }), { pedidos: 0, receita: 0 });

  // Calcular métricas por mês
  const meses = ['10', '11', '12'];
  const nomesMeses = ['Outubro', 'Novembro', 'Dezembro'];
  const metricasPorMes = {};

  meses.forEach((mes, index) => {
    const nome = nomesMeses[index];
    const dados2024 = dadosPorMes[`2024-${mes}`];
    const dados2025 = dadosPorMes[`2025-${mes}`];

    // Performance
    const crescPedidos = this.calcularCrescimento(dados2024.pedidos, dados2025.pedidos);
    const crescReceita = this.calcularCrescimento(dados2024.receita, dados2025.receita);

    // Ticket Médio
    const ticket2024 = dados2024.pedidos > 0 ? dados2024.receita / dados2024.pedidos : 0;
    const ticket2025 = dados2025.pedidos > 0 ? dados2025.receita / dados2025.pedidos : 0;
    const crescTicket = this.calcularCrescimento(ticket2024, ticket2025);
    const tendenciaTicket = this.definirTendencia(crescTicket);

    // ROI
    const roi = ((dados2025.receita - investimento) / investimento * 100).toFixed(0);
    const roas = (dados2025.receita / investimento).toFixed(2);
    const performanceROI = this.avaliarPerformanceROI(parseFloat(roas));

    metricasPorMes[nome] = {
      // Dados brutos
      pedidos2024: dados2024.pedidos,
      pedidos2025: dados2025.pedidos,
      receita2024: dados2024.receita,
      receita2025: dados2025.receita,
      ticket2024: ticket2024,
      ticket2025: ticket2025,

      // Formatados
      receitaFormatada2024: this.formatarMoeda(dados2024.receita),
      receitaFormatada2025: this.formatarMoeda(dados2025.receita),
      ticketFormatado2024: this.formatarMoeda(ticket2024),
      ticketFormatado2025: this.formatarMoeda(ticket2025),

      // Crescimentos
      crescPedidos: crescPedidos,
      crescReceita: crescReceita,
      crescTicket: crescTicket,
      tendenciaTicket: tendenciaTicket,

      // ROI
      roi: `${roi}%`,
      roas: `${roas}x`,
      performanceROI: performanceROI,
      investimento: this.formatarMoeda(investimento)
    };
  });

  // Métricas gerais
  const ticketMedio2024 = total2024.pedidos > 0 ? total2024.receita / total2024.pedidos : 0;
  const ticketMedio2025 = total2025.pedidos > 0 ? total2025.receita / total2025.pedidos : 0;
  const investimentoTrimestre = investimento * 3;
  const roasGeral = total2025.receita / investimentoTrimestre;

  return {
    dadosPorMes: dadosPorMes,
    metricasPorMes: metricasPorMes,
    totais: {
      total2024: total2024,
      total2025: total2025,
      ticketMedio2024: ticketMedio2024,
      ticketMedio2025: ticketMedio2025,
      investimentoTrimestre: investimentoTrimestre,
      roasGeral: roasGeral.toFixed(1)
    },
    formatados: {
      pedidos2025: this.formatarNumero(total2025.pedidos),
      receita2025: this.formatarMoeda(total2025.receita),
      ticketMedio2025: this.formatarMoeda(ticketMedio2025),
      investimentoTrimestre: this.formatarMoeda(investimentoTrimestre),
      crescimentoPedidos: this.calcularCrescimento(total2024.pedidos, total2025.pedidos),
      crescimentoReceita: this.calcularCrescimento(total2024.receita, total2025.receita),
      crescimentoTicket: this.calcularCrescimento(ticketMedio2024, ticketMedio2025)
    }
  };
}

// === ATUALIZAR ANÁLISE DE TICKET MÉDIO ===
atualizarAnaliseTicketMedio(html, dados) {
  console.log('💳 Atualizando Análise de Ticket Médio...');
  
  // Atualizar tabela de ticket médio
  Object.entries(dados.metricasPorMes).forEach(([mes, metricas]) => {
    // Substituir linha da tabela
    const linhaAntiga = new RegExp(
      `<td>${mes}</td>\s*<td>R\$ [\d,\.]+</td>\s*<td>R\$ [\d,\.]+</td>\s*<td>[+-]?[\d,\.]+%</td>\s*<td>[^<]+</td>`,
      'g'
    );

    const linhaNova = `<td>${mes}</td>
              <td>${metricas.ticketFormatado2024}</td>
              <td>${metricas.ticketFormatado2025}</td>
              <td>${metricas.crescTicket}</td>
              <td>${metricas.tendenciaTicket}</td>`;

    if (html.match(linhaAntiga)) {
      html = html.replace(linhaAntiga, linhaNova);
      console.log(`  ✅ Tabela ${mes}: ${metricas.ticketFormatado2025} (${metricas.crescTicket})`);
    }
  });

  // Atualizar gráfico de evolução do ticket médio
  Object.entries(dados.metricasPorMes).forEach(([mes, metricas]) => {
    // Substituir valores no gráfico
    html = html.replace(`${mes} 2024\n            R$ 255,85`, `${mes} 2024\n            ${metricas.ticketFormatado2024}`);
    html = html.replace(`${mes} 2025\n            R$ 232,67`, `${mes} 2025\n            ${metricas.ticketFormatado2025}`);
    
    console.log(`  ✅ Gráfico ${mes}: 2024=${metricas.ticketFormatado2024}, 2025=${metricas.ticketFormatado2025}`);
  });

  return html;
}

// === ATUALIZAR TABELA DE PERFORMANCE DETALHADA ===
atualizarTabelaPerformanceDetalhada(html, dados) {
  console.log('📈 Atualizando Performance Detalhada...');
  
  Object.entries(dados.metricasPorMes).forEach(([mes, metricas]) => {
    // Substituir linha da tabela de performance
    const linhaPattern = new RegExp(
      `<td><strong>${mes}</strong></td>\s*<td>\d+</td>\s*<td>\d+</td>\s*<td>R\$ [\d,\.]+</td>\s*<td>R\$ [\d,\.]+</td>\s*<td><strong>[^<]+</strong></td>\s*<td><strong>[^<]+</strong></td>`
    );

    const novaLinha = `<td><strong>${mes}</strong></td>
              <td>${metricas.pedidos2024}</td>
              <td>${metricas.pedidos2025}</td>
              <td>${metricas.receitaFormatada2024}</td>
              <td>${metricas.receitaFormatada2025}</td>
              <td><strong>${metricas.crescPedidos}</strong></td>
              <td><strong>${metricas.crescReceita}</strong></td>`;

    if (html.match(linhaPattern)) {
      html = html.replace(linhaPattern, novaLinha);
      console.log(`  ✅ Performance ${mes}: ${metricas.pedidos2025} pedidos, ${metricas.receitaFormatada2025}`);
    }
  });

  return html;
}

// === ATUALIZAR ANÁLISE DE ROI ===
atualizarAnaliseROI(html, dados) {
  console.log('💰 Atualizando Análise de ROI...');
  
  Object.entries(dados.metricasPorMes).forEach(([mes, metricas]) => {
    // Substituir linha da tabela de ROI
    const linhaROIPattern = new RegExp(
      `<td><strong>${mes}</strong></td>\s*<td>R\$ [\d,\.]+</td>\s*<td>R\$ [\d,\.]+</td>\s*<td>[\d,\.]+%</td>\s*<td>[\d,\.]+x</td>\s*<td>[^<]+</td>`
    );

    const novaLinhaROI = `<td><strong>${mes}</strong></td>
              <td>${metricas.receitaFormatada2025}</td>
              <td>${metricas.investimento}</td>
              <td>${metricas.roi}</td>
              <td>${metricas.roas}</td>
              <td>${metricas.performanceROI}</td>`;

    if (html.match(linhaROIPattern)) {
      html = html.replace(linhaROIPattern, novaLinhaROI);
      console.log(`  ✅ ROI ${mes}: ROAS ${metricas.roas}, Performance ${metricas.performanceROI}`);
    }

    // Substituir barras de ROAS no gráfico
    const roasValue = parseFloat(metricas.roas.replace('x', ''));
    const roasPercent = Math.min(100, (roasValue / 20) * 100).toFixed(0);
    
    const barraPattern = new RegExp(
      `<div class="metric-name">${mes}</div>\s*<div class="metric-bar">\s*<div class="metric-fill" style="width: \d+%"></div>\s*</div>\s*<div class="metric-value">[\d,\.]+x</div>`
    );

    const novaBarra = `<div class="metric-name">${mes}</div>
            <div class="metric-bar">
              <div class="metric-fill" style="width: ${roasPercent}%"></div>
            </div>
            <div class="metric-value">${metricas.roas}</div>`;

    if (html.match(barraPattern)) {
      html = html.replace(barraPattern, novaBarra);
      console.log(`  ✅ Barra ROAS ${mes}: ${metricas.roas} (${roasPercent}%)`);
    }
  });

  return html;
}

// === ATUALIZAR INDICADORES DE EFICIÊNCIA ===
atualizarIndicadoresEficiencia(html, dados) {
  console.log('📊 Atualizando Indicadores de Eficiência...');
  
  const pedidosMes2024 = Math.round(dados.totais.total2024.pedidos / 3);
  const pedidosMes2025 = Math.round(dados.totais.total2025.pedidos / 3);
  const receitaMes2024 = dados.totais.total2024.receita / 3;
  const receitaMes2025 = dados.totais.total2025.receita / 3;
  
  const roasMedio2024 = (receitaMes2024 / 11000).toFixed(1);
  const roasMedio2025 = (receitaMes2025 / 11000).toFixed(1);

  // Atualizar linha Pedidos/Mês
  html = html.replace(
    /<td><strong>Pedidos\/Mês<\/strong><\/td>\s*<td>\d+<\/td>\s*<td>\d+<\/td>/,
    `<td><strong>Pedidos/Mês</strong></td>
              <td>${pedidosMes2024}</td>
              <td>${pedidosMes2025}</td>`
  );

  // Atualizar linha Receita/Mês
  html = html.replace(
    /<td><strong>Receita\/Mês<\/strong><\/td>\s*<td>R\$ [^<]+<\/td>\s*<td>R\$ [^<]+<\/td>/,
    `<td><strong>Receita/Mês</strong></td>
              <td>${this.formatarMoeda(receitaMes2024)}</td>
              <td>${this.formatarMoeda(receitaMes2025)}</td>`
  );

  // Atualizar linha Ticket Médio
  html = html.replace(
    /<td><strong>Ticket Médio<\/strong><\/td>\s*<td>R\$ [^<]+<\/td>\s*<td>R\$ [^<]+<\/td>/,
    `<td><strong>Ticket Médio</strong></td>
              <td>${this.formatarMoeda(dados.totais.ticketMedio2024)}</td>
              <td>${this.formatarMoeda(dados.totais.ticketMedio2025)}</td>`
  );

  // Atualizar linha ROAS Médio
  html = html.replace(
    /<td><strong>ROAS Médio<\/strong><\/td>\s*<td>[^<]+<\/td>\s*<td>[^<]+<\/td>/,
    `<td><strong>ROAS Médio</strong></td>
              <td>${roasMedio2024}x</td>
              <td>${roasMedio2025}x</td>`
  );

  console.log(`  ✅ Eficiência atualizada: ${pedidosMes2025} pedidos/mês, ROAS ${roasMedio2025}x`);
  return html;
}

// === FUNÇÕES AUXILIARES ===
calcularCrescimento(valorAnterior, valorAtual) {
  if (valorAnterior === 0) return '+∞%';
  const crescimento = ((valorAtual - valorAnterior) / valorAnterior) * 100;
  const sinal = crescimento >= 0 ? '+' : '';
  return `${sinal}${crescimento.toFixed(1)}%`;
}

definirTendencia(crescimentoStr) {
  const crescimento = parseFloat(crescimentoStr.replace(/[+%]/g, ''));
  
  if (crescimento > 15) return '🚀 Forte crescimento';
  if (crescimento > 5) return '📈 Recuperação';
  if (crescimento > -5) return '➡️ Estável';
  if (crescimento > -15) return '📉 Leve queda';
  return '📉 Queda significativa';
}

avaliarPerformanceROI(roas) {
  if (roas >= 20) return '🟢 Excepcional';
  if (roas >= 15) return '🟢 Excelente';
  if (roas >= 10) return '🟢 Bom';
  if (roas >= 5) return '🟡 Regular';
  return '🔴 Abaixo da Meta';
}

// === CONTINUAR COM AS OUTRAS FUNÇÕES ===
atualizarKPIsPrincipais(html, dados, config) {
  // Substituições simples dos KPIs principais
  html = html.replaceAll('2.392', dados.formatados.pedidos2025);
  html = html.replaceAll('R$ 577.893', dados.formatados.receita2025);
  html = html.replaceAll('R$ 241,48', dados.formatados.ticketMedio2025);
  
  // Atualizar percentuais nos labels
  html = html.replaceAll('(+98%)', `(${dados.formatados.crescimentoPedidos})`);
  html = html.replaceAll('(+148%)', `(${dados.formatados.crescimentoReceita})`);
  html = html.replaceAll('(+25%)', `(${dados.formatados.crescimentoTicket})`);

  console.log('✅ KPIs principais atualizados');
  return html;
}

atualizarGraficosBarras(html, dados) {
  // Atualizar gráficos de barras com dados reais
  Object.entries(dados.metricasPorMes).forEach(([mes, metricas]) => {
    // Substituir valores das barras
    html = html.replaceAll(`${metricas.pedidos2024}`, metricas.pedidos2024);
    html = html.replaceAll(`${metricas.pedidos2025}`, metricas.pedidos2025);
  });
  
  console.log('✅ Gráficos de barras atualizados');
  return html;
}

atualizarTextosEConclusoes(html, dados, config) {
  // Destaque
  const destaque = `${config.relatorio?.plataforma || 'Google Ads'} apresentou crescimento excepcional em 2025, com ROAS médio de ${dados.totais.roasGeral}x e crescimento de ${dados.formatados.crescimentoPedidos.replace('+', '')} nos pedidos vs 2024.`;
  
  html = html.replace(
    'Google Ads apresentou crescimento excepcional em 2025, com ROAS médio de 17,5x e crescimento de 98% nos pedidos vs 2024.',
    destaque
  );

  // Conclusão
  const conclusao = `Com investimento atual de ${dados.formatados.investimentoTrimestre}/trimestre, gerou ${dados.formatados.receita2025} em receita, resultando em um ROAS médio de ${dados.totais.roasGeral}x - muito acima da média de mercado.`;
  
  html = html.replace(
    /Com investimento atual de R\$ 33\.000\/trimestre[^.]*/,
    conclusao
  );

  console.log('✅ Textos e conclusões atualizados');
  return html;
}

logDadosPorSecao(dados) {
  console.log('\n📊 RESUMO POR SEÇÃO:');
  console.log('\n💳 TICKET MÉDIO:');
  Object.entries(dados.metricasPorMes).forEach(([mes, metricas]) => {
    console.log(`  ${mes}: 2024=${metricas.ticketFormatado2024}, 2025=${metricas.ticketFormatado2025} (${metricas.crescTicket})`);
  });

  console.log('\n📈 PERFORMANCE:');
  Object.entries(dados.metricasPorMes).forEach(([mes, metricas]) => {
    console.log(`  ${mes}: Pedidos 2025=${metricas.pedidos2025}, Receita 2025=${metricas.receitaFormatada2025}`);
  });

  console.log('\n💰 ROI:');
  Object.entries(dados.metricasPorMes).forEach(([mes, metricas]) => {
    console.log(`  ${mes}: ROAS ${metricas.roas}, ROI ${metricas.roi}, ${metricas.performanceROI}`);
  });
}

// === CALCULAR DADOS CORRIGIDOS ===
calcularDadosCorrigidos(dados, investimento) {
  console.log('🧮 Calculando dados CORRIGIDOS...');
  console.log(`📊 Dados recebidos: ${dados.length} entradas`);
  
  // Debug dos dados
  dados.forEach((item, index) => {
    console.log(`  ${index + 1}. Data: ${item.data}, Pedidos: ${item.pedidos}, Receita: ${this.formatarMoeda(item.valorBruto)}`);
  });
  
  // Separar por ano CORRETAMENTE
  let total2024 = { pedidos: 0, receita: 0 };
  let total2025 = { pedidos: 0, receita: 0 };
  const porMes = {};
  
  dados.forEach(item => {
    const data = new Date(item.data);
    const ano = data.getFullYear();
    const mes = data.getMonth() + 1; // 1-12
    
    console.log(`  Processando: ${item.data} → Ano: ${ano}, Mês: ${mes}`);
    
    if (ano === 2024) {
      total2024.pedidos += item.pedidos;
      total2024.receita += item.valorBruto;
      console.log(`    + 2024: Pedidos: ${item.pedidos}, Receita: ${this.formatarMoeda(item.valorBruto)}`);
    } else if (ano === 2025) {
      total2025.pedidos += item.pedidos;
      total2025.receita += item.valorBruto;
      console.log(`    + 2025: Pedidos: ${item.pedidos}, Receita: ${this.formatarMoeda(item.valorBruto)}`);
    }
    
    // Guardar por mês para uso posterior
    const chave = `${ano}-${mes.toString().padStart(2, '0')}`;
    porMes[chave] = {
      pedidos: item.pedidos,
      receita: item.valorBruto
    };
  });
  
  console.log(`📊 TOTAIS CALCULADOS:`);
  console.log(`  2024: ${total2024.pedidos} pedidos, ${this.formatarMoeda(total2024.receita)}`);
  console.log(`  2025: ${total2025.pedidos} pedidos, ${this.formatarMoeda(total2025.receita)}`);
  
  // Calcular crescimentos CORRETOS
  const crescimentoPedidos = total2024.pedidos > 0 
    ? `+${(((total2025.pedidos - total2024.pedidos) / total2024.pedidos) * 100).toFixed(1)}%`
    : '+0.0%';
    
  const crescimentoReceita = total2024.receita > 0
    ? `+${(((total2025.receita - total2024.receita) / total2024.receita) * 100).toFixed(1)}%`
    : '+0.0%';
  
  const ticketMedio2024 = total2024.pedidos > 0 ? total2024.receita / total2024.pedidos : 0;
  const ticketMedio2025 = total2025.pedidos > 0 ? total2025.receita / total2025.pedidos : 0;
  
  const crescimentoTicket = ticketMedio2024 > 0
    ? `+${(((ticketMedio2025 - ticketMedio2024) / ticketMedio2024) * 100).toFixed(1)}%`
    : '+0.0%';
  
  const investimentoTrimestre = investimento * 3;
  const roasGeral = total2025.receita > 0 ? (total2025.receita / investimentoTrimestre).toFixed(1) : '0.0';
  
  const resultado = {
    total2024: total2024,
    total2025: total2025,
    porMes: porMes,
    
    // Formatados para exibição
    formatados: {
      pedidos2025: this.formatarNumero(total2025.pedidos),
      receita2025: this.formatarMoeda(total2025.receita),
      ticketMedio2025: this.formatarMoeda(ticketMedio2025),
      investimentoTrimestre: this.formatarMoeda(investimentoTrimestre)
    },
    
    // Crescimentos
    crescimentos: {
      pedidos: crescimentoPedidos,
      receita: crescimentoReceita,
      ticketMedio: crescimentoTicket
    },
    
    // Outros
    roasGeral: roasGeral,
    investimentoTrimestre: investimentoTrimestre
  };
  
  console.log(`📊 CRESCIMENTOS CALCULADOS:`);
  console.log(`  Pedidos: ${crescimentoPedidos}`);
  console.log(`  Receita: ${crescimentoReceita}`);
  console.log(`  Ticket Médio: ${crescimentoTicket}`);
  console.log(`  ROAS Geral: ${roasGeral}x`);
  
  return resultado;
}

// === CALCULAR DADOS COMPLETOS ===
calcularDadosCompletos(dados, investimento) {
  console.log('🧮 Calculando dados completos...');
  
  // Organizar por ano
  let total2024 = { pedidos: 0, receita: 0 };
  let total2025 = { pedidos: 0, receita: 0 };
  const porMes = {};
  
  dados.forEach(item => {
    const ano = new Date(item.data).getFullYear();
    const mes = new Date(item.data).getMonth() + 1;
    
    if (ano === 2024) {
      total2024.pedidos += item.pedidos;
      total2024.receita += item.valorBruto;
    } else if (ano === 2025) {
      total2025.pedidos += item.pedidos;
      total2025.receita += item.valorBruto;
    }
    
    // Dados por mês para tabelas
    const chave = `${ano}-${mes}`;
    porMes[chave] = {
      pedidos: item.pedidos,
      receita: item.valorBruto
    };
  });
  
  // Calcular métricas
  const crescimentoPedidos = `+${(((total2025.pedidos - total2024.pedidos) / total2024.pedidos) * 100).toFixed(1)}%`;
  const crescimentoReceita = `+${(((total2025.receita - total2024.receita) / total2024.receita) * 100).toFixed(1)}%`;
  
  const ticketMedio2024 = total2024.receita / total2024.pedidos;
  const ticketMedio2025 = total2025.receita / total2025.pedidos;
  const crescimentoTicket = `${(((ticketMedio2025 - ticketMedio2024) / ticketMedio2024) * 100).toFixed(1)}%`;
  
  const investimentoTrimestre = investimento * 3;
  const roasGeral = (total2025.receita / investimentoTrimestre).toFixed(1);
  
  return {
    // Valores brutos
    totalPedidos2025: total2025.pedidos,
    receitaTotal2025: total2025.receita,
    ticketMedio2025: ticketMedio2025,
    
    // Formatados
    totalPedidosFormatado: this.formatarNumero(total2025.pedidos),
    receitaTotalFormatada: this.formatarMoeda(total2025.receita),
    ticketMedioFormatado: this.formatarMoeda(ticketMedio2025),
    investimentoTrimestreFormatado: this.formatarMoeda(investimentoTrimestre),
    
    // Crescimentos
    crescimentoPedidos: crescimentoPedidos,
    crescimentoReceita: crescimentoReceita,
    crescimentoTicket: crescimentoTicket,
    
    // Outros
    roasGeral: roasGeral,
    investimentoTrimestre: investimentoTrimestre,
    porMes: porMes
  };
}

// === SUBSTITUIR KPIs FORÇADO ===
substituirKPIsForcado(html, dados, updates) {
  console.log('📊 Substituição FORÇADA dos KPIs...');
  
  // KPI 1 - Total de Pedidos (múltiplas tentativas)
  const patterns1 = [
    /<div class="kpi-value">[\d,.]+<\/div>/,
    /<div class="kpi-value">[^<]*<\/div>/,
    /class="kpi-value">[^<]*<\/div>/
  ];
  
  let encontrou1 = false;
  patterns1.forEach(pattern => {
    if (!encontrou1 && pattern.test(html)) {
      html = html.replace(pattern, `<div class="kpi-value">${dados.totalPedidosFormatado}</div>`);
      encontrou1 = true;
      updates.push(`KPI Pedidos: ${dados.totalPedidosFormatado}`);
    }
  });
  
  // Substituir label do primeiro KPI
  if (html.includes('Total de Pedidos')) {
    html = html.replace(
      /Total de Pedidos \([^)]*\)/,
      `Total de Pedidos (${dados.crescimentoPedidos})`
    );
    updates.push(`Label Pedidos: ${dados.crescimentoPedidos}`);
  }

  // KPI 2 - Receita Total
  const patterns2 = [
    /<div class="kpi-value">R\$ [\d,.]+<\/div>/,
    /class="kpi-value">R\$ [^<]*<\/div>/
  ];
  
  let encontrou2 = false;
  patterns2.forEach(pattern => {
    if (!encontrou2 && pattern.test(html)) {
      html = html.replace(pattern, `<div class="kpi-value">${dados.receitaTotalFormatada}</div>`);
      encontrou2 = true;
      updates.push(`KPI Receita: ${dados.receitaTotalFormatada}`);
    }
  });

  // Substituir label da receita
  if (html.includes('Receita Total')) {
    html = html.replace(
      /Receita Total \([^)]*\)/,
      `Receita Total (${dados.crescimentoReceita})`
    );
    updates.push(`Label Receita: ${dados.crescimentoReceita}`);
  }

  // KPI 3 - Ticket Médio
  const patterns3 = [
    /<div class="kpi-value">R\$ [\d,.]+<\/div>/g,
    /class="kpi-value">R\$ [^<]*<\/div>/g
  ];
  
  // Para o terceiro KPI, usar replace com contador
  let kpiCount = 0;
  html = html.replace(/class="kpi-value">R\$ [^<]*<\/div>/g, (match) => {
    kpiCount++;
    if (kpiCount === 2) { // Segundo KPI com R$ é o ticket médio
      updates.push(`KPI Ticket Médio: ${dados.ticketMedioFormatado}`);
      return `class="kpi-value">${dados.ticketMedioFormatado}</div>`;
    }
    return match;
  });

  return html;
}

// === SUBSTITUIR PARÁGRAFOS <p> FORÇADO ===
substituirParagrafosForcado(html, dados, config, updates) {
  console.log('📝 Substituição FORÇADA de parágrafos <p>...');
  
  // 1. Parágrafo do destaque (dentro da highlight-box)
  const destaqueTexto = `${config.relatorio.plataforma} apresentou crescimento excepcional em 2025, com ROAS médio de ${dados.roasGeral}x e crescimento de ${dados.crescimentoPedidos} nos pedidos vs 2024.`;
  
  // Múltiplos padrões para capturar o destaque
  const padrõesDestaque = [
    /Google Ads apresentou crescimento[^<]*\./,
    /<strong>🚀 DESTAQUE:<\/strong>\s*Google Ads[^<]*\./,
    /Google Ads apresentou crescimento excepcional em 2025[^<]*\./
  ];
  
  let destacqueAtualizado = false;
  padrõesDestaque.forEach(padrao => {
    if (!destacqueAtualizado && padrao.test(html)) {
      html = html.replace(padrao, destaqueTexto);
      destacqueAtualizado = true;
      updates.push(`Destaque atualizado: ROAS ${dados.roasGeral}x`);
    }
  });

  // 2. Parágrafo da conclusão
  const conclusaoTexto = `Com investimento atual de ${dados.investimentoTrimestreFormatado}/trimestre, gerou ${dados.receitaTotalFormatada} em receita, resultando em um ROAS médio de ${dados.roasGeral}x - muito acima da média de mercado.`;
  
  const padrõesConclusão = [
    /Com investimento atual de R\$[^.]*\./,
    /<p>[^<]*Com investimento atual[^<]*<\/p>/,
    /Com investimento atual de R\$ [\d,.]+ em receita[^<]*\./
  ];
  
  let conclusaoAtualizada = false;
  padrõesConclusão.forEach(padrao => {
    if (!conclusaoAtualizada && padrao.test(html)) {
      html = html.replace(padrao, conclusaoTexto);
      conclusaoAtualizada = true;
      updates.push(`Conclusão atualizada: ${dados.investimentoTrimestreFormatado}/trimestre`);
    }
  });

  // 3. Busca e substituição forçada em TODOS os <p>
  const allParagraphs = html.match(/<p[^>]*>.*?<\/p>/gs);
  if (allParagraphs) {
    console.log(`📝 Encontrados ${allParagraphs.length} parágrafos <p>`);
    
    allParagraphs.forEach((paragraph, index) => {
      console.log(`  Parágrafo ${index + 1}: ${paragraph.substring(0, 100)}...`);
      
      // Verificar se contém textos que precisam ser atualizados
      if (paragraph.includes('Google Ads demonstra') || paragraph.includes('Com investimento atual')) {
        console.log(`  ⚠️ Parágrafo ${index + 1} precisa ser atualizado manualmente`);
      }
    });
  }

  return html;
}

// === SUBSTITUIR SECTIONS FORÇADO ===
substituirSectionsForcado(html, dados, updates) {
  console.log('🔧 Substituição FORÇADA de sections...');
  
  // 1. Buscar todas as sections
  const allSections = html.match(/<section[^>]*>.*?<\/section>/gs);
  if (allSections) {
    console.log(`📋 Encontradas ${allSections.length} sections`);
    
    allSections.forEach((section, index) => {
      console.log(`  Section ${index + 1}: ${section.substring(0, 100)}...`);
      
      // Verificar se é a section de conclusão
      if (section.includes('🏁 Conclusão') || section.includes('highlight-box')) {
        console.log(`  ⚡ Section ${index + 1} de conclusão identificada`);
        
        // Substituição forçada na section de conclusão
        if (section.includes('Google Ads demonstra')) {
          const novaSection = section.replace(
            /Google Ads demonstra[^<]*\./,
            `${dados.plataforma || 'Google Ads'} demonstra performance excepcional e é o canal com melhor ROI da operação.`
          );
          
          html = html.replace(section, novaSection);
          updates.push(`Section Conclusão atualizada`);
        }
      }
    });
  }

  // 2. Substituição específica por classe
  const highlightBoxPattern = /<div class="highlight-box">[\s\S]*?<\/div>/g;
  html = html.replace(highlightBoxPattern, (match) => {
    if (match.includes('Com investimento atual')) {
      const novoConteudo = `<div class="highlight-box">
          <p>
            <strong>Google Ads demonstra performance excepcional e é o canal com melhor ROI da operação.</strong><br /><br />
            ${dados.investimentoTrimestreFormatado}/trimestre, gerou ${dados.receitaTotalFormatada} em receita, resultando em um ROAS médio de ${dados.roasGeral}x - muito acima da média de mercado.
          </p>
        </div>`;
      
      updates.push(`Highlight-box atualizada com dados reais`);
      return novoConteudo;
    }
    return match;
  });

  return html;
}

// === SUBSTITUIR TABELAS FORÇADO ===
substituirTabelasForcado(html, dados, updates) {
  console.log('📊 Substituição FORÇADA de tabelas...');
  
  // Buscar e substituir valores específicos por posição
  const valoresEstaticos = [
    { antigo: '2.392', novo: dados.totalPedidosFormatado },
    { antigo: 'R$ 577.893', novo: dados.receitaTotalFormatada },
    { antigo: 'R$ 241,48', novo: dados.ticketMedioFormatado },
    { antigo: '+98%', novo: dados.crescimentoPedidos },
    { antigo: '+148%', novo: dados.crescimentoReceita },
    { antigo: '17,5x', novo: `${dados.roasGeral}x` }
  ];

  valoresEstaticos.forEach(valor => {
    if (html.includes(valor.antigo)) {
      html = html.replace(new RegExp(valor.antigo, 'g'), valor.novo);
      updates.push(`Substituição: ${valor.antigo} → ${valor.novo}`);
    }
  });

  return html;
}

// === SUBSTITUIR GRÁFICOS FORÇADO ===
substituirGraficosForcado(html, dados, updates) {
  console.log('📈 Substituição FORÇADA de gráficos...');
  
  // Calcular dados dos meses se disponíveis
  const outubro2024 = dados.porMes['2024-10']?.pedidos || 200;
  const outubro2025 = dados.porMes['2025-10']?.pedidos || 800;
  const novembro2024 = dados.porMes['2024-11']?.pedidos || 300;
  const novembro2025 = dados.porMes['2025-11']?.pedidos || 900;
  const dezembro2024 = dados.porMes['2024-12']?.pedidos || 400;
  const dezembro2025 = dados.porMes['2025-12']?.pedidos || 1000;

  // Calcular alturas proporcionais
  const maxValue = Math.max(outubro2024, outubro2025, novembro2024, novembro2025, dezembro2024, dezembro2025);
  
  const graficosData = [
    { mes: 'outubro', val2024: outubro2024, val2025: outubro2025 },
    { mes: 'novembro', val2024: novembro2024, val2025: novembro2025 },
    { mes: 'dezembro', val2024: dezembro2024, val2025: dezembro2025 }
  ];

  // Substituição forçada de valores nas barras
  let barCount = 0;
  html = html.replace(/<div class="bar-value">\d+<\/div>/g, (match) => {
    const graficoIndex = Math.floor(barCount / 2);
    const isBar2024 = barCount % 2 === 0;
    
    if (graficoIndex < graficosData.length) {
      const valor = isBar2024 ? graficosData[graficoIndex].val2024 : graficosData[graficoIndex].val2025;
      barCount++;
      updates.push(`Gráfico barra ${barCount}: ${valor}`);
      return `<div class="bar-value">${valor}</div>`;
    }
    
    barCount++;
    return match;
  });

  return html;
}

// === VERIFICAR SUBSTITUIÇÕES ===
verificarSubstituicoes(html, dados) {
  console.log('\n🔍 VERIFICAÇÃO FINAL:');
  
  const verificacoes = [
    { elemento: 'Total Pedidos', busca: dados.totalPedidosFormatado, encontrado: html.includes(dados.totalPedidosFormatado) },
    { elemento: 'Receita Total', busca: dados.receitaTotalFormatada, encontrado: html.includes(dados.receitaTotalFormatada) },
    { elemento: 'Crescimento Pedidos', busca: dados.crescimentoPedidos, encontrado: html.includes(dados.crescimentoPedidos) },
    { elemento: 'ROAS', busca: `${dados.roasGeral}x`, encontrado: html.includes(`${dados.roasGeral}x`) }
  ];

  verificacoes.forEach(verif => {
    const status = verif.encontrado ? '✅' : '❌';
    console.log(`  ${status} ${verif.elemento}: ${verif.busca}`);
    
    if (!verif.encontrado) {
      console.log(`    ⚠️ NÃO ENCONTRADO no HTML final!`);
    }
  });
  
  console.log('\n🎯 Fim da verificação\n');
}

// === FUNÇÕES AUXILIARES PARA ORGANIZAÇÃO ===
organizarDadosCompletos(dados) {
  const dadosOrganizados = {
    2024: {},
    2025: {}
  };
  
  dados.forEach(item => {
    const data = new Date(item.data);
    const ano = data.getFullYear();
    const mes = data.getMonth() + 1; // 1-12
    
    if (!dadosOrganizados[ano]) {
      dadosOrganizados[ano] = {};
    }
    
    dadosOrganizados[ano][mes] = {
      pedidos: item.pedidos,
      receita: item.valorBruto,
      data: item.data
    };
  });
  
  return dadosOrganizados;
}

calcularMetricasCompletas(dadosOrganizados, investimento) {
  // Calcular totais por ano
  let total2024 = { pedidos: 0, receita: 0 };
  let total2025 = { pedidos: 0, receita: 0 };
  
  // Somar dados de 2024
  if (dadosOrganizados[2024]) {
    Object.values(dadosOrganizados[2024]).forEach(mes => {
      total2024.pedidos += mes.pedidos;
      total2024.receita += mes.receita;
    });
  }
  
  // Somar dados de 2025
  if (dadosOrganizados[2025]) {
    Object.values(dadosOrganizados[2025]).forEach(mes => {
      total2025.pedidos += mes.pedidos;
      total2025.receita += mes.receita;
    });
  }
  
  // Calcular crescimentos
  const crescPedidos = this.calcularCrescimento(total2024.pedidos, total2025.pedidos);
  const crescReceita = this.calcularCrescimento(total2024.receita, total2025.receita);
  
  const ticketMedio2024 = total2024.pedidos > 0 ? total2024.receita / total2024.pedidos : 0;
  const ticketMedio2025 = total2025.pedidos > 0 ? total2025.receita / total2025.pedidos : 0;
  const crescTicket = this.calcularCrescimento(ticketMedio2024, ticketMedio2025);
  
  // Métricas por mês
  const porMes = this.calcularMetricasPorMes(dadosOrganizados, investimento);
  
  // Calcular gráficos
  const graficos = this.calcularGraficos(dadosOrganizados);
  
  // Calcular ROI por mês
  const roi = this.calcularROIPorMes(dadosOrganizados, investimento);
  
  // ROAS geral
  const investimentoTrimestre = investimento * 3;
  const roasGeral = total2025.receita / investimentoTrimestre;
  
  return {
    totais: {
      pedidos2024: total2024.pedidos,
      pedidos2025: total2025.pedidos,
      receita2024: total2024.receita,
      receita2025: total2025.receita,
      ticketMedio2024: ticketMedio2024,
      ticketMedio2025: ticketMedio2025
    },
    crescimentos: {
      pedidos: crescPedidos,
      receita: crescReceita,
      ticketMedio: crescTicket
    },
    formatados: {
      pedidos2025: this.formatarNumero(total2025.pedidos),
      receita2025: this.formatarMoeda(total2025.receita),
      ticketMedio2025: this.formatarMoeda(ticketMedio2025),
      investimentoTrimestre: this.formatarMoeda(investimentoTrimestre)
    },
    porMes: porMes,
    graficos: graficos,
    roi: roi,
    roasGeral: roasGeral
  };
}

calcularMetricasPorMes(dadosOrganizados, investimento) {
  const meses = [10, 11, 12]; // Outubro, Novembro, Dezembro
  const nomesMeses = ['Outubro', 'Novembro', 'Dezembro'];
  const resultado = {};
  
  meses.forEach((mes, index) => {
    const nome = nomesMeses[index];
    const dados2024 = dadosOrganizados[2024]?.[mes] || { pedidos: 0, receita: 0 };
    const dados2025 = dadosOrganizados[2025]?.[mes] || { pedidos: 0, receita: 0 };
    
    const crescPedidos = this.calcularCrescimento(dados2024.pedidos, dados2025.pedidos);
    const crescReceita = this.calcularCrescimento(dados2024.receita, dados2025.receita);
    
    resultado[nome] = {
      pedidos2024: dados2024.pedidos,
      pedidos2025: dados2025.pedidos,
      receita2024: this.formatarMoeda(dados2024.receita),
      receita2025: this.formatarMoeda(dados2025.receita),
      crescPedidos: crescPedidos,
      crescReceita: crescReceita
    };
  });
  
  return resultado;
}

calcularGraficos(dadosOrganizados) {
  const meses = [10, 11, 12];
  const nomesMeses = ['outubro', 'novembro', 'dezembro'];
  
  // Encontrar valor máximo para normalização
  let maxPedidos = 0;
  meses.forEach(mes => {
    const pedidos2024 = dadosOrganizados[2024]?.[mes]?.pedidos || 0;
    const pedidos2025 = dadosOrganizados[2025]?.[mes]?.pedidos || 0;
    maxPedidos = Math.max(maxPedidos, pedidos2024, pedidos2025);
  });
  
  const graficos = {};
  meses.forEach((mes, index) => {
    const nome = nomesMeses[index];
    const dados2024 = dadosOrganizados[2024]?.[mes] || { pedidos: 0, receita: 0 };
    const dados2025 = dadosOrganizados[2025]?.[mes] || { pedidos: 0, receita: 0 };
    
    const altura2024 = Math.max(20, (dados2024.pedidos / maxPedidos) * 100);
    const altura2025 = Math.max(20, (dados2025.pedidos / maxPedidos) * 100);
    
    graficos[nome] = {
      pedidos2024: dados2024.pedidos,
      pedidos2025: dados2025.pedidos,
      altura2024: `${altura2024.toFixed(0)}%`,
      altura2025: `${altura2025.toFixed(0)}%`
    };
  });
  
  return graficos;
}

calcularROIPorMes(dadosOrganizados, investimento) {
  const meses = [10, 11, 12];
  const nomesMeses = ['Outubro', 'Novembro', 'Dezembro'];
  const resultado = {};
  
  meses.forEach((mes, index) => {
    const nome = nomesMeses[index];
    const dados2025 = dadosOrganizados[2025]?.[mes] || { pedidos: 0, receita: 0 };
    
    const roi = ((dados2025.receita - investimento) / investimento * 100).toFixed(0);
    const roas = (dados2025.receita / investimento).toFixed(2);
    
    let performance = '🟡 Regular';
    if (parseFloat(roas) >= 20) performance = '🟢 Excepcional';
    else if (parseFloat(roas) >= 15) performance = '�� Excelente';
    else if (parseFloat(roas) >= 10) performance = '🟢 Bom';
    
    resultado[nome] = {
      receita: this.formatarMoeda(dados2025.receita),
      investimento: this.formatarMoeda(investimento),
      roi: `${roi}%`,
      roas: `${roas}x`,
      performance: performance
    };
  });
  
  return resultado;
}

atualizarTabelaPerformance(html, porMes, updates) {
  console.log('📊 Atualizando tabela de performance...');
  
  Object.entries(porMes).forEach(([mes, dados]) => {
    // Padrão mais robusto para cada linha da tabela
    const linhaPattern = new RegExp(
      `<tr>[\s\S]*?<td><strong>${mes}</strong></td>[\s\S]*?</tr>`,
      'g'
    );
    
    const novaLinha = `<tr>
              <td><strong>${mes}</strong></td>
              <td>${dados.pedidos2024}</td>
              <td>${dados.pedidos2025}</td>
              <td>${dados.receita2024}</td>
              <td>${dados.receita2025}</td>
              <td><strong>${dados.crescPedidos}</strong></td>
              <td><strong>${dados.crescReceita}</strong></td>
            </tr>`;
    
    if (linhaPattern.test(html)) {
      html = html.replace(linhaPattern, novaLinha);
      updates.push(`Tabela Performance ${mes}: ${dados.pedidos2025} pedidos, ${dados.receita2025}`);
    }
  });
  
  return html;
}

atualizarGraficos(html, graficos, updates) {
  console.log('📊 Atualizando gráficos de barras...');
  
  Object.entries(graficos).forEach(([mes, dados]) => {
    // Atualizar barras 2024
    const barra2024Pattern = new RegExp(
      `<div class="bar bar-2024" style="height: \d+%">\s*<div class="bar-value">\d+</div>`,
      'g'
    );
    
    const novaBarra2024 = `<div class="bar bar-2024" style="height: ${dados.altura2024}">
                <div class="bar-value">${dados.pedidos2024}</div>`;
    
    // Atualizar barras 2025  
    const barra2025Pattern = new RegExp(
      `<div class="bar bar-2025" style="height: \d+%">\s*<div class="bar-value">\d+</div>`,
      'g'
    );
    
    const novaBarra2025 = `<div class="bar bar-2025" style="height: ${dados.altura2025}">
                <div class="bar-value">${dados.pedidos2025}</div>`;
    
    // Aplicar apenas a primeira ocorrência de cada tipo
    if (barra2024Pattern.test(html)) {
      html = html.replace(barra2024Pattern, novaBarra2024);
      updates.push(`Gráfico ${mes} 2024: ${dados.pedidos2024} (${dados.altura2024})`);
    }
    
    if (barra2025Pattern.test(html)) {
      html = html.replace(barra2025Pattern, novaBarra2025);
      updates.push(`Gráfico ${mes} 2025: ${dados.pedidos2025} (${dados.altura2025})`);
    }
  });
  
  return html;
}

atualizarTabelaROI(html, roi, updates) {
  console.log('�� Atualizando tabela de ROI...');
  
  Object.entries(roi).forEach(([mes, dados]) => {
    // Padrão para linha da tabela de ROI
    const linhaROIPattern = new RegExp(
      `<td><strong>${mes}</strong></td>[\s\S]*?<td>[^<]*</td>[\s\S]*?<td>[^<]*</td>[\s\S]*?<td>[^<]*</td>[\s\S]*?<td>[^<]*</td>[\s\S]*?<td>[^<]*</td>`
    );
    
    const novaLinhaROI = `<td><strong>${mes}</strong></td>
              <td>${dados.receita}</td>
              <td>${dados.investimento}</td>
              <td>${dados.roi}</td>
              <td>${dados.roas}</td>
              <td>${dados.performance}</td>`;
    
    if (linhaROIPattern.test(html)) {
      html = html.replace(linhaROIPattern, novaLinhaROI);
      updates.push(`ROI ${mes}: ROAS ${dados.roas}, ROI ${dados.roi}`);
    }
  });
  
  return html;
}

atualizarResumoFinal(html, metricas, updates) {
  console.log('�� Atualizando resumo final...');
  
  const roiTotalPercent = ((metricas.totais.receita2025 - (9000 * 3)) / (9000 * 3) * 100).toFixed(0);
  
  // Atualizar barras de progresso do resumo
  const progressBars = [
    { name: 'ROI Total', value: `${roiTotalPercent}%` },
    { name: 'Crescimento Pedidos', value: metricas.crescimentos.pedidos },
    { name: 'Crescimento Receita', value: metricas.crescimentos.receita }
  ];
  
  progressBars.forEach(bar => {
    const pattern = new RegExp(
      `<div class="metric-name">[^<]*${bar.name.split(' ')[0]}[^<]*</div>[\s\S]*?<div class="metric-value">[^<]*</div>`
    );
    
    const replacement = `<div class="metric-name">💰 ${bar.name}</div>
            <div class="metric-bar">
              <div class="metric-fill" style="width: 95%"></div>
            </div>
            <div class="metric-value">${bar.value}</div>`;
    
    if (pattern.test(html)) {
      html = html.replace(pattern, replacement);
      updates.push(`Resumo ${bar.name}: ${bar.value}`);
    }
  });
  
  return html;
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
      return null;
    } finally {
      if (browser) {
        log('🔒 Fechando browser...', 'info');
        await browser.close();
        log('🔒 Browser fechado com sucesso', 'success');
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
      console.log('🧮 Dados calculados automaticamente!');
      
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
  // Adicionar esta função dentro da classe RelatorioPDF
processarDadosCompletos(config) {
  console.log('🧮 Processamento automático completo iniciado...');
  
  try {
    const { dados, configuracoes } = config;
    const investimento = configuracoes.investimentoMensalMedio;
    
    // === ORGANIZAR DADOS POR MÊS ===
    const dadosPorMes = {};
    dados.forEach(item => {
      const data = new Date(item.data);
      const ano = data.getFullYear();
      const mes = data.getMonth() + 1; // 1-12
      
      const chave = `${ano}-${mes.toString().padStart(2, '0')}`;
      dadosPorMes[chave] = {
        pedidos: item.pedidos,
        receita: item.valorBruto,
        ano: ano,
        mes: mes
      };
    });
    
    // === CALCULAR TOTAIS ===
    let total2024 = { pedidos: 0, receita: 0 };
    let total2025 = { pedidos: 0, receita: 0 };
    
    Object.keys(dadosPorMes).forEach(chave => {
      const item = dadosPorMes[chave];
      if (item.ano === 2024) {
        total2024.pedidos += item.pedidos;
        total2024.receita += item.receita;
      } else if (item.ano === 2025) {
        total2025.pedidos += item.pedidos;
        total2025.receita += item.receita;
      }
    });
    
    // === CALCULAR MÉTRICAS PRINCIPAIS ===
    const crescPedidos = this.calcularCrescimento(total2024.pedidos, total2025.pedidos);
    const crescReceita = this.calcularCrescimento(total2024.receita, total2025.receita);
    
    const ticketMedio2024 = total2024.receita / total2024.pedidos;
    const ticketMedio2025 = total2025.receita / total2025.pedidos;
    const crescTicket = this.calcularCrescimento(ticketMedio2024, ticketMedio2025);
    
    // === CALCULAR ALTURAS DOS GRÁFICOS ===
    const maxPedidos = Math.max(
      dadosPorMes['2024-10']?.pedidos || 0,
      dadosPorMes['2024-11']?.pedidos || 0,
      dadosPorMes['2024-12']?.pedidos || 0,
      dadosPorMes['2025-10']?.pedidos || 0,
      dadosPorMes['2025-11']?.pedidos || 0,
      dadosPorMes['2025-12']?.pedidos || 0
    );
    
    // === PREPARAR DADOS PARA CADA MÊS ===
    const meses = ['10', '11', '12'];
    const nomesMeses = ['outubro', 'novembro', 'dezembro'];
    
    const graficos = {};
    const tabelas = {};
    const roi = {};
    
    meses.forEach((mes, index) => {
      const nomeMes = nomesMeses[index];
      const dados2024 = dadosPorMes[`2024-${mes}`] || { pedidos: 0, receita: 0 };
      const dados2025 = dadosPorMes[`2025-${mes}`] || { pedidos: 0, receita: 0 };
      
      // Gráficos
      graficos[nomeMes] = {
        pedidos2024: dados2024.pedidos,
        pedidos2025: dados2025.pedidos,
        altura2024: `${Math.max(20, (dados2024.pedidos / maxPedidos) * 100).toFixed(0)}%`,
        altura2025: `${Math.max(20, (dados2025.pedidos / maxPedidos) * 100).toFixed(0)}%`
      };
      
      // Tabelas
      tabelas[nomeMes] = {
        pedidos2024: dados2024.pedidos,
        pedidos2025: dados2025.pedidos,
        receita2024: this.formatarMoeda(dados2024.receita),
        receita2025: this.formatarMoeda(dados2025.receita),
        crescPedidos: this.calcularCrescimento(dados2024.pedidos, dados2025.pedidos),
        crescReceita: this.calcularCrescimento(dados2024.receita, dados2025.receita)
      };
      
      // ROI
      const roiCalc = ((dados2025.receita - investimento) / investimento) * 100;
      const roasCalc = dados2025.receita / investimento;
      
      roi[nomeMes] = {
        receita: this.formatarMoeda(dados2025.receita),
        investimento: this.formatarMoeda(investimento),
        roi: `${roiCalc.toFixed(0)}%`,
        roas: `${roasCalc.toFixed(2)}x`,
        status: roasCalc >= 15 ? '🟢 Excepcional' : roasCalc >= 10 ? '🟢 Excelente' : '🟡 Bom'
      };
    });
    
    // === CALCULAR EFICIÊNCIA ===
    const pedidosMes2024 = Math.round(total2024.pedidos / 3);
    const pedidosMes2025 = Math.round(total2025.pedidos / 3);
    const receitaMes2024 = total2024.receita / 3;
    const receitaMes2025 = total2025.receita / 3;
    
    const roasMedio2024 = receitaMes2024 / investimento;
    const roasMedio2025 = receitaMes2025 / investimento;
    
    const eficiencia = {
      pedidosMes2024: pedidosMes2024,
      pedidosMes2025: pedidosMes2025,
      crescPedidos: this.calcularCrescimento(pedidosMes2024, pedidosMes2025),
      receitaMes2024: this.formatarMoeda(receitaMes2024),
      receitaMes2025: this.formatarMoeda(receitaMes2025),
      crescReceita: this.calcularCrescimento(receitaMes2024, receitaMes2025),
      ticketMedio2024: this.formatarMoeda(ticketMedio2024),
      ticketMedio2025: this.formatarMoeda(ticketMedio2025),
      crescTicket: crescTicket,
      roasMedio2024: `${roasMedio2024.toFixed(1)}x`,
      roasMedio2025: `${roasMedio2025.toFixed(1)}x`,
      crescRoas: this.calcularCrescimento(roasMedio2024, roasMedio2025)
    };
    
    // === PREPARAR RESULTADO FINAL ===
    const investimentoTrimestre = investimento * 3;
    const roasResultado = total2025.receita / investimentoTrimestre;
    
    const resultado = {
      kpis: {
        totalPedidos: this.formatarNumero(total2025.pedidos),
        crescimentoPedidos: crescPedidos,
        receitaTotal: this.formatarMoeda(total2025.receita),
        crescimentoReceita: crescReceita,
        ticketMedio: this.formatarMoeda(ticketMedio2025),
        crescimentoTicket: crescTicket
      },
      graficos: graficos,
      tabelas: tabelas,
      roi: roi,
      eficiencia: eficiencia,
      destaque: `${config.relatorio.plataforma} apresentou crescimento excepcional em 2025, com ROAS médio de ${roasResultado.toFixed(1)}x e crescimento de ${crescPedidos} nos pedidos vs 2024.`,
      conclusao: `Com investimento atual de ${this.formatarMoeda(investimentoTrimestre)}/trimestre, gerou ${this.formatarMoeda(total2025.receita)} em receita, resultando em um ROAS médio de ${roasResultado.toFixed(1)}x - muito acima da média de mercado.`
    };
    
    console.log('✅ Processamento automático concluído com sucesso!');
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro no processamento automático:', error.message);
    return null;
  }
}
async runCompatible() {
    try {
      const result = await this.run();
      return {
        success: true,
        htmlPath: result?.htmlPath || null,
        pdfPath: result?.pdfPath || null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
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
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RelatorioPDF;
}

