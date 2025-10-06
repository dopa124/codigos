


// Importa a função initializeApp do Firebase para inicializar o app
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// Importa funções de autenticação do Firebase (anônima, custom token, listener de estado, persistência)
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Importa funções do Firestore (doc, setDoc, onSnapshot, etc.) para manipulação de dados
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Importa setLogLevel do Firestore para configuração de logs
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Ativar logs de debug para o Firestore /* Configura o nível de log do Firestore como debug para depuração */
setLogLevel('debug');

// --- CONSTANTES DE METAS DE JORNADA --- /* Seção de constantes para metas de horas trabalhadas */

// Define minutos diários de trabalho (8 horas = 480 minutos)
const DAILY_WORK_MINUTES = 480;        
// Define minutos semanais de meta (56 horas * 60 = 3360 minutos)
const WEEKLY_GOAL_MINUTES = 56 * 60;   
// Define minutos mensais de meta (224 horas * 60 = 13440 minutos)
const MONTHLY_GOAL_MINUTES = 224 * 60; 
// Define minutos anuais de meta (2688 horas * 60 = 161280 minutos)
const ANNUAL_GOAL_MINUTES = 2688 * 60; 
// Define limiar de frequência para etiquetas (70% = 0.70)
const FREQUENCY_THRESHOLD = 0.70;      
 
// --- CONSTANTES DE AVALIAÇÕES --- /* Seção de constantes para categorias de avaliações psicológicas */

// Objeto com categorias de avaliações, cada uma com label, tipo e se é destacada
const EVALUATION_CATEGORIES = {
    neurodev: { label: "Transtornos de Neurodesenvolvimento", type: 'text' },
    psychotic: { label: "Transtorno Psicótico", type: 'text' },
    mood: { label: "Transtornos de Humor", type: 'text' },
    anxiety: { label: "Transtornos de Ansiedade", type: 'text' },
    ocd: { label: "Transtorno Obsessivo-Compulsivo e Relacionados", type: 'text' },
    stress: { label: "Transtornos Relacionados a Estresse", type: 'text' },
    dissociative: { label: "Transtornos Dissociativos", type: 'text' },
    somatic: { label: "Transtornos Somatoformes e Somáticos", type: 'text' },
    eating: { label: "Transtornos Alimentares", type: 'text' },
    elimination: { label: "Transtornos de Eliminação", type: 'text' },
    sleep: { label: "Transtornos de Sono-Vigília", type: 'text' },
    sexual: { label: "Disfunções Sexuais", type: 'text' },
    impulse: { label: "Transtornos Relacionados ao Controle de Impulsos", type: 'text' },
    substance: { label: "Transtornos Relacionados a Substâncias e Dependência", type: 'text' },
    neurocognitive: { label: "Transtornos Neurocognitivos", type: 'text' },
    personality: { label: "Transtornos da Personalidade", type: 'text' },
    paraphilic: { label: "Transtornos Parafílicos", type: 'text' },
    parenting: { label: "Transtornos Relacionados à Paternidade e Cuidado", type: 'text' },
    psychologicalFactors: { label: "Condições Relacionadas a Comportamentos Psicológicos", type: 'text' },
    cultural: { label: "Transtornos Relacionados a Condições Culturais", type: 'text' },
    qi: { label: "Teste de QI", type: 'number', highlighted: true }, /* Categoria destacada para QI com tipo numérico */
    behavioralProfile: { label: "Perfil Comportamental", type: 'text', highlighted: true }, /* Categoria destacada para perfil comportamental */
};

// Função para gerar um objeto de avaliação vazio /* Função que cria um objeto vazio para avaliações baseado nas categorias */
const createEmptyEvaluations = () => {
    // Cria um objeto vazio para avaliações
    const evals = {};
    // Itera sobre cada chave das categorias de avaliação
    for (const key in EVALUATION_CATEGORIES) {
        // Atribui valores padrão: sem presença, nome de teste vazio e score vazio
        evals[key] = { has: false, testName: '', score: '' };
    }
    // Retorna o objeto de avaliações vazio
    return evals;
};
 
// Variáveis globais para Firebase /* Seção de variáveis globais para integração com Firebase */

// Variáveis para app, banco e autenticação do Firebase
let app, db, auth;
// Flag para verificar se a autenticação está pronta
let authReady = false;
// ID do usuário atual autenticado
let currentUserId = null;
// Snapshot atual do listener de timesheet
let currentTimesheetSnapshot = null;
// ID do funcionário selecionado para timesheet
let selectedTimesheetEmployeeId = null;
// ID do funcionário selecionado para PDI
let selectedPdiEmployeeId = null;  
// ID do funcionário selecionado para avaliações
let selectedEvaluationEmployeeId = null;

// Variáveis globais existentes (dados mocados) /* Seção de dados mockados para funcionários e tarefas */

// Array de objetos de funcionários com dados mockados (id, nome, departamento, etc.)
let employees = [
    { id: 1, nomeCompleto: "Ana Costa Silva", departamento: "Marketing", cargo: "Estágio", salario: 2916.67, dataContratacao: "2023-08-15", genero: "Feminino", fotoUrl: "https://placehold.co/128x128/9CA3AF/ffffff?text=AC",
        competencias: { comunicacao: 8, iniciativa: 7, lideranca: 4, trabalhoEmEquipe: 9, frequencia: 6.9, organizacao: 8 },
        trainings: [
            { name: "Comunicação Eficaz", score: 9.5, date: "2024-03-10" },
            { name: "Soft Skills para Estágio", score: 8.0, date: "2023-10-01" }
        ],
        evaluations: {
            ...createEmptyEvaluations(), /* Espalha avaliações vazias */
            anxiety: { has: true, testName: 'GAD-7', score: 'Nível moderado de ansiedade generalizada, recomenda-se acompanhamento.' },
            behavioralProfile: { has: true, testName: 'DISC', score: 'Dominante-Influente' },
            qi: { has: true, testName: 'WAIS-IV', score: 115 },
        }
    },
    { id: 2, nomeCompleto: "Bruno Torres Mendes", departamento: "TI", cargo: "Técnico", salario: 5416.67, dataContratacao: "2020-03-01", genero: "Masculino", fotoUrl: "https://placehold.co/128x128/9CA3AF/ffffff?text=BM",
        competencias: { comunicacao: 7, iniciativa: 9, lideranca: 6, trabalhoEmEquipe: 8, frequencia: 8.7, organizacao: 9 },
        trainings: [
            { name: "Segurança Cibernética", score: 10.0, date: "2024-06-01" },
            { name: "Gestão de Projetos Ágeis", score: 9.0, date: "2023-11-15" }
        ],
        evaluations: {
            ...createEmptyEvaluations(),
            behavioralProfile: { has: true, testName: 'MBTI', score: 'INTJ' },
            qi: { has: true, testName: 'WAIS-IV', score: 132 },
        }
    },
    { id: 3, nomeCompleto: "Carla Ribeiro Alves", departamento: "Planejamento", cargo: "Supervisor", salario: 7916.67, dataContratacao: "2022-11-20", genero: "Feminino", fotoUrl: "https://placehold.co/128x128/9CA3AF/ffffff?text=CA",
        competencias: { comunicacao: 9, iniciativa: 8, lideranca: 9, trabalhoEmEquipe: 7, frequencia: 7.5, organizacao: 7 },
        trainings: [
            { name: "Liderança de Equipes", score: 8.5, date: "2024-01-20" },
            { name: "Orçamento Empresarial", score: 9.2, date: "2023-07-01" }
        ],
        evaluations: {
            ...createEmptyEvaluations(),
            stress: { has: true, testName: 'Escala de Estresse Percebido (PSS)', score: 'Níveis elevados de estresse relacionados a prazos.' },
            mood: { has: false, testName: 'BDI-II', score: 'Sem indicativos de transtorno de humor.' },
            behavioralProfile: { has: true, testName: 'DISC', score: 'Estável-Conforme' },
            qi: { has: true, testName: 'WAIS-IV', score: 121 },
        }
    },
    { id: 4, nomeCompleto: "Daniel Lima Rocha", departamento: "TI", cargo: "Estágio", salario: 2500.00, dataContratacao: "2024-01-10", genero: "Masculino", fotoUrl: "https://placehold.co/128x128/9CA3AF/ffffff?text=DR",
        competencias: { comunicacao: 6, iniciativa: 7, lideranca: 3, trabalhoEmEquipe: 6, frequencia: 5.4, organizacao: 5 },
        trainings: [
            { name: "Fundamentos de Cloud", score: 6.0, date: "2024-05-10" },
            { name: "Python Básico", score: 7.5, date: "2024-03-01" }
        ],
        evaluations: createEmptyEvaluations(), /* Chama função para avaliações vazias */
    },
];

// Array de tarefas mockadas com id, nome, status, responsáveis e prazo
let tasks = [
    { id: 1, name: "Revisar campanha de marketing Q4", status: "Em Andamento", assignedEmployeeIds: [1], dueDate: "2025-10-08" },
    { id: 2, name: "Atualizar servidor de produção", status: "Concluído", assignedEmployeeIds: [2], dueDate: "2025-09-30" },
    { id: 3, name: "Planejamento estratégico 2026", status: "A Fazer", assignedEmployeeIds: [3, 1], dueDate: "2025-10-25" },
    { id: 4, name: "Debug de rotina de backup", status: "A Fazer", assignedEmployeeIds: [2, 4], dueDate: "2025-10-06" }
];
// Próximo ID para novo funcionário
let nextEmployeeId = employees.length + 1;
// Próximo ID para nova tarefa
let nextTaskId = tasks.length + 1;
// Funcionário selecionado por padrão (primeiro da lista)
let selectedEmployee = employees[0];

// Arrays de opções para cargos e departamentos
const cargos = ["Técnico", "Estágio", "Supervisor", "Gerente", "Analista"];
const departamentos = ["Marketing", "TI", "Planejamento", "Financeiro", "Vendas"];

// Instâncias de Chart.js /* Seção de variáveis para instâncias de gráficos Chart.js para evitar memory leaks */

// Variáveis para instâncias de gráficos (radar, bar, gender, etc.)
let radarChartInstance = null, barChartInstance = null, genderChartInstance = null,
    tenureChartInstance = null, hiringFiringChartInstance = null, departmentSalaryChartInstance = null,
    pdiScoreBarChartInstance = null, trainingRadarChartInstance = null, evaluationPieChartInstance = null,
    evaluationRadarChartInstance = null, qiComparisonChartInstance = null, behavioralProfileChartInstance = null,
    qiByDepartmentChartInstance = null, departmentAvgScoreChartInstance = null, departmentPdiChartInstance = null,
    employeesByDeptChartInstance = null, assignedTasksChartInstance = null, completedTasksChartInstance = null,
    inProgressTasksChartInstance = null;

// --- FIREBASE INICIALIZAÇÃO E AUTENTICAÇÃO --- /* Seção para inicialização e autenticação do Firebase */

// Função assíncrona para inicializar o Firebase e autenticar o usuário
const initializeFirebase = async () => {
    try { /* Inicia bloco try para tratamento de erros */
        // Obtém ID do app se definido, senão usa default
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        // Parseia config do Firebase se definida, senão objeto vazio
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        // Obtém token de auth inicial se definido
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        // Verifica se config do Firebase é válida
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
            throw new Error("Firebase config não fornecida."); /* Lança erro se config inválida */
        }

        // Inicializa o app do Firebase com a config
        app = initializeApp(firebaseConfig);
        // Obtém instância do Firestore
        db = getFirestore(app);
        // Obtém instância de autenticação
        auth = getAuth(app);
         
        // Define persistência de sessão no browser
        await setPersistence(auth, browserSessionPersistence);

        // Listener para mudanças de estado de autenticação
        onAuthStateChanged(auth, async (user) => {
            if (user) { /* Se usuário autenticado */
                // Define ID do usuário atual
                currentUserId = user.uid;
                // Marca autenticação como pronta
                authReady = true;
                // Atualiza status de conexão no DOM
                document.getElementById('firestore-status').textContent = `Conectado como ID de Usuário: ${currentUserId}`;
                // Se aba de timesheet visível, configura listener
                if (document.getElementById('timesheet-content').classList.contains('hidden') === false) {
                    setupTimesheetListener();
                }
            } else { /* Se não autenticado */
                // Se token inicial existe, autentica com custom token
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else { /* Senão, autentica anonimamente */
                    await signInAnonymously(auth);
                }
            }
        });
    } catch (error) { /* Captura erros na inicialização */
        // Loga erro no console
        console.error("Erro ao inicializar ou autenticar Firebase:", error);
        // Atualiza status de erro no DOM
        document.getElementById('firestore-status').textContent = `Erro de conexão: ${error.message}`;
    }
};


// --- FUNÇÕES DE UTILIDADE --- /* Seção de funções utilitárias para formatação e cálculos */
 
// Função para parsear data no formato DD/MM/YYYY para YYYY-MM-DD
const parseDateDDMMYYYY = (dateString) => {
    // Verifica se string de data existe
    if (!dateString) return null;
    // Regex para validar formato DD/MM/YYYY
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    // Extrai matches da regex
    const match = dateString.match(dateRegex);

    // Se match encontrado
    if (match) {
        // Extrai dia, mês e ano dos grupos capturados
        const [_, day, month, year] = match;
        // Retorna data no formato ISO (YYYY-MM-DD)
        return `${year}-${month}-${day}`;
    }
    // Retorna null se formato inválido
    return null;
};

// Função para formatar data de YYYY-MM-DD para DD/MM/YYYY
const formatDate = (dateString) => {
    // Verifica se string de data existe
    if (!dateString) return 'N/A';
    // Divide a string por hífen
    const parts = dateString.split('-');  
    // Se partes têm 3 elementos (ano-mês-dia)
    if (parts.length === 3) {
        // Extrai ano, mês e dia
        const [year, month, day] = parts;
        // Retorna formatado como DD/MM/YYYY
        return `${day}/${month}/${year}`;
    }
    // Retorna string original se formato inválido
    return dateString;
};
 
// Função para formatar minutos totais em string "Hh Mm"
const formatDuration = (totalMinutes) => {
    // Calcula horas inteiras
    const hours = Math.floor(totalMinutes / 60);
    // Calcula minutos restantes
    const minutes = Math.floor(totalMinutes % 60);
    // Retorna string formatada
    return `${hours}h ${minutes}m`;
};

// Função para calcular tempo de empresa em anos e meses
const calculateTenure = (dateString) => {
    // Cria data de contratação
    const contractDate = new Date(dateString);
    // Cria data atual
    const today = new Date();
    // Calcula diferença em anos
    let years = today.getFullYear() - contractDate.getFullYear();
    // Calcula diferença em meses
    let months = today.getMonth() - contractDate.getMonth();
    // Ajusta se meses negativos ou dia atual menor
    if (months < 0 || (months === 0 && today.getDate() < contractDate.getDate())) {
        years--;
        months += 12;
    }
    // Se menos de 1 mês, retorna mensagem específica
    if (years === 0 && months === 0) return "Menos de 1 Mês";
    // Formata texto de anos se >0
    const yearText = years > 0 ? `${years} Ano${years > 1 ? 's' : ''}` : '';
    // Formata texto de meses se >0
    const monthText = months > 0 ? `${months} Mê${months > 1 ? 'ses' : 's'}` : '';
    // Junta textos filtrando vazios
    return [yearText, monthText].filter(t => t).join(' e ');
};
 
// Função para calcular score médio de PDI (treinamentos) de um funcionário
const calculatePdiScore = (employee) => {
    // Se sem treinamentos, retorna 0
    if (!employee.trainings || employee.trainings.length === 0) return 0;
    // Soma todas as notas de treinamentos
    const total = employee.trainings.reduce((sum, t) => sum + t.score, 0);
    // Retorna média das notas
    return total / employee.trainings.length;
};

// --- LÓGICA DE GESTÃO FINANCEIRA (NOVO) --- /* Seção para renderização de conteúdo financeiro */
 
// Função para renderizar conteúdo da aba financeira com exemplos de KPIs
const renderFinanceContent = () => {
    // Obtém container para exemplos financeiros
    const container = document.getElementById('finance-examples-container');
    // Limpa conteúdo anterior
    container.innerHTML = ''; // Limpa o conteúdo anterior

    // Array de dados de exemplos financeiros (seções de liquidez e rentabilidade)
    const financeExampleData = [
        {
            // Título da seção de liquidez
            title: '🏦 1. Indicadores de Liquidez',
            // Interpretação dos resultados com emojis
            interpretation: '🔴 Muito abaixo do ideal → risco de não pagar obrigações<br>🟡 Próximo do ideal → cuidado, depende de controle<br>🟢 Acima do ideal → situação financeira saudável',
            // Nome do KPI
            kpi: 'Liquidez Corrente',
            // Cabeçalhos da tabela
            headers: ['Exemplo', 'Ativo Circulante', 'Passivo Circulante', 'Resultado', 'Classificação'],
            // Exemplos com inputs, cálculo e thresholds
            examples: [
                { name: 'Seguro de carro', inputs: [3000, 5000], calc: (a, b) => a / b, thresholds: { good: 1.5, medium: 1.0 }, higherIsBetter: true },
                // ... outros exemplos similares
            ]
        },
        {
            // Título da seção de rentabilidade
            title: '💰 2. Indicadores de Rentabilidade',
            // Interpretação dos resultados
            interpretation: '🔴 Lucro baixo → operação pouco eficiente<br>🟡 Lucro médio → margem razoável, pode melhorar<br>🟢 Lucro alto → operação eficiente e rentável',
            // Nome do KPI
            kpi: 'Margem Bruta',
            // Cabeçalhos da tabela
            headers: ['Exemplo', 'Receita Líquida', 'Lucro Bruto', 'Resultado (%)', 'Classificação'],
            // Exemplos com formato percentual
            examples: [
                { name: 'Venda de bolo', inputs: [500, 300], calc: (a, b) => (b / a) * 100, thresholds: { good: 50, medium: 35 }, higherIsBetter: true, format: 'percent' },
                // ... outros exemplos
            ]
        }
        // NOTE: Outras seções serão adicionadas aqui no futuro, conforme solicitado. /* Nota para futuras expansões */
    ];

    // Função interna para obter classificação baseada em thresholds
    const getClassification = (result, thresholds, higherIsBetter) => {
        // Se melhor quando maior
        if (higherIsBetter) {
            // Verde se acima do bom
            if (result >= thresholds.good) return { emoji: '🟢', text: 'Bom' };
            // Amarelo se acima do médio
            if (result >= thresholds.medium) return { emoji: '🟡', text: 'Médio' };
            // Vermelho caso contrário
            return { emoji: '🔴', text: 'Ruim' };
        } else { /* Se melhor quando menor (lógica invertida) */
            // Verde se abaixo do bom
            if (result <= thresholds.good) return { emoji: '🟢', text: 'Bom' };
            // Amarelo se abaixo do médio
            if (result <= thresholds.medium) return { emoji: '🟡', text: 'Médio' };
            // Vermelho caso contrário
            return { emoji: '🔴', text: 'Ruim' };
        }
    };

    // Itera sobre cada seção de dados financeiros
    financeExampleData.forEach(section => {
        // Mapeia exemplos para linhas de tabela, calculando resultados
        const tableRows = section.examples.map(example => {
            // Calcula resultado usando função de cálculo do exemplo
            const result = example.calc(...example.inputs);
            // Obtém classificação do resultado
            const classification = getClassification(result, example.thresholds, example.higherIsBetter);
             
            // Formata resultado com 2 casas decimais
            let formattedResult = result.toFixed(2);
            // Se formato percentual, adiciona %
            if (example.format === 'percent') {
                formattedResult = `${result.toFixed(2)}%`;
            }

            // Cria células de input formatadas com locale BR
            const inputCells = example.inputs.map(input => `<td>${input.toLocaleString('pt-BR')}</td>`).join('');

            // Retorna HTML da linha da tabela
            return ` 
                <tr class="text-center">
                    <td class="text-left">${example.name}</td>
                    ${inputCells}
                    <td class="font-bold">${formattedResult}</td>
                    <td><span title="${classification.text}">${classification.emoji}</span></td>
                </tr>
            `;
        }).join(''); /* Junta todas as linhas em uma string */

        // Cria cabeçalhos da tabela
        const tableHeaders = section.headers.map(header => `<th>${header}</th>`).join('');

        // Cria HTML completo da seção com tabela e interpretação
        const sectionHtml = ` 
            <div class="bg-white p-6 rounded-xl card">
                <h3 class="text-xl font-bold text-gray-800 mb-2">${section.title}</h3>
                <p class="text-sm text-gray-600 mb-4"><strong>KPI de Exemplo:</strong> ${section.kpi}</p>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 finance-table">
                        <thead class="bg-gray-50">
                            <tr class="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                                ${tableHeaders}
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 class="font-semibold text-sm text-gray-700">Interpretação Prática:</h4>
                    <p class="text-xs text-gray-600 mt-1">${section.interpretation}</p>
                </div>
            </div>
        `;
        // Adiciona HTML da seção ao container
        container.innerHTML += sectionHtml;
    });
};


// --- LÓGICA DE GESTÃO DE TAREFAS --- /* Seção para lógica de tarefas */
 
// Função para calcular prioridade de tarefa baseada em prazo
const calculatePriority = (dueDate) => {
    // Data atual sem hora
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Data de vencimento no final do dia
    const due = new Date(dueDate);
    due.setHours(23, 59, 59, 999);
    // Diferença em milissegundos
    const diffTime = due - today;
    // Diferença em dias
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Alta prioridade se <=3 dias
    if (diffDays <= 3) return { label: 'Alta', color: 'bg-red-500', text: 'text-white' };
    // Média se <=10 dias
    if (diffDays <= 10) return { label: 'Média', color: 'bg-yellow-400', text: 'text-gray-800' };
    // Baixa caso contrário
    return { label: 'Baixa', color: 'bg-green-500', text: 'text-white' };
};

// Função para renderizar lista de tarefas na tabela
const renderTaskList = () => {
    // Obtém corpo da tabela de tarefas
    const tbody = document.getElementById('task-list-body');
    // Ordena tarefas por data de vencimento
    const sortedTasks = tasks.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Mapeia tarefas para HTML de linhas, calculando prioridade e nomes de responsáveis
    tbody.innerHTML = sortedTasks.map(task => {
        // Calcula prioridade
        const priority = calculatePriority(task.dueDate);
        // Extrai nomes iniciais de responsáveis
        const assignedNames = task.assignedEmployeeIds
            .map(id => employees.find(e => e.id === id)?.nomeCompleto.split(' ')[0] || 'N/A')
            .join(', ');

        // Retorna HTML da linha com badge de prioridade
        return ` 
            <tr>
                <td class="px-6 py-4"><span class="px-3 py-1 text-xs font-bold rounded-full ${priority.color} ${priority.text}">${priority.label}</span></td>
                <td class="px-6 py-4 font-medium">${task.name}</td>
                <td class="px-6 py-4">${task.status}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${assignedNames}</td>
                <td class="px-6 py-4">${formatDate(task.dueDate)}</td>
            </tr>
        `;
    }).join('');
    // Se sem tarefas, mostra mensagem vazia
    if (tasks.length === 0) {
         tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Nenhuma tarefa cadastrada.</td></tr>`;
    }
};
 
// Função para renderizar gráficos de tarefas
const renderTaskCharts = () => {
     // Chart 1: Tarefas por Funcionário (Total) /* Renderiza gráfico de barras para tarefas atribuídas */
    // Prepara dados de tarefas por funcionário
    const assignedData = employees.map(emp => ({
        name: emp.nomeCompleto.split(' ')[0],
        count: tasks.filter(t => t.assignedEmployeeIds.includes(emp.id)).length
    }));
    // Obtém contexto do canvas
    const assignedCtx = document.getElementById('assignedTasksChart').getContext('2d');
    // Destrói instância anterior se existir
    if (assignedTasksChartInstance) assignedTasksChartInstance.destroy();
    // Cria novo gráfico de barras
    assignedTasksChartInstance = new Chart(assignedCtx, { type: 'bar', data: { labels: assignedData.map(d => d.name), datasets: [{ label: 'Total de Tarefas', data: assignedData.map(d => d.count), backgroundColor: '#3b82f6' }] }, options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } } });

    // Chart 2: Tarefas Concluídas por Funcionário /* Renderiza gráfico de barras para tarefas concluídas */
    // Prepara dados de tarefas concluídas por funcionário
    const completedData = employees.map(emp => ({
        name: emp.nomeCompleto.split(' ')[0],
        count: tasks.filter(t => t.status === 'Concluído' && t.assignedEmployeeIds.includes(emp.id)).length
    }));
    // Obtém contexto do canvas
    const completedCtx = document.getElementById('completedTasksChart').getContext('2d');
    // Destrói instância anterior
    if (completedTasksChartInstance) completedTasksChartInstance.destroy();
    // Cria novo gráfico de barras
    completedTasksChartInstance = new Chart(completedCtx, { type: 'bar', data: { labels: completedData.map(d => d.name), datasets: [{ label: 'Tarefas Concluídas', data: completedData.map(d => d.count), backgroundColor: '#10b981' }] }, options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } } });
 
    // Chart 3: Tarefas em Andamento por Funcionário /* Renderiza gráfico de barras para tarefas em andamento */
    // Prepara dados de tarefas em andamento por funcionário
    const inProgressData = employees.map(emp => ({
        name: emp.nomeCompleto.split(' ')[0],
        count: tasks.filter(t => t.status === 'Em Andamento' && t.assignedEmployeeIds.includes(emp.id)).length
    }));
    // Obtém contexto do canvas
    const inProgressCtx = document.getElementById('inProgressTasksChart').getContext('2d');
    // Destrói instância anterior
    if (inProgressTasksChartInstance) inProgressTasksChartInstance.destroy();
    // Cria novo gráfico de barras
    inProgressTasksChartInstance = new Chart(inProgressCtx, { type: 'bar', data: { labels: inProgressData.map(d => d.name), datasets: [{ label: 'Tarefas em Andamento', data: inProgressData.map(d => d.count), backgroundColor: '#f59e0b' }] }, options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } } });
};

// Função para popular select de funcionários em tarefas
const populateTaskEmployeeSelect = () => {
    // Obtém select de encarregados
    const select = document.getElementById('taskEmployees');
    // Preenche opções com funcionários
    select.innerHTML = employees.map(emp => `<option value="${emp.id}">${emp.nomeCompleto}</option>`).join('');
};

// Função para renderizar todo o conteúdo da aba de tarefas
const renderTasksContent = () => {
    // Popular select de funcionários
    populateTaskEmployeeSelect();
    // Renderiza lista de tarefas
    renderTaskList();
    // Renderiza gráficos de tarefas
    renderTaskCharts();
};

// Event listener para submit do formulário de adicionar tarefa
document.getElementById('add-task-form').addEventListener('submit', function(event) {
    // Previne submit padrão
    event.preventDefault();
    // Obtém form
    const form = event.target;
    // Extrai IDs de responsáveis selecionados
    const assignedEmployeeIds = Array.from(form.taskEmployees.selectedOptions).map(option => parseInt(option.value));

    // Valida se pelo menos um responsável selecionado
    if (assignedEmployeeIds.length === 0) {
         alertPlaceholder('Selecione pelo menos um funcionário.', 'bg-red-100'); /* Mostra alerta de erro */
         return;
    }

    // Obtém e parseia data de vencimento
    const dueDateText = form.taskDueDate.value.trim();
    const parsedDate = parseDateDDMMYYYY(dueDateText);

    // Valida formato de data
    if (!parsedDate) {
        alertPlaceholder('Formato de data inválido. Use DD/MM/AAAA.', 'bg-red-100'); /* Mostra alerta de erro de data */
        return;
    }

    // Cria nova tarefa com dados do form
    const newTask = {
        id: nextTaskId++, /* Incrementa ID global */
        name: form.taskName.value.trim(),
        status: form.taskStatus.value,
        assignedEmployeeIds,
        dueDate: parsedDate
    };
    // Adiciona à lista de tarefas
    tasks.push(newTask);
    // Reseta form
    form.reset();
    // Re-renderiza conteúdo de tarefas
    renderTasksContent();
    // Mostra alerta de sucesso
    alertPlaceholder('Tarefa adicionada com sucesso!', 'bg-green-100');
});

// --- LÓGICA DO TIMESHEET --- /* Seção para lógica de folha de ponto */

// Função para calcular total de tempo trabalhado a partir de punches
const calculateTotalTime = (punches, isToday = false) => {
    // Inicializa total de minutos e tempo de entrada
    let totalMinutes = 0, timeIn = null;
    // Itera sobre punches ordenados
    for (const punch of punches) {
        // Converte tempo para minutos
        const punchTime = parseInt(punch.time.split(':')[0]) * 60 + parseInt(punch.time.split(':')[1]);
        // Se entrada, marca tempo de entrada
        if (punch.type === 'in') timeIn = punchTime;
        // Se saída e há entrada, calcula intervalo
        else if (punch.type === 'out' && timeIn !== null) {
            // Calcula diferença, considerando overnight
            totalMinutes += punchTime >= timeIn ? punchTime - timeIn : (24 * 60) - timeIn + punchTime;
            timeIn = null;
        }
    }
    // Se ainda logado hoje, adiciona tempo até agora
    if (timeIn !== null && isToday) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        totalMinutes += currentTime >= timeIn ? currentTime - timeIn : (24 * 60) - timeIn + currentTime;
    }
    // Retorna total de minutos
    return totalMinutes;
};

// Função assíncrona para obter minutos agregados por período (semanal, mensal, anual)
const getAggregatedMinutes = async (period) => {
    // Mapeia período para número de dias
    const daysMap = { weekly: 7, monthly: 30, annual: 365 };
    const days = daysMap[period] || 0;
    // Array de promessas para dias
    const promises = [];
    // Loop para cada dia no período
    for (let i = 0; i < days; i++) {
        // Calcula data do dia
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        // Caminho do documento no Firestore
        const path = `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${currentUserId}/timesheets/${selectedTimesheetEmployeeId}_${dateStr}`;
        // Adiciona promessa para obter doc e calcular tempo
        promises.push(
            getDoc(doc(db, path)).then(snap => {
                if (snap.exists()) { /* Se doc existe */
                    const punches = snap.data().punches || [];
                    const isToday = i === 0; /* Primeiro dia é hoje */
                    return calculateTotalTime(punches, isToday);
                }
                return 0; /* Retorna 0 se não existe */
            })
        );
    }
    // Aguarda todas as promessas
    const results = await Promise.all(promises);
    // Soma todos os resultados
    return results.reduce((a, b) => a + b, 0);
};

// Função para renderizar cards de metas agregadas
const renderAggregatedGoals = (weekly, monthly, annual) => {
    // Obtém container de metas
    const container = document.getElementById('aggregated-goals-container');
    // Array de objetos de metas (período, meta, progresso, horas formatadas)
    const goals = [
        { period: "Semanal", goal: WEEKLY_GOAL_MINUTES, progress: weekly, goalHours: "56h" },
        { period: "Mensal", goal: MONTHLY_GOAL_MINUTES, progress: monthly, goalHours: "224h" },
        { period: "Anual", goal: ANNUAL_GOAL_MINUTES, progress: annual, goalHours: "2.688h" }
    ];
    // Mapeia metas para HTML de cards com barra de progresso
    container.innerHTML = goals.map(g => {
        // Calcula porcentagem de progresso (máx 100%)
        const progressPercentage = Math.min(100, (g.progress / g.goal) * 100).toFixed(1);
        // Verifica se atingiu limiar de frequência
        const isFrequent = progressPercentage >= (FREQUENCY_THRESHOLD * 100);
        // Cor da tag baseada em frequência
        const tagColor = isFrequent ? 'bg-emerald-500' : 'bg-red-500';
        // Retorna HTML do card com barra e tag
        return ` 
            <div class="bg-white p-4 rounded-xl card border border-gray-100 shadow-sm">
                <div class="flex justify-between items-start mb-2"><h4 class="text-md font-semibold text-gray-700">${g.period}</h4><span class="px-3 py-1 text-xs font-bold text-white rounded-full ${tagColor}">${isFrequent ? 'Meta Atingida' : 'Abaixo da Meta'}</span></div>
                <p class="text-2xl font-bold text-gray-900 mb-1">${progressPercentage}%</p>
                <p class="text-sm text-gray-500 mb-3">Meta: ${g.goalHours}</p>
                <div class="w-full bg-gray-200 rounded-full h-2.5"><div class="h-2.5 rounded-full ${tagColor}" style="width: ${progressPercentage}%"></div></div>
            </div>`;
    }).join(''); /* Junta HTML dos cards */
};

// Função assíncrona para atualizar agregados de metas
const updateAggregates = async () => {
    // Verifica se auth pronta e funcionário selecionado
    if (!authReady || !selectedTimesheetEmployeeId) return;
    try { /* Inicia try para erros */
        // Obtém minutos semanais
        const weekly = await getAggregatedMinutes('weekly');
        // Obtém minutos mensais
        const monthly = await getAggregatedMinutes('monthly');
        // Obtém minutos anuais
        const annual = await getAggregatedMinutes('annual');
        // Renderiza cards de metas
        renderAggregatedGoals(weekly, monthly, annual);
    } catch (error) { /* Captura erros */
        console.error("Erro ao calcular agregados:", error); /* Loga erro */
    }
};

// Função para atualizar UI do timesheet com dados do doc
const updateTimesheetUI = (timesheetDoc) => {
    // Ordena punches por tempo
    const punches = (timesheetDoc?.punches || []).sort((a, b) => a.time.localeCompare(b.time));
    // Gera HTML para histórico de punches
    document.getElementById('timesheet-history-body').innerHTML = punches.map(p => `<tr><td class="px-6 py-2 capitalize">${p.type}</td><td class="px-6 py-2">${p.time}</td></tr>`).join('');
     
    // Obtém último punch
    const lastPunch = punches[punches.length - 1];
    // Verifica se logado (último é 'in')
    const isLogged = lastPunch?.type === 'in';
    // Próxima ação (out se logado, in senão)
    const nextAction = isLogged ? 'out' : 'in';
    // Obtém botão de punch
    const button = document.getElementById('punch-button');
     
    // Atualiza texto de status
    document.getElementById('timesheet-status').textContent = isLogged ? 'LOGADO' : 'DESLOGADO';
    // Atualiza classe de cor do status
    document.getElementById('timesheet-status').className = `text-xl font-bold ${isLogged ? 'text-emerald-600' : 'text-red-600'}`;
    // Atualiza texto do último punch
    document.getElementById('timesheet-last-punch').textContent = lastPunch ? `Último registro: ${lastPunch.time} (${lastPunch.type})` : 'Nenhum ponto hoje.';
    // Atualiza texto do botão
    button.textContent = `BATER ${nextAction === 'in' ? 'ENTRADA' : 'SAÍDA'}`;
    // Atualiza classes do botão para cor baseada em ação
    button.className = `w-full py-3 px-4 rounded-lg text-white font-bold transition shadow-lg ${isLogged ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`;
    // Define ação no dataset
    button.dataset.action = nextAction;
    // Habilita botão
    button.disabled = false;

    // Calcula total de minutos
    const totalMinutes = calculateTotalTime(punches, true);
    // Atualiza total de horas formatado
    document.getElementById('total-hours-worked').textContent = formatDuration(totalMinutes);
    // Atualiza porcentagem de progresso
    document.getElementById('progress-percentage').textContent = `${Math.min(100, (totalMinutes / DAILY_WORK_MINUTES) * 100).toFixed(1)}%`;
    // Atualiza agregados
    updateAggregates();
};
 
// Função para obter caminho do documento de timesheet
const getTimesheetDocPath = (employeeId) => `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${currentUserId || 'anon_user'}/timesheets/${employeeId}_${new Date().toISOString().split('T')[0]}`;

// Função para configurar listener de timesheet no Firestore
const setupTimesheetListener = () => {
    // Verifica pré-condições
    if (!authReady || !selectedTimesheetEmployeeId || !db) return;
    // Para listener anterior se existir
    if (currentTimesheetSnapshot) currentTimesheetSnapshot();
    // Atualiza data atual no DOM
    document.getElementById('current-timesheet-date').textContent = formatDate(new Date().toISOString().split('T')[0]);
    // Configura novo snapshot listener
    currentTimesheetSnapshot = onSnapshot(doc(db, getTimesheetDocPath(selectedTimesheetEmployeeId)), (docSnap) => {
        // Atualiza UI com dados do doc ou vazio
        updateTimesheetUI(docSnap.exists() ? docSnap.data() : { punches: [] });
    }, (error) => console.error("Erro ao ouvir timesheet:", error)); /* Callback de erro */
};

// Função assíncrona para registrar punch (entrada/saída)
const recordPunch = async () => {
    // Verifica pré-condições
    if (!authReady || !selectedTimesheetEmployeeId) return alertPlaceholder('Autenticação pendente.', 'bg-red-100');
    // Obtém botão
    const button = document.getElementById('punch-button');
    // Cria novo punch com tipo e tempo atual
    const newPunch 