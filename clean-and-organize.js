#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProjectCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.removedFiles = [];
    this.movedFiles = [];
    this.cleanedDirs = [];
    this.keptFiles = [];
    
    // Arquivos temporários/de teste para remover
    this.tempFiles = [
      'check-files.js',
      'create-templates.js',
      'create-folders.js',
      'fix-estructure.js', // tem typo no nome
      'fix-structure.js',
      'validate-config.js',
      'restore-correct-template.js',
      'setup.js',
      'copy-to-root.js',
      'create-missing-files.js',
      'fix-config.js',
      'create-config.js',
      'clean-project.js'
    ];

    // Arquivos essenciais que devem ser mantidos
    this.essentialFiles = [
      'config.json',
      'generator.js',
      'package.json',
      'package-lock.json',
      'app.js',
      'index.html',
      'main.css',
      '.gitignore',
      'README.md',
      'readme.md'
    ];

    // Diretórios essenciais
    this.essentialDirs = [
      'img',
      'logs',
      'output',
      'templates',
      'src',
      'scripts',
      'node_modules',
      '.git'
    ];
  }

  // Iniciar limpeza
  async clean() {
    console.log('🧹 INICIANDO LIMPEZA E ORGANIZAÇÃO DO PROJETO\n');
    console.log('━'.repeat(60));
    
    try {
      // 1. Fazer backup de segurança
      await this.createBackup();
      
      // 2. Remover arquivos temporários
      await this.removeTemporaryFiles();
      
      // 3. Limpar diretórios de cache
      await this.cleanCacheDirectories();
      
      // 4. Organizar estrutura final
      await this.organizeProjectStructure();
      
      // 5. Atualizar .gitignore
      await this.updateGitignore();
      
      // 6. Verificar integridade
      await this.verifyProjectIntegrity();
      
      // 7. Relatório final
      this.generateCleanupReport();
      
    } catch (error) {
      console.error('❌ Erro durante limpeza:', error.message);
      process.exit(1);
    }
  }

  // Criar backup de segurança
  async createBackup() {
    console.log('💾 Criando backup de segurança...');
    
    const backupDir = './backup-before-cleanup';
    const essentialBackups = [
      'config.json',
      'generator.js',
      'index.html',
      'main.css',
      'package.json'
    ];

    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
      }

      for (const file of essentialBackups) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file);
          fs.writeFileSync(path.join(backupDir, file), content);
        }
      }

      console.log('✅ Backup criado em ./backup-before-cleanup/');
    } catch (error) {
      console.error('⚠️ Erro ao criar backup:', error.message);
    }
  }

  // Remover arquivos temporários
  async removeTemporaryFiles() {
    console.log('\n🗑️ Removendo arquivos temporários...');
    
    const allFiles = fs.readdirSync('./').filter(f => 
      fs.statSync(f).isFile()
    );

    for (const file of allFiles) {
      // Verificar se é arquivo temporário
      if (this.tempFiles.includes(file)) {
        try {
          fs.unlinkSync(file);
          this.removedFiles.push(file);
          console.log(`   ❌ ${file}`);
        } catch (error) {
          console.log(`   ⚠️ Erro ao remover ${file}: ${error.message}`);
        }
      }
      // Verificar arquivos de backup (.backup, .bak, .tmp)
      else if (/\.(backup|bak|tmp)$/i.test(file)) {
        try {
          fs.unlinkSync(file);
          this.removedFiles.push(file);
          console.log(`   ❌ ${file} (backup)`);
        } catch (error) {
          console.log(`   ⚠️ Erro ao remover ${file}: ${error.message}`);
        }
      }
      // Verificar arquivos com números/timestamps suspeitos
      else if (/-(copy|\d+)\.js$/i.test(file) && !this.essentialFiles.includes(file)) {
        try {
          fs.unlinkSync(file);
          this.removedFiles.push(file);
          console.log(`   ❌ ${file} (duplicata)`);
        } catch (error) {
          console.log(`   ⚠️ Erro ao remover ${file}: ${error.message}`);
        }
      }
      else if (this.essentialFiles.includes(file)) {
        this.keptFiles.push(file);
      }
    }
  }

  // Limpar diretórios de cache
  async cleanCacheDirectories() {
    console.log('\n🧽 Limpando diretórios de cache...');
    
    const dirsToClean = [
      { path: './cache', keepStructure: true },
      { path: './output', keepStructure: true },
      { path: './logs', partial: true } // Manter estrutura, limpar logs antigos
    ];

    for (const { path: dirPath, keepStructure, partial } of dirsToClean) {
      if (fs.existsSync(dirPath)) {
        try {
          if (partial && dirPath.includes('logs')) {
            // Para logs, manter apenas latest.log e logs recentes
            await this.cleanLogsDirectory(dirPath);
          } else {
            // Limpar completamente mas manter estrutura
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
              const filePath = path.join(dirPath, file);
              if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
              }
            }
            this.cleanedDirs.push(dirPath);
            console.log(`   🧹 ${dirPath}/ limpo`);
          }
        } catch (error) {
          console.log(`   ⚠️ Erro ao limpar ${dirPath}: ${error.message}`);
        }
      }
    }
  }

  // Limpar logs antigos (manter apenas recentes)
  async cleanLogsDirectory(logsPath) {
    try {
      const files = fs.readdirSync(logsPath);
      const logFiles = files.filter(f => f.endsWith('.log') && f !== 'latest.log');
      
      if (logFiles.length > 5) {
        // Manter apenas os 5 logs mais recentes + latest.log
        const sortedLogs = logFiles
          .map(f => ({ 
            name: f, 
            time: fs.statSync(path.join(logsPath, f)).mtime 
          }))
          .sort((a, b) => b.time - a.time);

        const logsToRemove = sortedLogs.slice(5);
        
        for (const log of logsToRemove) {
          fs.unlinkSync(path.join(logsPath, log.name));
        }
        
        console.log(`   🧹 logs/ - removidos ${logsToRemove.length} logs antigos`);
      }
    } catch (error) {
      console.log(`   ⚠️ Erro ao limpar logs: ${error.message}`);
    }
  }

  // Organizar estrutura do projeto
  async organizeProjectStructure() {
    console.log('\n📁 Organizando estrutura do projeto...');
    
    try {
      // Garantir que diretórios essenciais existam
      const requiredDirs = ['templates', 'output', 'cache', 'logs'];
      
      for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
          console.log(`   ✅ Criado diretório: ${dir}/`);
        }
      }

      // Verificar se index.html e main.css estão nos locais corretos
      await this.organizeTemplates();
      
      // Criar .gitkeep em diretórios vazios
      await this.createGitkeepFiles();
      
    } catch (error) {
      console.log(`   ⚠️ Erro na organização: ${error.message}`);
    }
  }

  // Organizar templates
  async organizeTemplates() {
    const templateFiles = [
      { name: 'index.html', required: true },
      { name: 'main.css', required: true }
    ];

    for (const { name, required } of templateFiles) {
      const rootPath = `./${name}`;
      const templatePath = `./templates/${name}`;

      // Se existe na raiz mas não em templates, copiar
      if (fs.existsSync(rootPath) && !fs.existsSync(templatePath)) {
        fs.copyFileSync(rootPath, templatePath);
        console.log(`   📋 ${name} copiado para templates/`);
      }
      
      // Se não existe na raiz mas existe em templates, copiar
      else if (!fs.existsSync(rootPath) && fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, rootPath);
        console.log(`   📋 ${name} copiado para raiz`);
      }
      
      // Verificar se existe em pelo menos um local
      if (!fs.existsSync(rootPath) && !fs.existsSync(templatePath) && required) {
        console.log(`   ⚠️ ATENÇÃO: ${name} não encontrado!`);
      }
    }
  }

  // Criar .gitkeep em diretórios vazios
  async createGitkeepFiles() {
    const dirsForGitkeep = ['output', 'cache'];
    
    for (const dir of dirsForGitkeep) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        if (files.length === 0) {
          fs.writeFileSync(path.join(dir, '.gitkeep'), '');
          console.log(`   📝 .gitkeep criado em ${dir}/`);
        }
      }
    }
  }

  // Atualizar .gitignore
  async updateGitignore() {
    console.log('\n📝 Atualizando .gitignore...');
    
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-error.log*

# Cache e temporários
cache/
*.tmp
*.temp
*.log
!logs/.gitkeep

# Output gerado
output/
!output/.gitkeep

# Backups
backup-*/
*.backup
*.bak

# Environment
.env
.env.local
.env.production

# OS gerados
.DS_Store
Thumbs.db
desktop.ini

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# Arquivos temporários do projeto
check-files.js
create-*.js
fix-*.js
validate-*.js
restore-*.js
setup.js
copy-*.js
clean-*.js
`;

    try {
      const existingGitignore = fs.existsSync('./.gitignore') 
        ? fs.readFileSync('./.gitignore', 'utf8') 
        : '';

      // Se .gitignore está muito simples ou vazio, substituir
      if (existingGitignore.length < 100) {
        fs.writeFileSync('./.gitignore', gitignoreContent);
        console.log('   ✅ .gitignore atualizado completamente');
      } else {
        console.log('   ✅ .gitignore existente mantido');
      }
    } catch (error) {
      console.log(`   ⚠️ Erro ao atualizar .gitignore: ${error.message}`);
    }
  }

  // Verificar integridade do projeto
  async verifyProjectIntegrity() {
    console.log('\n🔍 Verificando integridade do projeto...');
    
    const criticalFiles = [
      { file: 'config.json', desc: 'Configuração principal' },
      { file: 'generator.js', desc: 'Gerador de relatórios' },
      { file: 'package.json', desc: 'Dependências do projeto' },
      { file: 'index.html', desc: 'Template HTML' },
      { file: 'main.css', desc: 'Estilos CSS' }
    ];

    let allGood = true;

    for (const { file, desc } of criticalFiles) {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`   ✅ ${file} (${desc}) - ${size} KB`);
      } else {
        console.log(`   ❌ ${file} (${desc}) - AUSENTE!`);
        allGood = false;
      }
    }

    if (allGood) {
      console.log('\n🎉 Projeto íntegro - todos os arquivos críticos presentes!');
    } else {
      console.log('\n⚠️ ATENÇÃO: Alguns arquivos críticos estão ausentes!');
    }
  }

  // Gerar relatório final
  generateCleanupReport() {
    console.log('\n' + '━'.repeat(60));
    console.log('📊 RELATÓRIO DE LIMPEZA');
    console.log('━'.repeat(60));
    
    console.log(`\n🗑️ ARQUIVOS REMOVIDOS (${this.removedFiles.length}):`);
    if (this.removedFiles.length > 0) {
      this.removedFiles.forEach(file => console.log(`   • ${file}`));
    } else {
      console.log('   Nenhum arquivo temporário encontrado');
    }

    console.log(`\n🧹 DIRETÓRIOS LIMPOS (${this.cleanedDirs.length}):`);
    if (this.cleanedDirs.length > 0) {
      this.cleanedDirs.forEach(dir => console.log(`   • ${dir}`));
    } else {
      console.log('   Nenhum diretório precisou ser limpo');
    }

    console.log(`\n✅ ARQUIVOS ESSENCIAIS MANTIDOS (${this.keptFiles.length}):`);
    this.keptFiles.forEach(file => console.log(`   • ${file}`));

    console.log('\n🎯 ESTRUTURA FINAL DO PROJETO:');
    this.showFinalStructure();

    console.log('\n🎉 LIMPEZA CONCLUÍDA!');
    console.log('✨ Projeto organizado e otimizado');
    console.log('💾 Backup criado em ./backup-before-cleanup/');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Teste o projeto: npm start');
    console.log('2. Para monitoramento: npm run watch');
    console.log('3. Para limpar outputs: npm run clean (se configurado)');
  }

  // Mostrar estrutura final
  showFinalStructure() {
    const structure = {
      '📁 Raiz': [
        'config.json',
        'generator.js', 
        'app.js',
        'index.html',
        'main.css',
        'package.json'
      ],
      '📁 templates/': [
        'index.html',
        'main.css'
      ],
      '�� img/': [
        '(imagens do projeto)'
      ],
      '📁 output/': [
        '(relatórios gerados)'
      ],
      '📁 cache/': [
        '(cache do sistema)'
      ],
      '📁 logs/': [
        '(logs de execução)'
      ]
    };

    Object.entries(structure).forEach(([folder, files]) => {
      console.log(`\n   ${folder}`);
      files.forEach(file => {
        if (file.startsWith('(')) {
          console.log(`     ${file}`);
        } else {
          const exists = fs.existsSync(file) || fs.existsSync(`./templates/${file}`);
          const status = exists ? '✅' : '❌';
          console.log(`     ${status} ${file}`);
        }
      });
    });
  }
}

// Executar limpeza
if (require.main === module) {
  const cleaner = new ProjectCleaner();
  cleaner.clean();
}

module.exports = ProjectCleaner;