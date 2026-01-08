const fs = require('fs-extra');
const path = require('path');
const Logger = require('../utils/Logger');

class HTMLGenerator {
  constructor(templatesDir = './templates') {
    this.templatesDir = path.resolve(templatesDir);
    this.outputDir = path.resolve('./output');
    this.logger = new Logger('HTMLGenerator');
  }

  async generate(templateData) {
    try {
      this.logger.info('🎨 Iniciando geração de HTML...');

      // Carregar template e CSS
      const template = await this.loadTemplate();
      const css = await this.loadCSS();

      // Processar template com dados
      let html = await this.processTemplate(template, templateData);

      // Processar imagens para Base64
      html = await this.processImages(html);

      // Incorporar CSS
      if (css) {
        html = this.incorporateCSS(html, css);
      }

      // Salvar HTML
      const htmlPath = await this.saveHTML(html);

      this.logger.success(`✅ HTML gerado: ${path.basename(htmlPath)}`);
      return htmlPath;

    } catch (error) {
      this.logger.error(`❌ Erro na geração de HTML: ${error.message}`);
      throw error;
    }
  }

  async loadTemplate() {
    const templatePath = path.join(this.templatesDir, 'index.html');
    
    if (!await fs.pathExists(templatePath)) {
      throw new Error(`Template não encontrado: ${templatePath}`);
    }

    const template = await fs.readFile(templatePath, 'utf8');
    this.logger.info(`📄 Template carregado: ${templatePath}`);
    
    return template;
  }

  async loadCSS() {
    const cssPath = path.join(this.templatesDir, 'main.css');
    
    if (!await fs.pathExists(cssPath)) {
      this.logger.warn('⚠️ Arquivo CSS não encontrado, continuando sem estilos');
      return '';
    }

    const css = await fs.readFile(cssPath, 'utf8');
    this.logger.info(`🎨 CSS carregado: ${cssPath}`);
    
    return css;
  }

  async processTemplate(template, data) {
    this.logger.info('🔄 Processando template com dados...');
    
    let html = template;
    
    // Aplicar dados básicos do relatório
    if (data.report) {
      html = html.replace(/📊 Relatório Google Ads/g, `📊 ${data.report.titulo || 'Relatório Google Ads'}`);
      html = html.replace(/Janeiro 2026/g, data.report.dataGeracao || 'Janeiro 2026');
      html = html.replace(/2026/g, data.report.periodo || '2026');
    }

    // Aplicar KPIs
    if (data.kpis) {
      html = this.applyKPIs(html, data.kpis);
    }

    // Aplicar dados de gráficos
    if (data.charts) {
      html = this.applyChartData(html, data.charts);
    }

    // Aplicar insights
    if (data.insights) {
      html = this.applyInsights(html, data.insights);
    }

    this.logger.success('✅ Template processado com sucesso');
    return html;
  }

  applyKPIs(html, kpis) {
    // Total de Pedidos
    if (kpis.totalPedidos) {
      html = html.replace(/<div class="kpi-value">2\.392<\/div>/, `<div class="kpi-value">${kpis.totalPedidos}</div>`);
      
      if (kpis.crescimentoPedidos) {
        html = html.replace(/Total de Pedidos \(\+98%\)/, `Total de Pedidos (${kpis.crescimentoPedidos})`);
      }
    }

    // Receita Total
    if (kpis.receitaTotal) {
      html = html.replace(/<div class="kpi-value">R$ 577\.893<\/div>/, `<div class="kpi-value">${kpis.receitaTotal}</div>`);
      
      if (kpis.crescimentoReceita) {
        html = html.replace(/Receita Total \(\+148%\)/, `Receita Total (${kpis.crescimentoReceita})`);
      }
    }

    // Ticket Médio
    if (kpis.ticketMedio) {
      html = html.replace(/<div class="kpi-value">R$ 241,48<\/div>/, `<div class="kpi-value">${kpis.ticketMedio}</div>`);
      
      if (kpis.crescimentoTicket) {
        html = html.replace(/Ticket Médio \(\+25%\)/, `Ticket Médio (${kpis.crescimentoTicket})`);
      }
    }

    return html;
  }

  applyChartData(html, charts) {
    // Aplicar dados dos gráficos de barras
    Object.entries(charts).forEach(([monthKey, data]) => {
      const [year, month] = monthKey.split('-');
      const monthName = this.getMonthName(parseInt(month));
      
      // Localizar e substituir dados de gráfico específicos
      // Esta lógica pode ser expandida conforme necessário
      this.logger.debug(`📊 Aplicando dados do gráfico para ${monthName}/${year}`);
    });

    return html;
  }

  applyInsights(html, insights) {
    if (insights.length > 0) {
      const mainInsight = insights.find(i => i.type === 'success') || insights[0];
      
      if (mainInsight) {
        const insightText = `${mainInsight.title} - ${mainInsight.message}`;
        html = html.replace(
          /Google Ads apresentou crescimento excepcional em 2025[^.]*\./,
          insightText
        );
      }
    }

    return html;
  }

  async processImages(html) {
    this.logger.info('🖼️ Processando imagens para Base64...');
    
    try {
      // Procurar por imagens na pasta img/
      const imgDir = path.resolve('./img');
      
      if (await fs.pathExists(imgDir)) {
        const files = await fs.readdir(imgDir);
        const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp|svg)$/i.test(f));
        
        for (const file of imageFiles) {
          const imagePath = path.join(imgDir, file);
          const base64 = await this.convertImageToBase64(imagePath);
          
          if (base64) {
            // Substituir referências no HTML
            const regex = new RegExp(`src="[^"]*${file.replace(/\./g, '\.')}"`, 'g');
            html = html.replace(regex, `src="${base64}"`);
            
            this.logger.info(`✓ Imagem convertida: ${file}`);
          }
        }
      }

      return html;
    } catch (error) {
      this.logger.warn(`⚠️ Erro ao processar imagens: ${error.message}`);
      return html;
    }
  }

  async convertImageToBase64(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      
      let mimeType;
      switch (ext) {
        case '.svg': mimeType = 'image/svg+xml'; break;
        case '.png': mimeType = 'image/png'; break;
        case '.jpg':
        case '.jpeg': mimeType = 'image/jpeg'; break;
        case '.webp': mimeType = 'image/webp'; break;
        default: mimeType = 'image/png';
      }

      const base64String = imageBuffer.toString('base64');
      return `data:${mimeType};base64,${base64String}`;
      
    } catch (error) {
      this.logger.warn(`⚠️ Erro ao converter ${imagePath}: ${error.message}`);
      return null;
    }
  }

  incorporateCSS(html, css) {
    this.logger.info('🔗 Incorporando CSS no HTML...');
    
    // Remover links externos
    html = html.replace(/<link rel="stylesheet" href="[^"]*main\.css[^"]*" \/>/g, '');
    html = html.replace(/<link rel="stylesheet" href="[^"]*main\.css[^"]*">/g, '');
    
    // Adicionar CSS inline
    const cssTag = `<style>\n${css}\n</style>`;
    html = html.replace('</head>', `${cssTag}\n</head>`);
    
    this.logger.success('✅ CSS incorporado no HTML');
    return html;
  }

  async saveHTML(html) {
    await fs.ensureDir(this.outputDir);
    
    const timestamp = new Date().toISOString().slice(0,19).replace(/[:.]/g, '-');
    const filename = `relatorio-${timestamp}.html`;
    const htmlPath = path.join(this.outputDir, filename);
    
    await fs.writeFile(htmlPath, html, 'utf8');
    
    const stats = await fs.stat(htmlPath);
    const fileSize = (stats.size / 1024).toFixed(2);
    
    this.logger.success(`💾 HTML salvo: ${filename} (${fileSize} KB)`);
    
    return htmlPath;
  }

  getMonthName(monthNumber) {
    const months = [
      '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return months[monthNumber] || '';
  }
}

module.exports = HTMLGenerator;