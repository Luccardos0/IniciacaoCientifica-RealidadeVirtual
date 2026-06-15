/**
 * AFRAME COMPONENTS REFACTOR
 * Centralização dos componentes customizados e shaders do projeto.
 */

// Componente de interpolação e acompanhamento (Seguidor dinâmico)
AFRAME.registerComponent('dynamic-trail', {
    schema: {
        targetId: { type: 'string' },
        lerpSpeed: { type: 'number', default: 0.5 },
        offset: { type: 'vec3', default: { x: 0, y: 0, z: 0 } }
    },
    init: function () {
        this.targetElement = null;
        this.targetPos = new THREE.Vector3();
    },
    tick: function () {
        if (!this.targetElement) {
            this.targetElement = document.querySelector('#' + this.data.targetId);
            return;
        }
        if (!this.targetElement.object3D) return;
        this.targetElement.object3D.getWorldPosition(this.targetPos);
        this.targetPos.add(this.data.offset);
        this.el.object3D.position.lerp(this.targetPos, this.data.lerpSpeed);
    }
});

// Alias mantido para retrocompatibilidade com as cenas 2 e 3
AFRAME.registerComponent('dt', {
    schema: { target: { type: 'string' }, speed: { type: 'number', default: 0.3 }, off: { type: 'vec3' } },
    init: function () { this.v = new THREE.Vector3(); },
    tick: function () {
        if (!this.elT) { this.elT = document.querySelector('#' + this.data.target); return; }
        if (!this.elT.object3D) return; 
        this.v.copy(this.elT.object3D.position).add(this.data.off);
        this.el.object3D.position.lerp(this.v, this.data.speed);
    }
});

// Shader de gradiente opaco para transparente das caudas
AFRAME.registerShader('grad', {
    schema: { c: { type: 'color', is: 'uniform' } },
    vertexShader: `
        varying vec2 v; 
        void main(){ 
            v = uv; 
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
        }`,
    fragmentShader: `
        varying vec2 v; 
        uniform vec3 c; 
        void main(){ 
            gl_FragColor = vec4(c, 1.0 - v.y); 
        }`
});

/**
 * COMPONENTE: PAINEL EXPLICATIVO INTERATIVO VR (VERSÃO UNIFICADA)
 * Gerencia a troca de páginas de texto (botões azuis) e a navegação entre cenas (botões rosas).
 */
AFRAME.registerComponent('painel-explicativo', {
    schema: {
        cenaAtual: { type: 'number', default: 1 }
    },

    init: function () {
        // BANCO DE DADOS ÚNICO E CENTRALIZADO
        this.textos = {
            1: [
                "PÁGINA 1/2\nOs raios cósmicos viajam do espaço até a Terra em altíssima velocidade. Ao colidirem com os gases da alta atmosfera, eles geram uma cascata de novas partículas secundárias.",
                "PÁGINA 2/2\nEssa colisão gera os píons de primeira geração. A dinâmica observada nesta Cena 1 demonstra a distribuição e a ordem aleatória de chegada dessas partículas na superfície terrestre."
            ],
            2: [
                "PÁGINA 1/2\nOs múons são partículas instáveis e de vida curta. Pela física clássica, a maioria deveria decair muito antes de conseguir alcançar o solo, devido à distância da atmosfera.",
                "PÁGINA 2/2\nContudo, devido à Dilatação Temporal da Relatividade Restrita, o tempo passa mais devagar para o múon no referencial da Terra, permitindo que ele atravesse a atmosfera antes de decair."
            ],
            3: [
                "PÁGINA 1/2\nRESET DINÂMICO: Modificar a Meia-vida da simulação altera diretamente o tempo médio de sobrevivência do Múon. Na física real, essa constante dita a taxa de decaimento exponencial da cascata de partículas secundárias.",
                "PÁGINA 2/2\nAo reduzir a Meia-vida nos controles, as trajetórias tornam-se visualmente mais curtas, pois a probabilidade de decaimento prematuro se eleva. Inversamente, valores altos permitem que mais partículas alcancem o nível do mar."
            ],
            4: [
                "PÁGINA 1/2\nBEM-VINDO AO REFERENCIAL DO MÚON! Aqui, você está parado e a atmosfera se move. Pela física clássica, seu tempo de vida de 2.2 microssegundos expirará antes do chão chegar.",
                "PÁGINA 2/2\nAtive o 'Efeito Relativístico'. Pela contração do comprimento de Lorentz, a distância da atmosfera encolhe drasticamente. A Terra se aproxima rapidamente, permitindo o impacto!"
            ],
            5: [
        "PÁGINA 1/3\nREFERENCIAL DA TERRA: Agora, você está fixo na superfície do planeta. Do nosso ponto de vista, a atmosfera possui sua extensão máxima real de aproximadamente 15 quilômetros de altura.",
        "PÁGINA 2/3\nFÍSICA CLÁSSICA (TRR Desligada):\nViajando perto da velocidade da luz, um múon levaria cerca de 50 microssegundos para cruzar a atmosfera. Como seu tempo de decaimento próprio é de apenas 2.2 microssegundos, as partículas desaparecem no céu muito antes de nos alcançar.",
        "PÁGINA 3/3\nFÍSICA RELATIVÍSTICA (TRR Ligada):\nComo os múons se movem a velocidades altíssimas, o tempo deles passa mais devagar em relação ao nosso relógio (Dilatação Temporal). Para nós, a vida útil do múon é estendida, permitindo que a chuva atinja o solo!"
    ]
        };

        this.paginaAtual = 0;
        
        // Garante a captura segura do ID da cena
        let idCena = parseInt(this.data.cenaAtual, 10) || 1;
        this.paginasCena = this.textos[idCena] || ["Texto não encontrado."];
        
        // Mapeamento global de rotas (1 a 4)
        this.rotas = { 1: 'index.html', 2: 'cena2.html', 3: 'cena3.html', 4: 'cena4.html', 5:"cena5.html" };

        // Captura as tags do DOM interno da TV
        this.textoEl = this.el.querySelector('.texto-conteudo');
        this.btnVoltarTexto = this.el.querySelector('.btn-voltar-texto');
        this.btnAvancarTexto = this.el.querySelector('.btn-avancar-texto');
        this.btnCenaAnterior = this.el.querySelector('.btn-cena-anterior');
        this.btnCenaProxima = this.el.querySelector('.btn-cena-proxima');

        // Binds de escopo
        this.atualizarTexto = this.atualizarTexto.bind(this);
        this.mudarPagina = this.mudarPagina.bind(this);
        this.mudarCena = this.mudarCena.bind(this);

        // Ouvintes de evento com verificação de existência preventiva
        if (this.btnVoltarTexto) this.btnVoltarTexto.addEventListener('click', () => this.mudarPagina(-1));
        if (this.btnAvancarTexto) this.btnAvancarTexto.addEventListener('click', () => this.mudarPagina(1));
        if (this.btnCenaAnterior) this.btnCenaAnterior.addEventListener('click', () => this.mudarCena(-1));
        if (this.btnCenaProxima) this.btnCenaProxima.addEventListener('click', () => this.mudarCena(1));

        // Força a renderização inicial aguardando um mini-tick do motor 3D
        setTimeout(this.atualizarTexto, 10);
    },

    atualizarTexto: function () {
        if (this.textoEl) {
            this.textoEl.setAttribute('text', 'value', this.paginasCena[this.paginaAtual]);
        } else {
            // Busca de contingência caso o elemento demore a indexar no DOM
            this.textoEl = this.el.querySelector('.texto-conteudo');
            if (this.textoEl) {
                this.textoEl.setAttribute('text', 'value', this.paginasCena[this.paginaAtual]);
            }
        }
    },

    mudarPagina: function (direcao) {
        let novaPagina = this.paginaAtual + direcao;
        if (novaPagina >= 0 && novaPagina < this.paginasCena.length) {
            this.paginaAtual = novaPagina;
            this.atualizarTexto();
        }
    },

    mudarCena: function (direcao) {
        let cenaPura = parseInt(this.data.cenaAtual, 10) || 1;
        let novaCena = cenaPura + direcao;
        
        if (novaCena < 1) novaCena = 5;
        if (novaCena > 5) novaCena = 1;
        
        window.location.href = this.rotas[novaCena];
    }
});