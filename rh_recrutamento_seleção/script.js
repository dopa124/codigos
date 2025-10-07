class Candidato {
    constructor(nome, dataNascimento, formacao, cursosPdls, experienciaDias) {
        this.nome = nome;
        this.dataNascimento = dataNascimento;
        this.formacao = formacao;
        this.cursosPdls = new Set(cursosPdls);
        this.experienciaDias = experienciaDias;
    }
}

class ProcessoSeletivo {
    constructor(nome, cursosPdlsDesejados, formacaoDesejada, experienciaDesejadaDias) {
        this.nome = nome;
        this.cursosPdlsDesejados = new Set(cursosPdlsDesejados);
        this.formacaoDesejada = formacaoDesejada;
        this.experienciaDesejadaDias = experienciaDesejadaDias;
        this.candidatos = [];
    }

    adicionarCandidato(candidato) {
        this.candidatos.push(candidato);
    }

    calcularCompatibilidade(candidato) {
        const scoreFormacao = candidato.formacao.toLowerCase() === this.formacaoDesejada.toLowerCase() ? 1 : 0;
        
        const interseccao = [...candidato.cursosPdls].filter(c => this.cursosPdlsDesejados.has(c)).length;
        const uniao = new Set([...candidato.cursosPdls, ...this.cursosPdlsDesejados]).size;
        const scoreCursos = uniao > 0 ? interseccao / uniao : 0;
        
        const scoreExperiencia = this.experienciaDesejadaDias > 0 ? Math.min(candidato.experienciaDias / this.experienciaDesejadaDias, 1) : 0;
        
        const scoreTotal = (scoreFormacao + scoreCursos + scoreExperiencia) / 3;
        return scoreTotal * 100;
    }

    gerarRanking() {
        if (this.candidatos.length === 0) return '<p>Nenhum candidato cadastrado.</p>';
        
        const ranking = this.candidatos.map(cand => {
            const compat = this.calcularCompatibilidade(cand);
            let cor = 'vermelho';
            let label = '🟥 Vermelha (Baixa)';
            if (compat >= 80) {
                cor = 'verde';
                label = '🟩 Verde (Alta)';
            } else if (compat >= 50) {
                cor = 'amarelo';
                label = '🟨 Amarela (Média)';
            }
            return { nome: cand.nome, compat: compat.toFixed(2), label, cor };
        });
        
        ranking.sort((a, b) => b.compat - a.compat);
        
        let table = '<table><thead><tr><th>Nome</th><th>Compatibilidade (%)</th><th>Classificação</th></tr></thead><tbody>';
        ranking.forEach(item => {
            table += `<tr class="${item.cor}"><td>${item.nome}</td><td>${item.compat}</td><td>${item.label}</td></tr>`;
        });
        table += '</tbody></table>';
        return table;
    }

    analiseComparativa() {
        if (this.candidatos.length === 0) return '<p>Nenhum candidato cadastrado.</p>';
        
        let table = '<table><thead><tr><th>Nome</th><th>Formação Compatível</th><th>Cursos/PDIs Comuns</th><th>Experiência Suficiente</th></tr></thead><tbody>';
        this.candidatos.forEach(cand => {
            const formacaoComp = cand.formacao.toLowerCase() === this.formacaoDesejada.toLowerCase() ? 'Sim' : 'Não';
            const cursosComuns = [...cand.cursosPdls].filter(c => this.cursosPdlsDesejados.has(c)).length;
            const expSuf = cand.experienciaDias >= this.experienciaDesejadaDias ? 'Sim' : 'Não';
            table += `<tr><td>${cand.nome}</td><td>${formacaoComp}</td><td>${cursosComuns}</td><td>${expSuf}</td></tr>`;
        });
        table += '</tbody></table>';
        return table;
    }
}

class SistemaRecrutamento {
    constructor() {
        this.processos = {};
        this.competenciasEmpresa = new Set();
    }

    criarProcesso(nome, cursosPdlsDesejados, formacaoDesejada, experienciaDesejadaDias) {
        if (this.processos[nome]) {
            alert(`Processo '${nome}' já existe.`);
            return;
        }
        const processo = new ProcessoSeletivo(nome, cursosPdlsDesejados, formacaoDesejada, experienciaDesejadaDias);
        this.processos[nome] = processo;
        cursosPdlsDesejados.forEach(c => this.competenciasEmpresa.add(c));
        this.competenciasEmpresa.add(formacaoDesejada);
        this.renderProcessos();
    }

    adicionarCandidatoAProcesso(nomeProcesso, candidato) {
        if (!this.processos[nomeProcesso]) {
            alert(`Processo '${nomeProcesso}' não encontrado.`);
            return;
        }
        this.processos[nomeProcesso].adicionarCandidato(candidato);
    }

    gerarMatrizSwot() {
        const todasCompetenciasDesejadas = this.competenciasEmpresa;
        const competenciasCandidatos = new Set();
        Object.values(this.processos).forEach(proc => {
            proc.candidatos.forEach(cand => {
                cand.cursosPdls.forEach(c => competenciasCandidatos.add(c));
                competenciasCandidatos.add(cand.formacao);
            });
        });

        const forcas = [...competenciasCandidatos].filter(c => todasCompetenciasDesejadas.has(c));
        const fraquezas = [...todasCompetenciasDesejadas].filter(c => !competenciasCandidatos.has(c));
        
        const oportunidades = [];
        Object.values(this.processos).forEach(proc => {
            proc.candidatos.forEach(cand => {
                const unicas = [...cand.cursosPdls].filter(c => !todasCompetenciasDesejadas.has(c));
                if (unicas.length > 0) {
                    oportunidades.push(`Candidato ${cand.nome} traz: ${unicas.join(', ')}`);
                }
            });
        });
        
        const ameacas = [];
        Object.values(this.processos).forEach(proc => {
            const compativeis = proc.candidatos.filter(cand => proc.calcularCompatibilidade(cand) >= 50).length;
            if (compativeis < proc.candidatos.length / 2) {
                ameacas.push(`Baixa compatibilidade no processo '${proc.nome}'`);
            }
        });

        let swotHtml = '<div class="swot-table">';
        swotHtml += '<div class="swot-cell"><h3>Forças</h3><p>' + (forcas.join(', ') || 'Nenhuma') + '</p></div>';
        swotHtml += '<div class="swot-cell"><h3>Fraquezas</h3><p>' + (fraquezas.join(', ') || 'Nenhuma') + '</p></div>';
        swotHtml += '<div class="swot-cell"><h3>Oportunidades</h3><p>' + (oportunidades.join('<br>') || 'Nenhuma') + '</p></div>';
        swotHtml += '<div class="swot-cell"><h3>Ameaças</h3><p>' + (ameacas.join('<br>') || 'Nenhuma') + '</p></div>';
        swotHtml += '</div>';
        return swotHtml;
    }

    renderProcessos() {
        const container = document.getElementById('processosContainer');
        container.innerHTML = '';
        Object.values(this.processos).forEach(proc => {
            const div = document.createElement('div');
            div.className = 'processo';
            div.innerHTML = `
                <h2>${proc.nome}</h2>
                <h3>Informações da Vaga</h3>
                <p>Formação: ${proc.formacaoDesejada}</p>
                <p>Cursos/PDIs: ${[...proc.cursosPdlsDesejados].join(', ')}</p>
                <p>Experiência: ${proc.experienciaDesejadaDias} dias</p>
                
                <h3>Adicionar Candidato</h3>
                <input type="text" placeholder="Nome do candidato" id="nomeCand_${proc.nome}">
                <input type="date" placeholder="Data de nascimento" id="dataNasc_${proc.nome}">
                <input type="text" placeholder="Formação" id="formacaoCand_${proc.nome}">
                <input type="text" placeholder="Cursos/PDIs (separados por vírgula)" id="cursosCand_${proc.nome}">
                <input type="number" placeholder="Experiência em dias" id="expCand_${proc.nome}">
                <button onclick="sistema.adicionarCandidato('${proc.nome}')">Adicionar Candidato</button>
                
                <h3>Análise Comparativa</h3>
                <div id="analise_${proc.nome}"></div>
                <button onclick="sistema.mostrarAnalise('${proc.nome}')">Mostrar Análise</button>
                
                <h3>Ranking de Candidatos</h3>
                <div id="ranking_${proc.nome}"></div>
                <button onclick="sistema.mostrarRanking('${proc.nome}')">Mostrar Ranking</button>
            `;
            container.appendChild(div);
        });
    }

    adicionarCandidato(nomeProcesso) {
        const nome = document.getElementById(`nomeCand_${nomeProcesso}`).value;
        const dataNasc = document.getElementById(`dataNasc_${nomeProcesso}`).value;
        const formacao = document.getElementById(`formacaoCand_${nomeProcesso}`).value;
        const cursosStr = document.getElementById(`cursosCand_${nomeProcesso}`).value;
        const cursos = cursosStr.split(',').map(c => c.trim()).filter(c => c);
        const exp = parseInt(document.getElementById(`expCand_${nomeProcesso}`).value) || 0;
        
        if (!nome || !formacao) {
            alert('Preencha os campos obrigatórios.');
            return;
        }
        
        const cand = new Candidato(nome, dataNasc, formacao, cursos, exp);
        this.adicionarCandidatoAProcesso(nomeProcesso, cand);
        
        // Limpar campos
        document.getElementById(`nomeCand_${nomeProcesso}`).value = '';
        document.getElementById(`dataNasc_${nomeProcesso}`).value = '';
        document.getElementById(`formacaoCand_${nomeProcesso}`).value = '';
        document.getElementById(`cursosCand_${nomeProcesso}`).value = '';
        document.getElementById(`expCand_${nomeProcesso}`).value = '';
    }

    mostrarAnalise(nomeProcesso) {
        const output = document.getElementById(`analise_${nomeProcesso}`);
        output.innerHTML = this.processos[nomeProcesso].analiseComparativa();
    }

    mostrarRanking(nomeProcesso) {
        const output = document.getElementById(`ranking_${nomeProcesso}`);
        output.innerHTML = this.processos[nomeProcesso].gerarRanking();
    }
}

const sistema = new SistemaRecrutamento();

document.getElementById('criarProcessoBtn').addEventListener('click', () => {
    const nome = prompt('Nome do processo:');
    const cursosStr = prompt('Cursos e PDIs desejados (separados por vírgula):');
    const cursos = cursosStr.split(',').map(c => c.trim()).filter(c => c);
    const formacao = prompt('Formação desejada:');
    const exp = parseInt(prompt('Experiência desejada (em dias):')) || 0;
    
    if (nome && formacao) {
        sistema.criarProcesso(nome, cursos, formacao, exp);
    } else {
        alert('Preencha os campos obrigatórios.');
    }
});

document.getElementById('gerarSwotBtn').addEventListener('click', () => {
    const output = document.getElementById('swotOutput');
    output.innerHTML = sistema.gerarMatrizSwot();
});