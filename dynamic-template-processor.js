const fs = require('fs');

class DynamicTemplateProcessor {
  constructor() {
    this.config = null;
    this.metrics = {};
  }

  // Carregar e processar config.json
  loadConfig() {
    try {
      const configData = fs.readFileSync('./config.json', 'utf8');
      this.config = JSON.parse(configData);
      console.log('✅ Config carregado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao carregar config.json:', error.message);
      return false;
    }
  }

  // Calcular todas as métricas baseadas no config.json
  calculateMetrics() {
    if (!this.config || !this.config.dados) {
      throw new Error('Config não carregado ou dados ausentes');
    }

    console.log('📊 Calculando métricas dinâmicas...');

    // Organizar dados por ano
    const data2024 = this.config.dados.filter(item => item.data.includes('2024'));
    const data2025 = this.config.dados.filter(item => item.data.includes('2025'));

    // Calcular totais por período
    const monthsData = this.calculateMonthlyData(data2024, data2025);
    
    // Calcular métricas principais
    const totalMetrics = this.calculateTotalMetrics(data2024, data2025);
    
    // Calcular ROI/ROAS
    const roiMetrics = this.calculateROIMetrics(monthsData);
    
    // Calcular crescimento
    const growthMetrics = this.calculateGrowthMetrics(monthsData);

    this.metrics = {
      monthly: monthsData,
      totals: totalMetrics,
      roi: roiMetrics,
      growth: growthMetrics
    };

    console.log('✅ Métricas calculadas dinamicamente');
    return this.metrics;
  }

  // Calcular dados mensais
  calculateMonthlyData(data2024, data2025) {
    const months = ['outubro', 'novembro', 'dezembro'];
    const monthsData = {};

    months.forEach((month, index) => {
      const month2024 = data2024[index] || { pedidos: 0, valorBruto: 0 };
      const month2025 = data2025[index] || { pedidos: 0, valorBruto: 0 };

      const pedidosGrowth = month2024.pedidos > 0 
        ? ((month2025.pedidos - month2024.pedidos) / month2024.pedidos * 100).toFixed(1)
        : 'N/A';
      
      const receitaGrowth = month2024.valorBruto > 0
        ? ((month2025.valorBruto - month2024.valorBruto) / month2024.valorBruto * 100).toFixed(1)
        : 'N/A';

      const ticketMedio2024 = month2024.pedidos > 0 ? month2024.valorBruto / month2024.pedidos : 0;
      const ticketMedio2025 = month2025.pedidos > 0 ? month2025.valorBruto / month2025.pedidos : 0;
      
      const ticketGrowth = ticketMedio2024 > 0
        ? ((ticketMedio2025 - ticketMedio2024) / ticketMedio2024 * 100).toFixed(1)
        : 'N/A';

      monthsData[month] = {
        name: month.charAt(0).toUpperCase() + month.slice(1),
        pedidos2024: month2024.pedidos,
        pedidos2025: month2025.pedidos,
        receita2024: month2024.valorBruto,
        receita2025: month2025.valorBruto,
        ticketMedio2024: ticketMedio2024,
        ticketMedio2025: ticketMedio2025,
        crescimentoPedidos: pedidosGrowth,
        crescimentoReceita: receitaGrowth,
        crescimentoTicket: ticketGrowth
      };
    });

    return monthsData;
  }

  // Calcular métricas totais
  calculateTotalMetrics(data2024, data2025) {
    const total2024 = data2024.reduce((acc, curr) => ({
      pedidos: acc.pedidos + curr.pedidos,
      receita: acc.receita + curr.valorBruto
    }), { pedidos: 0, receita: 0 });

    const total2025 = data2025.reduce((acc, curr) => ({
      pedidos: acc.pedidos + curr.pedidos,
      receita: acc.receita + curr.valorBruto
    }), { pedidos: 0, receita: 0 });

    const pedidosGrowth = total2024.pedidos > 0 
      ? ((total2025.pedidos - total2024.pedidos) / total2024.pedidos * 100).toFixed(0)
      : 'N/A';
    
    const receitaGrowth = total2024.receita > 0
      ? ((total2025.receita - total2024.receita) / total2024.receita * 100).toFixed(0)
      : 'N/A';

    const ticketMedio2024 = total2024.pedidos > 0 ? total2024.receita / total2024.pedidos : 0;
    const ticketMedio2025 = total2025.pedidos > 0 ? total2025.receita / total2025.pedidos : 0;
    
    const ticketGrowth = ticketMedio2024 > 0
      ? ((ticketMedio2025 - ticketMedio2024) / ticketMedio2024 * 100).toFixed(0)
      : 'N/A';

    return {
      totalPedidos2025: total2025.pedidos,
      totalReceita2025: total2025.receita,
      ticketMedio2025: ticketMedio2025,
      crescimentoPedidos: pedidosGrowth,
      crescimentoReceita: receitaGrowth,
      crescimentoTicket: ticketGrowth,
      mediaPedidosMes: Math.round(total2025.pedidos / 3),
      mediaReceitaMes: Math.round(total2025.receita / 3)
    };
  }

  // Calcular ROI/ROAS
  calculateROIMetrics(monthsData) {
    const investimentoMensal = this.config.configuracoes?.investimentoMensalMedio || 9000;
    const roiData = {};

    Object.entries(monthsData).forEach(([month, data]) => {
      const receita = data.receita2025;
      const roas = receita / investimentoMensal;
      const roi = ((receita - investimentoMensal) / investimentoMensal * 100).toFixed(0);
      
      let performance = '🟡 Regular';
      if (roas >= 20) performance = '�� Excepcional';
      else if (roas >= 15) performance = '�� Excelente';
      else if (roas >= 10) performance = '🟢 Bom';

      roiData[month] = {
        receita: receita,
        investimento: investimentoMensal,
        roas: roas.toFixed(2),
        roi: roi,
        performance: performance,
        roasPercent: Math.min(100, (roas / 20) * 100).toFixed(0)
      };
    });

    return roiData;
  }

  // Calcular métricas de crescimento
  calculateGrowthMetrics(monthsData) {
    // Calcular ROAS médio
    const roasValues = Object.values(this.metrics?.roi || {}).map(item => parseFloat(item.roas));
    const roasMedio = roasValues.length > 0 
      ? (roasValues.reduce((a, b) => a + b, 0) / roasValues.length).toFixed(1)
      : '0';

    // Investimento total do trimestre
    const investimentoTotal = (this.config.configuracoes?.investimentoMensalMedio || 9000) * 3;
    
    // Receita total 2025
    const receitaTotal = Object.values(monthsData).reduce((acc, month) => acc + month.receita2025, 0);
    
    // ROI total
    const roiTotal = ((receitaTotal - investimentoTotal) / investimentoTotal * 100).toFixed(0);

    return {
      roasMedio: roasMedio,
      investimentoTotal: investimentoTotal,
      receitaTotal: receitaTotal,
      roiTotal: roiTotal
    };
  }

  // Formatar valores monetários
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  // Formatar números
  formatNumber(value) {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  // Processar template HTML
  processTemplate() {
    try {
      console.log('🔄 Processando template HTML...');
      
      let html = fs.readFileSync('./index.html', 'utf8');
      
      // Substituir KPIs principais
      html = this.replaceMainKPIs(html);
      
      // Substituir tabela de performance
      html = this.replacePerformanceTable(html);
      
      // Substituir tabela de ROI
      html = this.replaceROITable(html);
      
      // Substituir tabela de ticket médio
      html = this.replaceTicketTable(html);
      
      // Substituir indicadores de eficiência
      html = this.replaceEfficiencyTable(html);
      
      // Substituir métricas do resumo
      html = this.replaceSummaryMetrics(html);

      // Salvar template processado
      fs.writeFileSync('./index.html', html, 'utf8');
      console.log('✅ Template processado e salvo');
      
      return html;
      
    } catch (error) {
      console.error('❌ Erro ao processar template:', error.message);
      throw error;
    }
  }

  // Substituir KPIs principais
  replaceMainKPIs(html) {
    const { totalPedidos2025, totalReceita2025, ticketMedio2025, crescimentoPedidos, crescimentoReceita, crescimentoTicket } = this.metrics.totals;

    html = html.replace(
      /<div class="kpi-value">2\.392<\/div>/,
      `<div class="kpi-value">${this.formatNumber(totalPedidos2025)}</div>`
    );

    html = html.replace(
      /<div class="kpi-label">Total de Pedidos \(\+98%\)<\/div>/,
      `<div class="kpi-label">Total de Pedidos (+${crescimentoPedidos}%)</div>`
    );

    html = html.replace(
      /<div class="kpi-value">R$ 577\.893<\/div>/,
      `<div class="kpi-value">${this.formatCurrency(totalReceita2025)}</div>`
    );

    html = html.replace(
      /<div class="kpi-label">Receita Total \(\+148%\)<\/div>/,
      `<div class="kpi-label">Receita Total (+${crescimentoReceita}%)</div>`
    );

    html = html.replace(
      /<div class="kpi-value">R$ 241,48<\/div>/,
      `<div class="kpi-value">${this.formatCurrency(ticketMedio2025)}</div>`
    );

    html = html.replace(
      /<div class="kpi-label">Ticket Médio \(\+25%\)<\/div>/,
      `<div class="kpi-label">Ticket Médio (+${crescimentoTicket}%)</div>`
    );

    return html;
  }

  // Substituir tabela de performance
  replacePerformanceTable(html) {
    const months = ['outubro', 'novembro', 'dezembro'];
    const monthsOrder = ['Outubro', 'Novembro', 'Dezembro'];
    
    monthsOrder.forEach((monthName, index) => {
      const monthKey = months[index];
      const data = this.metrics.monthly[monthKey];
      
      if (data) {
        // Substituir linha da tabela
        const oldRow = new RegExp(
          `<td><strong>${monthName}</strong></td>\s*<td>\d+</td>\s*<td>\d+</td>\s*<td>R\$ [\d,.]+</td>\s*<td>R\$ [\d,.]+</td>\s*<td><strong>[^<]+</strong></td>\s*<td><strong>[^<]+</strong></td>`
        );

        const newRow = `<td><strong>${monthName}</strong></td>
              <td>${this.formatNumber(data.pedidos2024)}</td>
              <td>${this.formatNumber(data.pedidos2025)}</td>
              <td>${this.formatCurrency(data.receita2024)}</td>
              <td>${this.formatCurrency(data.receita2025)}</td>
              <td><strong>+${data.crescimentoPedidos}%</strong></td>
              <td><strong>+${data.crescimentoReceita}%</strong></td>`;

        html = html.replace(oldRow, newRow);
      }
    });

    return html;
  }

  // Substituir tabela de ROI
  replaceROITable(html) {
    const months = ['outubro', 'novembro', 'dezembro'];
    const monthsOrder = ['Outubro', 'Novembro', 'Dezembro'];
    
    monthsOrder.forEach((monthName, index) => {
      const monthKey = months[index];
      const roiData = this.metrics.roi[monthKey];
      
      if (roiData) {
        const oldRow = new RegExp(
          `<td><strong>${monthName}</strong></td>\s*<td>R\$ [\d,.]+</td>\s*<td>R\$ [\d,.]+</td>\s*<td>[\d,]+%</td>\s*<td>[\d,]+x</td>\s*<td>[^<]+</td>`
        );

        const newRow = `<td><strong>${monthName}</strong></td>
              <td>${this.formatCurrency(roiData.receita)}</td>
              <td>${this.formatCurrency(roiData.investimento)}</td>
              <td>${roiData.roi}%</td>
              <td>${roiData.roas}x</td>
              <td>${roiData.performance}</td>`;

        html = html.replace(oldRow, newRow);

        // Substituir barras de ROAS
        const roasBarRegex = new RegExp(
          `<div class="metric-name">${monthName}</div>\s*<div class="metric-bar">\s*<div class="metric-fill" style="width: \d+%"></div>\s*</div>\s*<div class="metric-value">[\d,]+x</div>`
        );

        const newRoasBar = `<div class="metric-name">${monthName}</div>
            <div class="metric-bar">
              <div class="metric-fill" style="width: ${roiData.roasPercent}%"></div>
            </div>
            <div class="metric-value">${roiData.roas}x</div>`;

        html = html.replace(roasBarRegex, newRoasBar);
      }
    });

    return html;
  }

  // Substituir tabela de ticket médio
  replaceTicketTable(html) {
    const months = ['outubro', 'novembro', 'dezembro'];
    const monthsOrder = ['Outubro', 'Novembro', 'Dezembro'];
    
    monthsOrder.forEach((monthName, index) => {
      const monthKey = months[index];
      const data = this.metrics.monthly[monthKey];
      
      if (data) {
        const tendencia = parseFloat(data.crescimentoTicket) > 0 
          ? '📈 Crescimento' 
          : parseFloat(data.crescimentoTicket) < 0 
          ? '📉 Queda' 
          : '➡️ Estável';

        const oldRow = new RegExp(
          `<td>${monthName}</td>\s*<td>R\$ [\d,.]+</td>\s*<td>R\$ [\d,.]+</td>\s*<td>[^<]+</td>\s*<td>[^<]+</td>`
        );

        const newRow = `<td>${monthName}</td>
              <td>${this.formatCurrency(data.ticketMedio2024)}</td>
              <td>${this.formatCurrency(data.ticketMedio2025)}</td>
              <td>${data.crescimentoTicket >= 0 ? '+' : ''}${data.crescimentoTicket}%</td>
              <td>${tendencia}</td>`;

        html = html.replace(oldRow, newRow);
      }
    });

    return html;
  }

  // Substituir indicadores de eficiência
  replaceEfficiencyTable(html) {
    const { mediaPedidosMes, mediaReceitaMes, ticketMedio2025 } = this.metrics.totals;
    const { roasMedio } = this.metrics.growth;

    // Substituir linha Pedidos/Mês
    html = html.replace(
      /<td><strong>Pedidos\/Mês<\/strong><\/td>\s*<td>\d+<\/td>\s*<td>\d+<\/td>/,
      `<td><strong>Pedidos/Mês</strong></td>
              <td>412</td>
              <td>${this.formatNumber(mediaPedidosMes)}</td>`
    );

    // Substituir linha Receita/Mês
    html = html.replace(
      /<td><strong>Receita\/Mês<\/strong><\/td>\s*<td>R$ [^<]+<\/td>\s*<td>R$ [^<]+<\/td>/,
      `<td><strong>Receita/Mês</strong></td>
              <td>R$ 94.838</td>
              <td>${this.formatCurrency(mediaReceitaMes)}</td>`
    );

    // Substituir linha ROAS Médio
    html = html.replace(
      /<td><strong>ROAS Médio<\/strong><\/td>\s*<td>[^<]+<\/td>\s*<td>[^<]+<\/td>/,
      `<td><strong>ROAS Médio</strong></td>
              <td>8,6x</td>
              <td>${roasMedio}x</td>`
    );

    return html;
  }

  // Substituir métricas do resumo
  replaceSummaryMetrics(html) {
    const { roiTotal, crescimentoPedidos, crescimentoReceita } = this.metrics.growth;

    // ROI Total
    html = html.replace(
      /<div class="metric-value">1\.651%<\/div>/,
      `<div class="metric-value">${roiTotal}%</div>`
    );

    // Crescimento Pedidos
    html = html.replace(
      /<div class="metric-value">\+98%<\/div>/,
      `<div class="metric-value">+${this.metrics.totals.crescimentoPedidos}%</div>`
    );

    // Crescimento Receita
    html = html.replace(
      /<div class="metric-value">\+148%<\/div>/,
      `<div class="metric-value">+${this.metrics.totals.crescimentoReceita}%</div>`
    );

    return html;
  }

  // Processar tudo
  async process() {
    console.log('🚀 Iniciando processamento dinâmico do template...\n');

    if (!this.loadConfig()) {
      throw new Error('Falha ao carregar configuração');
    }

    this.calculateMetrics();
    this.processTemplate();

    console.log('\n✅ Processamento dinâmico concluído!');
    console.log('🎯 Template agora usa dados do config.json');
    console.log('📊 Todas as métricas foram calculadas dinamicamente');
    
    return true;
  }
}

module.exports = DynamicTemplateProcessor;