const _ = require('lodash');
const Validator = require('../utils/Validator');
const Formatter = require('../utils/Formatter');
const Logger = require('../utils/Logger');

class DataProcessor {
  constructor() {
    this.logger = new Logger('DataProcessor');
    this.formatter = new Formatter();
  }

  // Processar dados completos do config
  async processConfig(config) {
    this.logger.info('🔄 Iniciando processamento de dados...');

    try {
      // 1. Validar dados
      const validation = Validator.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
      }

      // 2. Organizar dados por período
      const organizedData = this.organizeDataByPeriod(config.dados);

      // 3. Calcular métricas
      const metrics = this.calculateAllMetrics(organizedData, config.configuracoes);

      // 4. Preparar dados para template
      const templateData = this.prepareTemplateData(metrics, config);

      this.logger.success('✅ Processamento de dados concluído');

      return {
        raw: config,
        organized: organizedData,
        metrics,
        template: templateData,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`❌ Erro no processamento: ${error.message}`);
      throw error;
    }
  }

  // Organizar dados por período
  organizeDataByPeriod(dados) {
    this.logger.info('📅 Organizando dados por período...');

    const organized = {
      byYear: {},
      byMonth: {},
      timeline: []
    };

    dados.forEach(item => {
      const date = new Date(item.data);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      // Por ano
      if (!organized.byYear[year]) {
        organized.byYear[year] = {
          pedidos: 0,
          receita: 0,
          meses: []
        };
      }
      organized.byYear[year].pedidos += item.pedidos;
      organized.byYear[year].receita += item.valorBruto;
      organized.byYear[year].meses.push(monthKey);

      // Por mês
      organized.byMonth[monthKey] = {
        pedidos: item.pedidos,
        receita: item.valorBruto,
        data: item.data,
        year,
        month
      };

      // Timeline
      organized.timeline.push({
        date: item.data,
        pedidos: item.pedidos,
        receita: item.valorBruto,
        monthKey
      });
    });

    // Ordenar timeline
    organized.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    this.logger.info(`✓ Dados organizados: ${dados.length} registros em ${Object.keys(organized.byMonth).length} meses`);

    return organized;
  }

  // Calcular todas as métricas
  calculateAllMetrics(organizedData, configuracoes) {
    this.logger.info('📊 Calculando métricas...');

    const { investimentoMensalMedio, metaROAS } = configuracoes;
    const years = Object.keys(organizedData.byYear).map(Number).sort();
    
    // Totais por ano
    const totals = {};
    years.forEach(year => {
      const yearData = organizedData.byYear[year];
      totals[year] = {
        pedidos: yearData.pedidos,
        receita: yearData.receita,
        ticketMedio: yearData.receita / yearData.pedidos,
        meses: yearData.meses.length
      };
    });

    // Comparações entre anos
    const comparisons = this.calculateComparisons(totals);

    // Métricas por mês
    const monthlyMetrics = this.calculateMonthlyMetrics(
      organizedData.byMonth, 
      investimentoMensalMedio, 
      metaROAS
    );

    // Análise de tendências
    const trends = this.analyzeTrends(organizedData.timeline);

    // Eficiência e ROI
    const efficiency = this.calculateEfficiency(totals, monthlyMetrics, investimentoMensalMedio);

    const metrics = {
      totals,
      comparisons,
      monthly: monthlyMetrics,
      trends,
      efficiency,
      calculatedAt: new Date().toISOString()
    };

    this.logger.success(`✅ Métricas calculadas para ${Object.keys(monthlyMetrics).length} períodos`);

    return metrics;
  }

  // Calcular comparações entre anos
  calculateComparisons(totals) {
    const years = Object.keys(totals).map(Number).sort();
    
    if (years.length < 2) {
      return { hasComparison: false };
    }

    const [prevYear, currentYear] = years;
    const prev = totals[prevYear];
    const current = totals[currentYear];

    return {
      hasComparison: true,
      pedidos: this.calculateGrowth(prev.pedidos, current.pedidos),
      receita: this.calculateGrowth(prev.receita, current.receita),
      ticketMedio: this.calculateGrowth(prev.ticketMedio, current.ticketMedio),
      years: { prev: prevYear, current: currentYear }
    };
  }

  // Calcular métricas mensais
  calculateMonthlyMetrics(monthlyData, investimento, metaROAS) {
    const metrics = {};

    Object.entries(monthlyData).forEach(([monthKey, data]) => {
      const roi = ((data.receita - investimento) / investimento) * 100;
      const roas = data.receita / investimento;
      
      metrics[monthKey] = {
        ...data,
        investimento,
        roi: roi.toFixed(1),
        roas: roas.toFixed(2),
        ticketMedio: data.receita / data.pedidos,
        performance: this.evaluatePerformance(roas, metaROAS),
        roasFormatted: `${roas.toFixed(2)}x`,
        roiFormatted: `${roi.toFixed(1)}%`
      };
    });

    return metrics;
  }

  // Analisar tendências
  analyzeTrends(timeline) {
    if (timeline.length < 2) {
      return { hasTrends: false };
    }

    const pedidosTrend = this.calculateTrendLine(timeline.map(item => item.pedidos));
    const receitaTrend = this.calculateTrendLine(timeline.map(item => item.receita));

    return {
      hasTrends: true,
      pedidos: {
        direction: pedidosTrend > 0 ? 'crescimento' : 'declínio',
        strength: Math.abs(pedidosTrend),
        value: pedidosTrend
      },
      receita: {
        direction: receitaTrend > 0 ? 'crescimento' : 'declínio',
        strength: Math.abs(receitaTrend),
        value: receitaTrend
      }
    };
  }

  // Calcular linha de tendência simples
  calculateTrendLine(values) {
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + (x + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  // Calcular eficiência geral
  calculateEfficiency(totals, monthlyMetrics, investimento) {
    const years = Object.keys(totals).map(Number).sort();
    const currentYear = years[years.length - 1];
    const current = totals[currentYear];

    const mesesComDados = Object.keys(monthlyMetrics).length;
    const investimentoTotal = investimento * mesesComDados;

    return {
      pedidosPorMes: Math.round(current.pedidos / current.meses),
      receitaPorMes: current.receita / current.meses,
      investimentoTotal,
      roasGeral: current.receita / investimentoTotal,
      roiGeral: ((current.receita - investimentoTotal) / investimentoTotal) * 100,
      eficienciaScore: this.calculateEfficiencyScore(current, investimentoTotal)
    };
  }

  // Calcular score de eficiência
  calculateEfficiencyScore(totals, investimento) {
    const roas = totals.receita / investimento;
    const ticketMedio = totals.ticketMedio;
    
    let score = 0;
    
    // Score baseado em ROAS
    if (roas >= 20) score += 40;
    else if (roas >= 15) score += 35;
    else if (roas >= 10) score += 25;
    else if (roas >= 5) score += 15;
    else score += 5;
    
    // Score baseado em ticket médio
    if (ticketMedio >= 300) score += 30;
    else if (ticketMedio >= 250) score += 25;
    else if (ticketMedio >= 200) score += 20;
    else score += 10;
    
    // Score baseado em volume
    if (totals.pedidos >= 2000) score += 30;
    else if (totals.pedidos >= 1500) score += 25;
    else if (totals.pedidos >= 1000) score += 20;
    else score += 10;
    
    return Math.min(100, score);
  }

  // Preparar dados para o template
  prepareTemplateData(metrics, config) {
    const years = Object.keys(metrics.totals).map(Number).sort();
    const currentYear = years[years.length - 1];
    const current = metrics.totals[currentYear];

    // KPIs principais
    const kpis = {
      totalPedidos: this.formatter.formatNumber(current.pedidos),
      receitaTotal: this.formatter.formatCurrency(current.receita),
      ticketMedio: this.formatter.formatCurrency(current.ticketMedio),
      crescimentoPedidos: metrics.comparisons.pedidos || 'N/A',
      crescimentoReceita: metrics.comparisons.receita || 'N/A',
      crescimentoTicket: metrics.comparisons.ticketMedio || 'N/A'
    };

    // Dados para gráficos
    const chartData = this.prepareChartData(metrics.monthly);

    // Insights automáticos
    const insights = this.generateInsights(metrics);

    return {
      kpis,
      charts: chartData,
      insights,
      efficiency: metrics.efficiency,
      report: config.relatorio,
      empresa: config.empresa
    };
  }

  // Preparar dados dos gráficos
  prepareChartData(monthlyMetrics) {
    const months = Object.keys(monthlyMetrics).sort();
    const maxPedidos = Math.max(...Object.values(monthlyMetrics).map(m => m.pedidos));

    const chartData = {};

    months.forEach(monthKey => {
      const data = monthlyMetrics[monthKey];
      const altura = Math.max(20, (data.pedidos / maxPedidos) * 100);

      chartData[monthKey] = {
        pedidos: data.pedidos,
        altura: `${altura.toFixed(0)}%`,
        receita: this.formatter.formatCurrency(data.receita),
        roas: data.roasFormatted,
        performance: data.performance
      };
    });

    return chartData;
  }

  // Gerar insights automáticos
  generateInsights(metrics) {
    const insights = [];

    // Insight de performance
    if (metrics.efficiency.roasGeral >= 15) {
      insights.push({
        type: 'success',
        title: '🚀 Performance Excepcional',
        message: `ROAS de ${metrics.efficiency.roasGeral.toFixed(1)}x está muito acima do mercado`
      });
    }

    // Insight de crescimento
    if (metrics.comparisons.hasComparison && metrics.comparisons.pedidos.includes('+')) {
      insights.push({
        type: 'growth',
        title: '📈 Crescimento Sustentado',
        message: `Crescimento de ${metrics.comparisons.pedidos} em pedidos ano a ano`
      });
    }

    // Insight de eficiência
    const score = metrics.efficiency.eficienciaScore;
    if (score >= 80) {
      insights.push({
        type: 'efficiency',
        title: '⚡ Alta Eficiência',
        message: `Score de eficiência: ${score}/100 - Operação otimizada`
      });
    }

    return insights;
  }

  // Utilitários
  calculateGrowth(previous, current) {
    if (previous === 0) return '+∞%';
    const growth = ((current - previous) / previous) * 100;
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  }

  evaluatePerformance(roas, metaROAS) {
    if (roas >= metaROAS * 2) return '🟢 Excepcional';
    if (roas >= metaROAS * 1.5) return '🟢 Excelente';
    if (roas >= metaROAS) return '🟡 Bom';
    return '🔴 Abaixo da Meta';
  }
}

module.exports = DataProcessor;